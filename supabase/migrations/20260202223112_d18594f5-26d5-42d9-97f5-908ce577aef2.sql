-- ============================================
-- VAULT PRIVACY HARDENED MIGRATION v2
-- Phase 1: Create secrets table, migrate data, add RLS
-- DOES NOT DROP COLUMNS - Migration verification required first
-- ============================================

-- 1. Create vault_item_secrets table with TEXT columns for hex storage
CREATE TABLE IF NOT EXISTS vault_item_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  password_encrypted TEXT,
  password_iv TEXT,
  username_encrypted TEXT,
  username_iv TEXT,
  notes_encrypted TEXT,
  notes_iv TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_item_id)
);

ALTER TABLE vault_item_secrets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER vault_item_secrets_updated_at
BEFORE UPDATE ON vault_item_secrets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vault_item_secrets_item ON vault_item_secrets(vault_item_id);

-- 2. Migrate existing password data (BYTEA -> hex TEXT)
INSERT INTO vault_item_secrets (vault_item_id, password_encrypted, password_iv)
SELECT 
  id,
  encode(password_encrypted, 'hex') as password_encrypted,
  encode(password_iv, 'hex') as password_iv
FROM vault_items
WHERE password_encrypted IS NOT NULL
ON CONFLICT (vault_item_id) DO UPDATE SET
  password_encrypted = EXCLUDED.password_encrypted,
  password_iv = EXCLUDED.password_iv;

-- 3. Add permission columns to vault_permissions
ALTER TABLE vault_permissions 
ADD COLUMN IF NOT EXISTS permission_level TEXT 
  CHECK (permission_level IN ('view_metadata', 'view_secret')) 
  DEFAULT 'view_metadata';

ALTER TABLE vault_permissions 
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_vault_permissions_active 
ON vault_permissions (vault_item_id, profile_id) 
WHERE revoked_at IS NULL;

UPDATE vault_permissions
SET permission_level = CASE 
  WHEN can_reveal = true THEN 'view_secret'
  ELSE 'view_metadata'
END
WHERE permission_level IS NULL OR permission_level = 'view_metadata';

-- 4. Ownership enforcement triggers
CREATE OR REPLACE FUNCTION force_vault_item_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.owner_id := get_my_profile_id();
  NEW.created_by := get_my_profile_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vault_item_set_owner ON vault_items;
CREATE TRIGGER vault_item_set_owner
BEFORE INSERT ON vault_items
FOR EACH ROW EXECUTE FUNCTION force_vault_item_owner();

CREATE OR REPLACE FUNCTION prevent_vault_owner_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Cannot change vault item owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vault_item_prevent_owner_change ON vault_items;
CREATE TRIGGER vault_item_prevent_owner_change
BEFORE UPDATE ON vault_items
FOR EACH ROW EXECUTE FUNCTION prevent_vault_owner_change();

-- 5. RLS for vault_item_secrets (Owner OR view_secret only)
CREATE POLICY "vault_secrets_select_owner" ON vault_item_secrets FOR SELECT
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_items vi WHERE vi.id = vault_item_secrets.vault_item_id 
  AND vi.owner_id = get_my_profile_id()
));

CREATE POLICY "vault_secrets_select_shared" ON vault_item_secrets FOR SELECT
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_permissions vp
  WHERE vp.vault_item_id = vault_item_secrets.vault_item_id
  AND vp.profile_id = get_my_profile_id()
  AND vp.permission_level = 'view_secret'
  AND vp.revoked_at IS NULL
));

CREATE POLICY "vault_secrets_insert_owner" ON vault_item_secrets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_items vi WHERE vi.id = vault_item_secrets.vault_item_id 
  AND vi.owner_id = get_my_profile_id()
));

CREATE POLICY "vault_secrets_update_owner" ON vault_item_secrets FOR UPDATE
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_items vi WHERE vi.id = vault_item_secrets.vault_item_id 
  AND vi.owner_id = get_my_profile_id()
))
WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_items vi WHERE vi.id = vault_item_secrets.vault_item_id 
  AND vi.owner_id = get_my_profile_id()
));

CREATE POLICY "vault_secrets_delete_owner" ON vault_item_secrets FOR DELETE
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_items vi WHERE vi.id = vault_item_secrets.vault_item_id 
  AND vi.owner_id = get_my_profile_id()
));

-- 6. REPLACE vault_items RLS (Remove admin policies)
DROP POLICY IF EXISTS "Admins can do all on vault_items" ON vault_items;
DROP POLICY IF EXISTS "Owners can manage their vault items" ON vault_items;
DROP POLICY IF EXISTS "Users with view permission can see vault items" ON vault_items;

CREATE POLICY "vault_items_select_owner" ON vault_items FOR SELECT
USING (auth.uid() IS NOT NULL AND owner_id = get_my_profile_id());

CREATE POLICY "vault_items_select_shared" ON vault_items FOR SELECT
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM vault_permissions vp
  WHERE vp.vault_item_id = vault_items.id
  AND vp.profile_id = get_my_profile_id()
  AND vp.revoked_at IS NULL
));

CREATE POLICY "vault_items_insert_owner" ON vault_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (owner_id IS NULL OR owner_id = get_my_profile_id()));

CREATE POLICY "vault_items_update_owner" ON vault_items FOR UPDATE
USING (auth.uid() IS NOT NULL AND owner_id = get_my_profile_id())
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = get_my_profile_id());

CREATE POLICY "vault_items_delete_owner" ON vault_items FOR DELETE
USING (auth.uid() IS NOT NULL AND owner_id = get_my_profile_id());

-- 7. REPLACE vault_permissions RLS (Owner-only control)
DROP POLICY IF EXISTS "Admins can manage vault permissions" ON vault_permissions;
DROP POLICY IF EXISTS "Owners can manage permissions for their items" ON vault_permissions;
DROP POLICY IF EXISTS "Users can view their permissions" ON vault_permissions;

CREATE POLICY "vault_permissions_owner_select" ON vault_permissions FOR SELECT
USING (auth.uid() IS NOT NULL AND owns_vault_item(vault_item_id));

CREATE POLICY "vault_permissions_grantee_select" ON vault_permissions FOR SELECT
USING (auth.uid() IS NOT NULL AND profile_id = get_my_profile_id() AND revoked_at IS NULL);

CREATE POLICY "vault_permissions_owner_insert" ON vault_permissions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND owns_vault_item(vault_item_id));

CREATE POLICY "vault_permissions_owner_update" ON vault_permissions FOR UPDATE
USING (auth.uid() IS NOT NULL AND owns_vault_item(vault_item_id))
WITH CHECK (auth.uid() IS NOT NULL AND owns_vault_item(vault_item_id));

CREATE POLICY "vault_permissions_owner_delete" ON vault_permissions FOR DELETE
USING (auth.uid() IS NOT NULL AND owns_vault_item(vault_item_id));

-- 8. REPLACE vault_audit_logs RLS (Owner-only, NO admin)
DROP POLICY IF EXISTS "Admins can view vault audit logs" ON vault_audit_logs;

CREATE POLICY "vault_audit_logs_owner_only" ON vault_audit_logs FOR SELECT
USING (auth.uid() IS NOT NULL AND (
  vault_item_id IN (SELECT id FROM vault_items WHERE owner_id = get_my_profile_id())
  OR user_id = get_my_profile_id()
));