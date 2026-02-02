

# Vault Privacy Hardened Implementation Plan v2 - Final

## Executive Summary

This plan implements a **zero-admin-visibility vault** where every credential is private to its creator by default. Sharing is explicit, auditable, and revocable. All admin bypass paths are removed.

---

## Pre-Implementation Data State

| Data | Current Count | Notes |
|------|---------------|-------|
| Vault items with usernames | 5 | Will be encrypted via migration function |
| Vault items with notes | 0 | None to migrate |
| Vault items with passwords | Multiple | Already encrypted (BYTEA), will be converted to TEXT hex |

---

## Implementation Phases

### Phase 1: Database Migration

**SQL to Apply:**

```sql
-- ============================================
-- VAULT PRIVACY HARDENED MIGRATION
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
```

---

### Phase 2: Edge Functions

#### 2.1 vault-encrypt (Multi-Field Encryption)

**File:** `supabase/functions/vault-encrypt/index.ts`

Key changes:
- Accept `password`, `username`, `notes` fields
- Encrypt each field with separate IV using AES-256-GCM
- Return all encrypted values as hex TEXT strings

#### 2.2 vault-decrypt (Strict Hex Parsing, No Admin Override)

**File:** `supabase/functions/vault-decrypt/index.ts`

Key changes:
- **Remove admin override completely** (delete `isAdmin` check)
- Query `vault_item_secrets` instead of `vault_items`
- Use strict hex-to-bytes parsing (not base64)
- Support `field` parameter (password/username/notes)
- Return 403 on no-permission without leaking existence details

#### 2.3 vault-migrate-secrets (One-Time Migration)

**New File:** `supabase/functions/vault-migrate-secrets/index.ts`

Purpose: Encrypt existing plaintext `username`/`notes` from `vault_items` to `vault_item_secrets`

---

### Phase 3: Frontend Updates

#### 3.1 useVaultData.ts Hook Updates

- Add `useVaultSharedWithMe()` query
- Add `useMyShares()` query
- Update `createItem` to insert into both tables
- Update `updateItem` to handle secrets table
- Add `shareItem` and `revokeShare` mutations
- Update `revealPassword` to support field parameter

#### 3.2 Vault.tsx Page Updates

- Add view mode tabs: "My Vault" / "Shared by Me" / "Shared with Me"
- Remove all `isAdmin` checks for canEditItem/canRevealItem
- Owner-only determines edit/share/delete capabilities

#### 3.3 New VaultShareDialog Component

- Employee dropdown (profiles in same domain)
- Permission level selector (view_metadata / view_secret)
- Current shares list with revoke buttons
- Audit logging on share/revoke

#### 3.4 VaultItemCard Updates

- Add Share button (owner-only)
- Update reveal logic to check permission_level

#### 3.5 Translations

Arabic and English keys for:
- `vault.myVault`, `vault.sharedByMe`, `vault.sharedWithMe`
- `vault.share`, `vault.shareWith`, `vault.selectEmployee`
- `vault.permissionLevel`, `vault.viewMetadataOnly`, `vault.viewSecret`
- `vault.revokeAccess`, `vault.noShares`, `vault.currentShares`
- `vault.shareCreated`, `vault.shareRevoked`, `vault.cannotShareWithSelf`

---

## Guardrails Compliance

| Guardrail | Implementation |
|-----------|----------------|
| 1. DO NOT drop columns until migration verified | Migration SQL does NOT include DROP COLUMN. Separate Phase 3 SQL will be provided after verification |
| 2. vault-decrypt uses strict hex parsing | `hexToBytes()` function validates hex format, no base64 anywhere |
| 3. Return 403 without leaking existence | Single "No permission" response for all denial cases |

---

## Migration Verification Query (Run After Phase 2)

```sql
SELECT 
  'Password migration' as check_type,
  (SELECT COUNT(*) FROM vault_items WHERE password_encrypted IS NOT NULL) as source_count,
  (SELECT COUNT(*) FROM vault_item_secrets WHERE password_encrypted IS NOT NULL) as migrated_count,
  CASE WHEN (SELECT COUNT(*) FROM vault_items WHERE password_encrypted IS NOT NULL) = 
       (SELECT COUNT(*) FROM vault_item_secrets WHERE password_encrypted IS NOT NULL) 
  THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Username migration' as check_type,
  (SELECT COUNT(*) FROM vault_items WHERE username IS NOT NULL) as source_count,
  (SELECT COUNT(*) FROM vault_item_secrets WHERE username_encrypted IS NOT NULL) as migrated_count,
  CASE WHEN (SELECT COUNT(*) FROM vault_items WHERE username IS NOT NULL) = 
       (SELECT COUNT(*) FROM vault_item_secrets WHERE username_encrypted IS NOT NULL) 
  THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Notes migration' as check_type,
  (SELECT COUNT(*) FROM vault_items WHERE notes IS NOT NULL) as source_count,
  (SELECT COUNT(*) FROM vault_item_secrets WHERE notes_encrypted IS NOT NULL) as migrated_count,
  CASE WHEN (SELECT COUNT(*) FROM vault_items WHERE notes IS NOT NULL) = 
       (SELECT COUNT(*) FROM vault_item_secrets WHERE notes_encrypted IS NOT NULL) 
  THEN 'PASS' ELSE 'FAIL' END as status;
```

---

## Phase 3 SQL (ONLY after verification passes)

```sql
-- DROP sensitive columns from vault_items (metadata-only table)
-- RUN ONLY AFTER vault-migrate-secrets completes AND verification query passes
ALTER TABLE vault_items DROP COLUMN IF EXISTS password_encrypted;
ALTER TABLE vault_items DROP COLUMN IF EXISTS password_iv;
ALTER TABLE vault_items DROP COLUMN IF EXISTS username;
ALTER TABLE vault_items DROP COLUMN IF EXISTS notes;
```

---

## RLS Policy Matrix (Final State)

### vault_items

| Operation | Policy | Access |
|-----------|--------|--------|
| SELECT | vault_items_select_owner | owner_id = current_user |
| SELECT | vault_items_select_shared | Has active vault_permission |
| INSERT | vault_items_insert_owner | owner_id IS NULL OR = current_user |
| UPDATE | vault_items_update_owner | owner_id = current_user |
| DELETE | vault_items_delete_owner | owner_id = current_user |

### vault_item_secrets

| Operation | Policy | Access |
|-----------|--------|--------|
| SELECT | vault_secrets_select_owner | Item owner |
| SELECT | vault_secrets_select_shared | permission_level = 'view_secret' |
| INSERT | vault_secrets_insert_owner | Item owner |
| UPDATE | vault_secrets_update_owner | Item owner (WITH CHECK prevents vault_item_id change) |
| DELETE | vault_secrets_delete_owner | Item owner |

### vault_permissions

| Operation | Policy | Access |
|-----------|--------|--------|
| SELECT | vault_permissions_owner_select | Item owner |
| SELECT | vault_permissions_grantee_select | Grantee (active only) |
| INSERT | vault_permissions_owner_insert | Item owner |
| UPDATE | vault_permissions_owner_update | Item owner |
| DELETE | vault_permissions_owner_delete | Item owner |

### vault_audit_logs

| Operation | Policy | Access |
|-----------|--------|--------|
| SELECT | vault_audit_logs_owner_only | Item owner OR own actions |
| INSERT | (existing) | Forces user_id to current user |

---

## Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/XXX_vault_privacy.sql` | CREATE | Full schema + RLS migration |
| `supabase/functions/vault-encrypt/index.ts` | MODIFY | Multi-field encryption |
| `supabase/functions/vault-decrypt/index.ts` | MODIFY | Remove admin, query secrets table, strict hex |
| `supabase/functions/vault-migrate-secrets/index.ts` | CREATE | One-time username/notes encryption |
| `src/hooks/useVaultData.ts` | MODIFY | Two-table architecture, share mutations |
| `src/pages/Vault.tsx` | MODIFY | View mode tabs, remove isAdmin |
| `src/components/vault/VaultItemCard.tsx` | MODIFY | Add share button, owner-only logic |
| `src/components/vault/VaultShareDialog.tsx` | CREATE | Share dialog component |
| `src/contexts/LanguageContext.tsx` | MODIFY | Add sharing translations |

---

## Test Report Template

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| 1 | Password migration count | Run verification query | source = migrated | PENDING |
| 2 | Username migration count | Run vault-migrate-secrets, verify | 5 migrated | PENDING |
| 3 | Create item end-to-end | Create with password/username/notes | All encrypted in secrets table | PENDING |
| 4 | Update item end-to-end | Update username | New encrypted value saved | PENDING |
| 5 | Reveal password (owner) | Owner calls vault-decrypt field=password | Password returned | PENDING |
| 6 | Reveal username (owner) | Owner calls vault-decrypt field=username | Username returned | PENDING |
| 7 | view_metadata blocked from secrets | User B (view_metadata) queries vault_item_secrets | Empty result (RLS blocks) | PENDING |
| 8 | view_metadata can see metadata | User B queries vault_items | Sees title, type, url only | PENDING |
| 9 | view_secret can decrypt | User B calls vault-decrypt | Values returned | PENDING |
| 10 | super_admin cannot list others | super_admin queries vault_items | Only own items | PENDING |
| 11 | super_admin cannot decrypt others | super_admin calls vault-decrypt on A's item | 403 Forbidden | PENDING |
| 12 | Audit logs owner-only | super_admin queries vault_audit_logs | Only own actions | PENDING |
| 13 | Column types are TEXT | Check vault_item_secrets columns | All TEXT, not BYTEA | PENDING |
| 14 | Cannot change owner_id | Attempt UPDATE on owner_id | Trigger throws exception | PENDING |

---

## Implementation Order

1. Apply Phase 1 database migration
2. Deploy vault-encrypt (multi-field)
3. Deploy vault-decrypt (no admin, strict hex, query secrets)
4. Deploy vault-migrate-secrets
5. Run vault-migrate-secrets to encrypt existing usernames
6. Run verification query
7. Update frontend (hooks, Vault.tsx, VaultShareDialog, translations)
8. Manual UI test: create/reveal password+username+notes
9. After all tests pass: Apply Phase 3 SQL to drop old columns
10. Generate final PASS/FAIL report

