-- ============================================================
-- PHASE 2.6: DomainAdmin Option A Enforcement
-- PHASE 3.1: AD Integration Database Schema
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS FOR DOMAIN ADMIN RESOURCE ACCESS
-- ============================================================

-- Check if user can manage a specific resource based on domain scope
-- DomainAdmin can ONLY manage resources where domain_id matches their domain scope
-- Site-level resources (domain_id IS NULL) require SiteAdmin or InfraOperator at site level
CREATE OR REPLACE FUNCTION public.can_manage_resource_domain(
  p_site_id uuid,
  p_domain_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Super admin can manage everything
    public.is_super_admin()
    -- SiteAdmin/InfraOperator at site level can manage any resource in that site
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.status = 'active'
        AND ra.scope_type = 'site'
        AND ra.scope_id = p_site_id
        AND r.name IN ('SiteAdmin', 'InfraOperator')
    )
    -- DomainAdmin can manage resources ONLY where domain_id matches their domain scope
    OR (
      p_domain_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM role_assignments ra
        JOIN roles r ON r.id = ra.role_id
        WHERE ra.user_id = auth.uid()
          AND ra.status = 'active'
          AND ra.scope_type = 'domain'
          AND ra.scope_id = p_domain_id
          AND r.name = 'DomainAdmin'
      )
    )
    -- Legacy: site_memberships with admin role for site-level or any domain
    OR EXISTS (
      SELECT 1 FROM site_memberships sm
      WHERE sm.site_id = p_site_id 
        AND sm.profile_id = get_my_profile_id()
        AND sm.site_role IN ('site_admin', 'site_operator')
    )
$$;

-- Get user's domain scope IDs (for DomainAdmin filtering)
CREATE OR REPLACE FUNCTION public.get_my_domain_scope_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT ra.scope_id),
    ARRAY[]::uuid[]
  )
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  WHERE ra.user_id = auth.uid()
    AND ra.status = 'active'
    AND ra.scope_type = 'domain'
    AND r.name = 'DomainAdmin'
$$;

-- Check if user is DomainAdmin only (no site-level roles)
CREATE OR REPLACE FUNCTION public.is_domain_admin_only_for_site(p_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    NOT public.is_super_admin()
    AND NOT EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.status = 'active'
        AND ra.scope_type = 'site'
        AND ra.scope_id = p_site_id
        AND r.name IN ('SiteAdmin', 'InfraOperator')
    )
    AND NOT EXISTS (
      SELECT 1 FROM site_memberships sm
      WHERE sm.site_id = p_site_id 
        AND sm.profile_id = get_my_profile_id()
        AND sm.site_role IN ('site_admin', 'site_operator')
    )
    AND EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN domains d ON d.id = ra.scope_id
      WHERE ra.user_id = auth.uid()
        AND ra.status = 'active'
        AND ra.scope_type = 'domain'
        AND d.site_id = p_site_id
        AND r.name = 'DomainAdmin'
    )
$$;

-- ============================================================
-- UPDATE RESOURCES RLS POLICIES FOR DOMAIN ADMIN OPTION A
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view resources in their sites" ON resources;
DROP POLICY IF EXISTS "Site operators can manage resources" ON resources;

-- New SELECT policy: Can view if has site access
CREATE POLICY "Users can view resources in accessible sites"
ON resources FOR SELECT
USING (can_access_site(site_id));

-- New INSERT policy: Domain admins can only insert domain-scoped resources
CREATE POLICY "Users can create resources within their scope"
ON resources FOR INSERT
WITH CHECK (
  can_access_site(site_id)
  AND can_manage_resource_domain(site_id, domain_id)
);

-- New UPDATE policy: Domain admins can only update domain-scoped resources
CREATE POLICY "Users can update resources within their scope"
ON resources FOR UPDATE
USING (can_manage_resource_domain(site_id, domain_id))
WITH CHECK (can_manage_resource_domain(site_id, domain_id));

-- New DELETE policy: Domain admins can only delete domain-scoped resources
CREATE POLICY "Users can delete resources within their scope"
ON resources FOR DELETE
USING (can_manage_resource_domain(site_id, domain_id));

-- ============================================================
-- PHASE 3.1: AD INTEGRATION TABLES
-- ============================================================

-- Add fqdn column to domains if not exists
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS fqdn text;
CREATE INDEX IF NOT EXISTS idx_domains_fqdn ON public.domains(fqdn);

-- Add site_id to scan_agents for site-level agent management
ALTER TABLE public.scan_agents ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id);
ALTER TABLE public.scan_agents ADD COLUMN IF NOT EXISTS agent_type text DEFAULT 'file-scanner';
ALTER TABLE public.scan_agents ADD COLUMN IF NOT EXISTS capabilities_json jsonb DEFAULT '{}';

-- Create index for site_id
CREATE INDEX IF NOT EXISTS idx_scan_agents_site_id ON public.scan_agents(site_id);
CREATE INDEX IF NOT EXISTS idx_scan_agents_agent_type ON public.scan_agents(agent_type);

-- ============================================================
-- Domain Integrations Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.domain_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('active_directory', 'azure_ad', 'ldap')),
  mode text NOT NULL DEFAULT 'push' CHECK (mode IN ('push', 'pull')),
  agent_id uuid REFERENCES public.scan_agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('enabled', 'disabled')),
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(domain_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_domain_integrations_site_id ON public.domain_integrations(site_id);
CREATE INDEX IF NOT EXISTS idx_domain_integrations_domain_id ON public.domain_integrations(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_integrations_agent_id ON public.domain_integrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_domain_integrations_type ON public.domain_integrations(integration_type);

-- Enable RLS
ALTER TABLE public.domain_integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Integration Runs Table (sync history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.integration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.domain_integrations(id) ON DELETE CASCADE,
  run_type text NOT NULL DEFAULT 'push' CHECK (run_type IN ('push', 'pull', 'manual')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  success boolean,
  error_summary text,
  metrics_json jsonb DEFAULT '{}'::jsonb,
  created_by text DEFAULT 'agent'
);

CREATE INDEX IF NOT EXISTS idx_integration_runs_integration_id ON public.integration_runs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_started_at ON public.integration_runs(integration_id, started_at DESC);

-- Enable RLS
ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AD Snapshots Table (summary metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  
  -- User metrics
  users_total integer DEFAULT 0,
  users_enabled integer DEFAULT 0,
  users_disabled integer DEFAULT 0,
  users_locked integer DEFAULT 0,
  
  -- Password metrics
  pwd_expired integer DEFAULT 0,
  pwd_expiring_7d integer DEFAULT 0,
  pwd_expiring_14d integer DEFAULT 0,
  pwd_expiring_30d integer DEFAULT 0,
  pwd_never_expires integer DEFAULT 0,
  
  -- Computer metrics
  computers_total integer DEFAULT 0,
  computers_enabled integer DEFAULT 0,
  computers_stale_30d integer DEFAULT 0,
  computers_stale_60d integer DEFAULT 0,
  computers_stale_90d integer DEFAULT 0,
  
  -- Group metrics
  groups_total integer DEFAULT 0,
  privileged_groups_total integer DEFAULT 0,
  
  -- Domain controller metrics
  dcs_total integer DEFAULT 0,
  dcs_down integer DEFAULT 0,
  
  -- Sync metadata
  last_successful_sync_at timestamptz,
  
  UNIQUE(domain_id, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_ad_snapshots_domain_id ON public.ad_snapshots(domain_id);
CREATE INDEX IF NOT EXISTS idx_ad_snapshots_captured_at ON public.ad_snapshots(domain_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_snapshots_site_id ON public.ad_snapshots(site_id);

-- Enable RLS
ALTER TABLE public.ad_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AD Users Detail Table (optional, if enabled)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  
  -- User identity
  sid text NOT NULL,
  sam_account_name text NOT NULL,
  display_name text,
  user_principal_name text,
  email text,
  
  -- Status
  enabled boolean DEFAULT true,
  locked boolean DEFAULT false,
  account_expires_at timestamptz,
  
  -- Password info
  pwd_last_set timestamptz,
  pwd_expires_at timestamptz,
  pwd_never_expires boolean DEFAULT false,
  
  -- Logon info
  last_logon timestamptz,
  logon_count integer DEFAULT 0,
  
  -- Organization
  department text,
  title text,
  manager_dn text,
  ou_dn text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(domain_id, captured_at, sid)
);

CREATE INDEX IF NOT EXISTS idx_ad_users_domain_id ON public.ad_users(domain_id);
CREATE INDEX IF NOT EXISTS idx_ad_users_captured_at ON public.ad_users(domain_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_users_sam ON public.ad_users(domain_id, sam_account_name);

-- Enable RLS
ALTER TABLE public.ad_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AD Computers Detail Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_computers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  
  -- Computer identity
  name text NOT NULL,
  dns_hostname text,
  
  -- Status
  enabled boolean DEFAULT true,
  last_logon timestamptz,
  
  -- System info
  operating_system text,
  os_version text,
  os_service_pack text,
  
  -- Location
  ou_dn text,
  ad_site_name text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(domain_id, captured_at, name)
);

CREATE INDEX IF NOT EXISTS idx_ad_computers_domain_id ON public.ad_computers(domain_id);
CREATE INDEX IF NOT EXISTS idx_ad_computers_captured_at ON public.ad_computers(domain_id, captured_at DESC);

-- Enable RLS
ALTER TABLE public.ad_computers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AD Groups Detail Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  
  -- Group identity
  name text NOT NULL,
  dn text NOT NULL,
  sam_account_name text,
  
  -- Classification
  group_scope text,
  group_type text,
  is_privileged boolean DEFAULT false,
  
  -- Membership
  member_count integer DEFAULT 0,
  
  -- Metadata
  description text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(domain_id, captured_at, dn)
);

CREATE INDEX IF NOT EXISTS idx_ad_groups_domain_id ON public.ad_groups(domain_id);
CREATE INDEX IF NOT EXISTS idx_ad_groups_captured_at ON public.ad_groups(domain_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_groups_privileged ON public.ad_groups(domain_id, is_privileged) WHERE is_privileged = true;

-- Enable RLS
ALTER TABLE public.ad_groups ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AD Domain Controllers Detail Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_domain_controllers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  
  -- DC identity
  name text NOT NULL,
  hostname text,
  ip_address text,
  
  -- Status
  is_up boolean DEFAULT true,
  is_global_catalog boolean DEFAULT false,
  is_read_only boolean DEFAULT false,
  
  -- AD Site
  ad_site_name text,
  
  -- Last seen
  last_seen_at timestamptz,
  
  -- Metadata
  operating_system text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(domain_id, captured_at, name)
);

CREATE INDEX IF NOT EXISTS idx_ad_dcs_domain_id ON public.ad_domain_controllers(domain_id);
CREATE INDEX IF NOT EXISTS idx_ad_dcs_captured_at ON public.ad_domain_controllers(domain_id, captured_at DESC);

-- Enable RLS
ALTER TABLE public.ad_domain_controllers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES FOR AD TABLES
-- ============================================================

-- Domain Integrations Policies
CREATE POLICY "Users can view integrations in accessible domains"
ON domain_integrations FOR SELECT
USING (can_access_domain(domain_id));

CREATE POLICY "Users can manage integrations with domain manage permission"
ON domain_integrations FOR INSERT
WITH CHECK (
  is_super_admin() 
  OR can_manage_domain(domain_id)
  OR can_manage_site(site_id)
);

CREATE POLICY "Users can update integrations with domain manage permission"
ON domain_integrations FOR UPDATE
USING (
  is_super_admin() 
  OR can_manage_domain(domain_id)
  OR can_manage_site(site_id)
)
WITH CHECK (
  is_super_admin() 
  OR can_manage_domain(domain_id)
  OR can_manage_site(site_id)
);

CREATE POLICY "Users can delete integrations with domain manage permission"
ON domain_integrations FOR DELETE
USING (
  is_super_admin() 
  OR can_manage_domain(domain_id)
  OR can_manage_site(site_id)
);

-- Integration Runs Policies (read-only for users, writes by service)
CREATE POLICY "Users can view integration runs for accessible domains"
ON integration_runs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM domain_integrations di
    WHERE di.id = integration_id AND can_access_domain(di.domain_id)
  )
);

-- AD Snapshots Policies
CREATE POLICY "Users can view AD snapshots for accessible domains"
ON ad_snapshots FOR SELECT
USING (can_access_domain(domain_id));

-- AD Users Policies
CREATE POLICY "Users can view AD users for accessible domains"
ON ad_users FOR SELECT
USING (can_access_domain(domain_id));

-- AD Computers Policies
CREATE POLICY "Users can view AD computers for accessible domains"
ON ad_computers FOR SELECT
USING (can_access_domain(domain_id));

-- AD Groups Policies
CREATE POLICY "Users can view AD groups for accessible domains"
ON ad_groups FOR SELECT
USING (can_access_domain(domain_id));

-- AD Domain Controllers Policies
CREATE POLICY "Users can view AD DCs for accessible domains"
ON ad_domain_controllers FOR SELECT
USING (can_access_domain(domain_id));

-- ============================================================
-- UPDATE scan_agents RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view scan agents" ON scan_agents;
DROP POLICY IF EXISTS "Users can manage scan agents" ON scan_agents;
DROP POLICY IF EXISTS "Domain admins can manage scan agents" ON scan_agents;

-- View: accessible via domain or site
CREATE POLICY "Users can view agents in accessible sites"
ON scan_agents FOR SELECT
USING (
  can_access_domain(domain_id) 
  OR (site_id IS NOT NULL AND can_access_site(site_id))
);

-- Manage: requires site-level or domain admin permission
CREATE POLICY "Users can manage agents with proper permissions"
ON scan_agents FOR ALL
USING (
  is_super_admin()
  OR (site_id IS NOT NULL AND can_manage_site(site_id))
  OR can_manage_domain(domain_id)
)
WITH CHECK (
  is_super_admin()
  OR (site_id IS NOT NULL AND can_manage_site(site_id))
  OR can_manage_domain(domain_id)
);

-- ============================================================
-- TRIGGER FOR updated_at on new tables
-- ============================================================

CREATE TRIGGER update_domain_integrations_updated_at
BEFORE UPDATE ON domain_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Enable realtime for key tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.domain_integrations;