-- ============================================================
-- MIGRATION 1: Enable LTREE Extension + Rename branches→sites
-- ============================================================

-- 1. Enable LTREE extension for hierarchical queries
CREATE EXTENSION IF NOT EXISTS ltree;

-- 2. Create new site_role enum type (before renaming to avoid conflicts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'site_role') THEN
    CREATE TYPE site_role AS ENUM ('site_admin', 'site_operator', 'site_viewer');
  END IF;
END$$;

-- 3. Drop existing RLS policies on branches and branch_memberships
-- (they reference old table/column names)
DROP POLICY IF EXISTS "branches_delete" ON branches;
DROP POLICY IF EXISTS "branches_insert" ON branches;
DROP POLICY IF EXISTS "branches_select" ON branches;
DROP POLICY IF EXISTS "branches_update" ON branches;

DROP POLICY IF EXISTS "branch_memberships_delete" ON branch_memberships;
DROP POLICY IF EXISTS "branch_memberships_insert" ON branch_memberships;
DROP POLICY IF EXISTS "branch_memberships_select" ON branch_memberships;
DROP POLICY IF EXISTS "branch_memberships_update" ON branch_memberships;

-- 4. Rename tables
ALTER TABLE branches RENAME TO sites;
ALTER TABLE branch_memberships RENAME TO site_memberships;

-- 5. Rename columns in site_memberships
ALTER TABLE site_memberships RENAME COLUMN branch_id TO site_id;

-- 6. Add new site_role column and migrate data
ALTER TABLE site_memberships ADD COLUMN site_role_new site_role;

UPDATE site_memberships SET site_role_new = 
  CASE branch_role::text
    WHEN 'branch_admin' THEN 'site_admin'::site_role
    WHEN 'branch_operator' THEN 'site_operator'::site_role
    WHEN 'branch_viewer' THEN 'site_viewer'::site_role
    ELSE 'site_viewer'::site_role
  END;

ALTER TABLE site_memberships ALTER COLUMN site_role_new SET DEFAULT 'site_viewer'::site_role;
ALTER TABLE site_memberships DROP COLUMN branch_role;
ALTER TABLE site_memberships RENAME COLUMN site_role_new TO site_role;

-- 7. Rename column in domains
ALTER TABLE domains RENAME COLUMN branch_id TO site_id;

-- 8. Add hierarchy_path columns (LTREE)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS hierarchy_path ltree;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS hierarchy_path ltree;
ALTER TABLE datacenters ADD COLUMN IF NOT EXISTS hierarchy_path ltree;
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS hierarchy_path ltree;

-- 9. Create indexes for LTREE columns
CREATE INDEX IF NOT EXISTS idx_sites_hierarchy_path ON sites USING gist(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_domains_hierarchy_path ON domains USING gist(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_datacenters_hierarchy_path ON datacenters USING gist(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_clusters_hierarchy_path ON clusters USING gist(hierarchy_path);

-- 10. Update security functions to use new naming

-- can_access_site (renamed from can_access_branch)
CREATE OR REPLACE FUNCTION public.can_access_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM site_memberships sm
      WHERE sm.site_id = _site_id AND sm.profile_id = get_my_profile_id()
    );
$$;

-- can_manage_site (renamed from can_manage_branch)
CREATE OR REPLACE FUNCTION public.can_manage_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM site_memberships sm
      WHERE sm.site_id = _site_id 
        AND sm.profile_id = get_my_profile_id()
        AND sm.site_role = 'site_admin'
    );
$$;

-- Update can_access_domain to use site_id
CREATE OR REPLACE FUNCTION public.can_access_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.domain_id = _domain_id AND dm.profile_id = get_my_profile_id()
    )
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN site_memberships sm ON sm.site_id = d.site_id
      WHERE d.id = _domain_id AND sm.profile_id = get_my_profile_id()
    );
$$;

-- Update can_edit_domain to use site inheritance
CREATE OR REPLACE FUNCTION public.can_edit_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.domain_id = _domain_id 
        AND dm.profile_id = get_my_profile_id()
        AND (dm.can_edit = true OR dm.domain_role = 'domain_admin')
    )
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN site_memberships sm ON sm.site_id = d.site_id
      WHERE d.id = _domain_id 
        AND sm.profile_id = get_my_profile_id()
        AND sm.site_role IN ('site_admin', 'site_operator')
    );
$$;

-- Update is_domain_admin to include site_admin inheritance
CREATE OR REPLACE FUNCTION public.is_domain_admin(_domain_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.domain_id = _domain_id 
        AND dm.profile_id = get_my_profile_id()
        AND dm.domain_role = 'domain_admin'
    )
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN site_memberships sm ON sm.site_id = d.site_id
      WHERE d.id = _domain_id 
        AND sm.profile_id = get_my_profile_id()
        AND sm.site_role = 'site_admin'
    );
$$;

-- 11. Create new RLS policies for sites table
CREATE POLICY "sites_select" ON sites
FOR SELECT USING ((SELECT can_access_site(id)));

CREATE POLICY "sites_insert" ON sites
FOR INSERT WITH CHECK ((SELECT is_super_admin()));

CREATE POLICY "sites_update" ON sites
FOR UPDATE USING ((SELECT can_manage_site(id)))
WITH CHECK ((SELECT can_manage_site(id)));

CREATE POLICY "sites_delete" ON sites
FOR DELETE USING ((SELECT is_super_admin()));

-- 12. Create new RLS policies for site_memberships table
CREATE POLICY "site_memberships_select" ON site_memberships
FOR SELECT USING ((SELECT can_access_site(site_id)) OR profile_id = (SELECT get_my_profile_id()));

CREATE POLICY "site_memberships_insert" ON site_memberships
FOR INSERT WITH CHECK ((SELECT can_manage_site(site_id)));

CREATE POLICY "site_memberships_update" ON site_memberships
FOR UPDATE USING ((SELECT can_manage_site(site_id)))
WITH CHECK ((SELECT can_manage_site(site_id)));

CREATE POLICY "site_memberships_delete" ON site_memberships
FOR DELETE USING ((SELECT can_manage_site(site_id)));

-- 13. Update domains table RLS to use new function names
DROP POLICY IF EXISTS "domains_delete" ON domains;
DROP POLICY IF EXISTS "domains_insert" ON domains;
DROP POLICY IF EXISTS "domains_select" ON domains;
DROP POLICY IF EXISTS "domains_update" ON domains;

CREATE POLICY "domains_select" ON domains
FOR SELECT USING ((SELECT is_super_admin()) OR (SELECT can_access_domain(id)));

CREATE POLICY "domains_insert" ON domains
FOR INSERT WITH CHECK ((SELECT is_super_admin()) OR (SELECT can_manage_site(site_id)));

CREATE POLICY "domains_update" ON domains
FOR UPDATE USING ((SELECT is_super_admin()) OR (SELECT can_manage_site(site_id)))
WITH CHECK ((SELECT is_super_admin()) OR (SELECT can_manage_site(site_id)));

CREATE POLICY "domains_delete" ON domains
FOR DELETE USING ((SELECT is_super_admin()));

-- 14. Drop old branch-related functions (after policies are updated)
DROP FUNCTION IF EXISTS public.can_access_branch(uuid);
DROP FUNCTION IF EXISTS public.can_manage_branch(uuid);