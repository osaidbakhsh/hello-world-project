-- ============================================================
-- MIGRATION 4: Infrastructure Credentials Table with Audit Logging
-- ============================================================

-- 1. Create infrastructure_credentials table
CREATE TABLE IF NOT EXISTS public.infrastructure_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL,
  resource_type text NOT NULL,
  secret_name text NOT NULL,
  encrypted_value text NOT NULL,
  encryption_iv text NOT NULL,
  encryption_tag text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_resource_secret UNIQUE(resource_id, secret_name)
);

-- 2. Enable RLS
ALTER TABLE public.infrastructure_credentials ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies using check_resource_access
-- Operators can view credentials for resources they have access to
CREATE POLICY "infra_creds_select" ON public.infrastructure_credentials
FOR SELECT USING ((SELECT check_resource_access(resource_id, resource_type, 'operator')));

-- Admins can create credentials for resources they manage
CREATE POLICY "infra_creds_insert" ON public.infrastructure_credentials
FOR INSERT WITH CHECK ((SELECT check_resource_access(resource_id, resource_type, 'admin')));

-- Admins can update credentials
CREATE POLICY "infra_creds_update" ON public.infrastructure_credentials
FOR UPDATE USING ((SELECT check_resource_access(resource_id, resource_type, 'admin')))
WITH CHECK ((SELECT check_resource_access(resource_id, resource_type, 'admin')));

-- Admins can delete credentials
CREATE POLICY "infra_creds_delete" ON public.infrastructure_credentials
FOR DELETE USING ((SELECT check_resource_access(resource_id, resource_type, 'admin')));

-- 4. Create audit logging table
CREATE TABLE IF NOT EXISTS public.infra_credential_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES infrastructure_credentials(id) ON DELETE CASCADE,
  accessed_by uuid NOT NULL REFERENCES profiles(id),
  access_type text NOT NULL, -- 'view', 'reveal', 'decrypt', 'create', 'update', 'delete'
  resource_id uuid,
  resource_type text,
  ip_address text,
  user_agent text,
  accessed_at timestamptz DEFAULT now()
);

-- 5. Enable RLS on audit logs
ALTER TABLE public.infra_credential_access_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin or the person who accessed can see logs
CREATE POLICY "infra_logs_select" ON public.infra_credential_access_logs
FOR SELECT USING ((SELECT is_super_admin()) OR accessed_by = (SELECT get_my_profile_id()));

-- Any authenticated user can insert logs (for their own actions)
CREATE POLICY "infra_logs_insert" ON public.infra_credential_access_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND accessed_by = (SELECT get_my_profile_id()));

-- 6. Create trigger function for automatic audit logging on credential changes
CREATE OR REPLACE FUNCTION public.log_infra_credential_access()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_id uuid;
  _action_type text;
BEGIN
  _profile_id := get_my_profile_id();
  
  IF _profile_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    _action_type := 'create';
    INSERT INTO infra_credential_access_logs (credential_id, accessed_by, access_type, resource_id, resource_type)
    VALUES (NEW.id, _profile_id, _action_type, NEW.resource_id, NEW.resource_type);
  ELSIF TG_OP = 'UPDATE' THEN
    _action_type := 'update';
    INSERT INTO infra_credential_access_logs (credential_id, accessed_by, access_type, resource_id, resource_type)
    VALUES (NEW.id, _profile_id, _action_type, NEW.resource_id, NEW.resource_type);
  ELSIF TG_OP = 'DELETE' THEN
    _action_type := 'delete';
    INSERT INTO infra_credential_access_logs (credential_id, accessed_by, access_type, resource_id, resource_type)
    VALUES (OLD.id, _profile_id, _action_type, OLD.resource_id, OLD.resource_type);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Attach trigger to infrastructure_credentials table
DROP TRIGGER IF EXISTS trg_log_infra_credential_access ON public.infrastructure_credentials;
CREATE TRIGGER trg_log_infra_credential_access
AFTER INSERT OR UPDATE OR DELETE ON public.infrastructure_credentials
FOR EACH ROW EXECUTE FUNCTION public.log_infra_credential_access();

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_infra_creds_resource ON public.infrastructure_credentials(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_infra_creds_created_by ON public.infrastructure_credentials(created_by);
CREATE INDEX IF NOT EXISTS idx_infra_logs_credential ON public.infra_credential_access_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_infra_logs_accessed_by ON public.infra_credential_access_logs(accessed_by);
CREATE INDEX IF NOT EXISTS idx_infra_logs_accessed_at ON public.infra_credential_access_logs(accessed_at DESC);

-- 9. Update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_infra_creds_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_infra_creds_updated_at ON public.infrastructure_credentials;
CREATE TRIGGER trg_infra_creds_updated_at
BEFORE UPDATE ON public.infrastructure_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_infra_creds_updated_at();