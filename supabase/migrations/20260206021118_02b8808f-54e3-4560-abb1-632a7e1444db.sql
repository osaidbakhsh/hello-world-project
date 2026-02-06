-- ============================================================
-- PHASE 2 RBAC: Scope-based Role Assignments
-- Using CREATE OR REPLACE to preserve existing dependencies
-- ============================================================

-- Create role_scope_type enum if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_scope_type') THEN
        CREATE TYPE public.role_scope_type AS ENUM ('site', 'domain', 'cluster');
    END IF;
END $$;

-- Create role_status_type enum if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_status_type') THEN
        CREATE TYPE public.role_status_type AS ENUM ('active', 'disabled');
    END IF;
END $$;

-- ============================================================
-- ROLES TABLE (static/seeded roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    capabilities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Roles are readable by authenticated users" ON public.roles;
DROP POLICY IF EXISTS "Only super_admin can manage roles" ON public.roles;

-- Everyone can read roles (they're just definitions)
CREATE POLICY "Roles are readable by authenticated users"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

-- Only super_admin can modify roles
CREATE POLICY "Only super_admin can manage roles"
    ON public.roles FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ============================================================
-- ROLE_ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    scope_type role_scope_type NOT NULL,
    scope_id UUID NOT NULL,
    status role_status_type NOT NULL DEFAULT 'active',
    granted_by UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    
    -- Prevent duplicate assignments
    CONSTRAINT unique_role_assignment UNIQUE (user_id, role_id, scope_type, scope_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_assignments_user_status ON public.role_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_role_assignments_scope ON public.role_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_user_scope_status ON public.role_assignments(user_id, scope_type, scope_id, status);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments(role_id);

-- Enable RLS
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED ROLES (upsert to avoid duplicates)
-- ============================================================
INSERT INTO public.roles (name, description, capabilities) VALUES
    ('SuperAdmin', 'Full system access across all sites and domains', '["*"]'::jsonb),
    ('SiteAdmin', 'Full administrative access within assigned site', '["site.manage", "domain.manage", "cluster.manage", "resource.manage", "rbac.manage", "audit.view"]'::jsonb),
    ('DomainAdmin', 'Administrative access within assigned domain', '["domain.manage", "resource.manage", "audit.view"]'::jsonb),
    ('InfraOperator', 'Operational access to infrastructure resources', '["resource.manage", "cluster.view", "domain.view"]'::jsonb),
    ('Viewer', 'Read-only access to assigned scope', '["site.view", "domain.view", "cluster.view", "resource.view"]'::jsonb),
    ('Auditor', 'Read-only access with full audit log visibility', '["site.view", "domain.view", "audit.view", "audit.export"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities;

-- ============================================================
-- VIEW: My effective role assignments (for easy querying)
-- ============================================================
CREATE OR REPLACE VIEW public.v_my_role_assignments AS
SELECT 
    ra.id,
    ra.user_id,
    ra.role_id,
    r.name as role_name,
    r.capabilities,
    ra.scope_type,
    ra.scope_id,
    ra.status,
    ra.granted_at,
    ra.notes,
    -- Resolve scope names
    CASE ra.scope_type
        WHEN 'site' THEN (SELECT name FROM public.sites WHERE id = ra.scope_id)
        WHEN 'domain' THEN (SELECT name FROM public.domains WHERE id = ra.scope_id)
        WHEN 'cluster' THEN (SELECT name FROM public.clusters WHERE id = ra.scope_id)
    END as scope_name,
    -- Get owning site_id for any scope
    CASE ra.scope_type
        WHEN 'site' THEN ra.scope_id
        WHEN 'domain' THEN (SELECT site_id FROM public.domains WHERE id = ra.scope_id)
        WHEN 'cluster' THEN (SELECT dc.site_id FROM public.clusters c JOIN public.datacenters dc ON dc.id = c.datacenter_id WHERE c.id = ra.scope_id)
    END as owning_site_id
FROM public.role_assignments ra
JOIN public.roles r ON r.id = ra.role_id
WHERE ra.user_id = auth.uid() AND ra.status = 'active';

-- ============================================================
-- HELPER FUNCTION: Get user's role assignments
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role_assignments(p_user_id UUID)
RETURNS TABLE (
    role_name TEXT,
    scope_type role_scope_type,
    scope_id UUID,
    owning_site_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        r.name,
        ra.scope_type,
        ra.scope_id,
        CASE ra.scope_type
            WHEN 'site' THEN ra.scope_id
            WHEN 'domain' THEN (SELECT site_id FROM domains WHERE id = ra.scope_id)
            WHEN 'cluster' THEN (SELECT dc.site_id FROM clusters c JOIN datacenters dc ON dc.id = c.datacenter_id WHERE c.id = ra.scope_id)
        END
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.user_id = p_user_id AND ra.status = 'active'
$$;

-- ============================================================
-- HELPER FUNCTION: Check if user has specific role at scope
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role_at_scope(
    p_role_name TEXT,
    p_scope_type role_scope_type,
    p_scope_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM role_assignments ra
        JOIN roles r ON r.id = ra.role_id
        WHERE ra.user_id = auth.uid()
          AND ra.status = 'active'
          AND r.name = p_role_name
          AND ra.scope_type = p_scope_type
          AND ra.scope_id = p_scope_id
    )
$$;

-- ============================================================
-- HELPER: Get owning site for a scope
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_scope_site_id(
    p_scope_type role_scope_type,
    p_scope_id UUID
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE p_scope_type
        WHEN 'site' THEN p_scope_id
        WHEN 'domain' THEN (SELECT site_id FROM domains WHERE id = p_scope_id)
        WHEN 'cluster' THEN (SELECT dc.site_id FROM clusters c JOIN datacenters dc ON dc.id = c.datacenter_id WHERE c.id = p_scope_id)
    END
$$;

-- ============================================================
-- UPDATED: is_super_admin() - Check via role_assignments
-- Keep existing parameter name (none) for compatibility
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Check both old user_roles table and new role_assignments
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
        SELECT 1 
        FROM role_assignments ra
        JOIN roles r ON r.id = ra.role_id
        WHERE ra.user_id = auth.uid()
          AND ra.status = 'active'
          AND r.name = 'SuperAdmin'
    )
$$;

-- ============================================================
-- UPDATED: can_access_site() - Use role_assignments
-- Keep parameter name _site_id for backward compatibility
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_site(_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        -- Super admin can access everything
        public.is_super_admin()
        -- Direct site assignment (any role)
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND ra.scope_id = _site_id
        )
        -- Domain assignment where domain belongs to site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN domains d ON d.id = ra.scope_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'domain'
              AND d.site_id = _site_id
        )
        -- Cluster assignment where cluster belongs to site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN clusters c ON c.id = ra.scope_id
            JOIN datacenters dc ON dc.id = c.datacenter_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'cluster'
              AND dc.site_id = _site_id
        )
        -- Legacy: site_memberships table
        OR EXISTS (
            SELECT 1 FROM site_memberships sm
            WHERE sm.site_id = _site_id AND sm.profile_id = get_my_profile_id()
        )
$$;

-- ============================================================
-- UPDATED: can_manage_site() - Requires SiteAdmin or SuperAdmin
-- Keep parameter name _site_id for backward compatibility
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_site(_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin()
        -- SiteAdmin or InfraOperator at site level
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN roles r ON r.id = ra.role_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND ra.scope_id = _site_id
              AND r.name IN ('SiteAdmin', 'InfraOperator')
        )
        -- Legacy: site_memberships with admin role
        OR EXISTS (
            SELECT 1 FROM site_memberships sm
            WHERE sm.site_id = _site_id 
              AND sm.profile_id = get_my_profile_id()
              AND sm.site_role = 'site_admin'
        )
$$;

-- ============================================================
-- UPDATED: can_access_domain() - Use role_assignments
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_domain(_domain_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin()
        -- Direct domain assignment
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'domain'
              AND ra.scope_id = _domain_id
        )
        -- Site-level assignment on domain's owning site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN domains d ON d.site_id = ra.scope_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND d.id = _domain_id
        )
        -- Legacy: domain_memberships
        OR EXISTS (
            SELECT 1 FROM domain_memberships dm
            WHERE dm.domain_id = _domain_id AND dm.profile_id = get_my_profile_id()
        )
        -- Legacy: site_memberships via domain's site
        OR EXISTS (
            SELECT 1 FROM domains d
            JOIN site_memberships sm ON sm.site_id = d.site_id
            WHERE d.id = _domain_id AND sm.profile_id = get_my_profile_id()
        )
$$;

-- ============================================================
-- UPDATED: can_manage_domain() - Requires DomainAdmin+ or SiteAdmin
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_domain(_domain_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin()
        -- DomainAdmin or InfraOperator at domain level
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN roles r ON r.id = ra.role_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'domain'
              AND ra.scope_id = _domain_id
              AND r.name IN ('DomainAdmin', 'InfraOperator')
        )
        -- SiteAdmin on domain's owning site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN roles r ON r.id = ra.role_id
            JOIN domains d ON d.site_id = ra.scope_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND d.id = _domain_id
              AND r.name IN ('SiteAdmin', 'InfraOperator')
        )
        -- Legacy checks
        OR EXISTS (
            SELECT 1 FROM domain_memberships dm
            WHERE dm.domain_id = _domain_id 
              AND dm.profile_id = get_my_profile_id()
              AND (dm.can_edit = true OR dm.domain_role = 'domain_admin')
        )
$$;

-- ============================================================
-- UPDATED: can_access_cluster()
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_cluster(_cluster_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin()
        -- Direct cluster assignment
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'cluster'
              AND ra.scope_id = _cluster_id
        )
        -- Site-level assignment on cluster's owning site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN clusters c ON c.id = _cluster_id
            JOIN datacenters dc ON dc.id = c.datacenter_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND ra.scope_id = dc.site_id
        )
        -- Domain assignment where cluster belongs to same site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN domains d ON d.id = ra.scope_id
            JOIN clusters c ON c.id = _cluster_id
            JOIN datacenters dc ON dc.id = c.datacenter_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'domain'
              AND d.site_id = dc.site_id
        )
$$;

-- ============================================================
-- NEW: can_manage_cluster()
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_cluster(_cluster_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin()
        -- InfraOperator or above at cluster level
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN roles r ON r.id = ra.role_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'cluster'
              AND ra.scope_id = _cluster_id
              AND r.name IN ('SiteAdmin', 'DomainAdmin', 'InfraOperator')
        )
        -- SiteAdmin/InfraOperator on cluster's owning site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN roles r ON r.id = ra.role_id
            JOIN clusters c ON c.id = _cluster_id
            JOIN datacenters dc ON dc.id = c.datacenter_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND ra.scope_id = dc.site_id
              AND r.name IN ('SiteAdmin', 'InfraOperator')
        )
$$;

-- ============================================================
-- NEW: can_manage_rbac() - Check if user can manage RBAC at scope
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_rbac(_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin()
        -- SiteAdmin can manage RBAC within their site
        OR EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN roles r ON r.id = ra.role_id
            WHERE ra.user_id = auth.uid()
              AND ra.status = 'active'
              AND ra.scope_type = 'site'
              AND ra.scope_id = _site_id
              AND r.name = 'SiteAdmin'
        )
$$;

-- ============================================================
-- HELPER: Get owning site for a scope (overload for text scope_type)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_scope_site_id_text(
    p_scope_type TEXT,
    p_scope_id UUID
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE p_scope_type
        WHEN 'site' THEN p_scope_id
        WHEN 'domain' THEN (SELECT site_id FROM domains WHERE id = p_scope_id)
        WHEN 'cluster' THEN (SELECT dc.site_id FROM clusters c JOIN datacenters dc ON dc.id = c.datacenter_id WHERE c.id = p_scope_id)
    END
$$;

-- ============================================================
-- RLS POLICIES FOR role_assignments
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.role_assignments;
DROP POLICY IF EXISTS "Admins can create role assignments" ON public.role_assignments;
DROP POLICY IF EXISTS "Admins can update role assignments" ON public.role_assignments;
DROP POLICY IF EXISTS "Only super admin can delete role assignments" ON public.role_assignments;

-- SELECT: Users can see their own assignments, super admin sees all,
-- SiteAdmin can see assignments within their site scope
CREATE POLICY "Users can view their own role assignments"
    ON public.role_assignments FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_super_admin()
        OR public.can_manage_rbac(public.get_scope_site_id(scope_type, scope_id))
    );

-- INSERT: Only SuperAdmin or SiteAdmin of owning site can create assignments
CREATE POLICY "Admins can create role assignments"
    ON public.role_assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.can_manage_rbac(public.get_scope_site_id(scope_type, scope_id))
    );

-- UPDATE: Only SuperAdmin or SiteAdmin of owning site can update
CREATE POLICY "Admins can update role assignments"
    ON public.role_assignments FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin()
        OR public.can_manage_rbac(public.get_scope_site_id(scope_type, scope_id))
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.can_manage_rbac(public.get_scope_site_id(scope_type, scope_id))
    );

-- DELETE: Only SuperAdmin can hard delete
CREATE POLICY "Only super admin can delete role assignments"
    ON public.role_assignments FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- ============================================================
-- Add realtime for role_assignments (for UI updates)
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'role_assignments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.role_assignments;
    END IF;
END $$;