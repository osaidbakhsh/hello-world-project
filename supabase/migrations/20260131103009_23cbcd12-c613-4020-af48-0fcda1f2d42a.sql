-- =====================================================
-- CREDENTIALS VAULT MODULE - SECURE STORAGE
-- =====================================================

-- 1. Create vault_role enum for role-based access
CREATE TYPE public.vault_role AS ENUM ('vault_admin', 'vault_editor', 'vault_viewer');

-- 2. Create vault_items table with encrypted password storage
CREATE TABLE public.vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  title TEXT NOT NULL,
  username TEXT,
  password_encrypted BYTEA,
  password_iv BYTEA,
  url TEXT,
  item_type TEXT NOT NULL DEFAULT 'other',
  
  -- Linked entities (optional)
  linked_server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  linked_network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
  linked_application_id UUID REFERENCES website_applications(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Security
  requires_2fa_reveal BOOLEAN DEFAULT FALSE,
  last_password_reveal TIMESTAMPTZ,
  password_reveal_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT valid_item_type CHECK (item_type IN ('server', 'website', 'network_device', 'application', 'api_key', 'other'))
);

-- 3. Create vault_permissions table for per-item access control
CREATE TABLE public.vault_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_reveal BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE (vault_item_id, profile_id)
);

-- 4. Create vault_audit_logs for tracking all access
CREATE TABLE public.vault_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create vault_settings table for admin configuration
CREATE TABLE public.vault_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO vault_settings (key, value) VALUES 
  ('reveal_duration_seconds', '"10"'),
  ('auto_lock_minutes', '"5"'),
  ('global_reveal_disabled', 'false'),
  ('require_2fa_for_reveal', 'false');

-- 6. Enable RLS on all vault tables
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;

-- 7. Create helper function to check vault permissions
CREATE OR REPLACE FUNCTION public.has_vault_permission(
  _vault_item_id UUID, 
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault_permissions vp
    JOIN profiles p ON p.id = vp.profile_id
    WHERE p.user_id = auth.uid() 
      AND vp.vault_item_id = _vault_item_id
      AND (
        (_permission = 'view' AND vp.can_view = TRUE) OR
        (_permission = 'reveal' AND vp.can_reveal = TRUE) OR
        (_permission = 'edit' AND vp.can_edit = TRUE)
      )
  )
$$;

-- 8. Create helper function to check vault item ownership
CREATE OR REPLACE FUNCTION public.owns_vault_item(_vault_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault_items vi
    JOIN profiles p ON p.id = vi.owner_id
    WHERE vi.id = _vault_item_id AND p.user_id = auth.uid()
  )
$$;

-- =====================================================
-- RLS POLICIES FOR vault_items
-- =====================================================

-- Admins can do all
CREATE POLICY "Admins can do all on vault_items"
  ON vault_items FOR ALL
  USING (is_admin());

-- Owners can manage their items
CREATE POLICY "Owners can manage their vault items"
  ON vault_items FOR ALL
  USING (owner_id = get_my_profile_id());

-- Users with view permission can see items
CREATE POLICY "Users with view permission can see vault items"
  ON vault_items FOR SELECT
  USING (has_vault_permission(id, 'view'));

-- =====================================================
-- RLS POLICIES FOR vault_permissions
-- =====================================================

-- Admins can manage all permissions
CREATE POLICY "Admins can manage vault permissions"
  ON vault_permissions FOR ALL
  USING (is_admin());

-- Owners can manage permissions for their items
CREATE POLICY "Owners can manage permissions for their items"
  ON vault_permissions FOR ALL
  USING (owns_vault_item(vault_item_id));

-- Users can view their own permissions
CREATE POLICY "Users can view their permissions"
  ON vault_permissions FOR SELECT
  USING (profile_id = get_my_profile_id());

-- =====================================================
-- RLS POLICIES FOR vault_audit_logs
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view vault audit logs"
  ON vault_audit_logs FOR SELECT
  USING (is_admin());

-- All authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert vault audit logs"
  ON vault_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES FOR vault_settings
-- =====================================================

-- Admins can manage settings
CREATE POLICY "Admins can manage vault settings"
  ON vault_settings FOR ALL
  USING (is_admin());

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read vault settings"
  ON vault_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_settings_updated_at
  BEFORE UPDATE ON vault_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();