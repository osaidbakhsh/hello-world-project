-- =====================================================
-- Phase 1: Hierarchy Refactor Migration
-- New model: Site → Datacenter → Cluster → Node → Domain → VM
-- =====================================================

-- 1.1 Add site_id to datacenters (currently references domain_id)
ALTER TABLE datacenters ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill site_id from existing domain relationship
UPDATE datacenters dc
SET site_id = d.site_id
FROM domains d
WHERE dc.domain_id = d.id AND dc.site_id IS NULL;

-- 1.2 Add node_id to domains (domains will be under nodes)
ALTER TABLE domains ADD COLUMN IF NOT EXISTS node_id UUID REFERENCES cluster_nodes(id);

-- Note: Existing domains will have NULL node_id initially
-- Admin will need to reassign domains to nodes via UI

-- 1.3 Add domain_id to servers (VMs belong directly to domains)
ALTER TABLE servers ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);

-- Backfill domain_id from network relationship
UPDATE servers s
SET domain_id = n.domain_id
FROM networks n
WHERE s.network_id = n.id AND s.domain_id IS NULL;

-- 1.4 Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_datacenters_site_id ON datacenters(site_id);
CREATE INDEX IF NOT EXISTS idx_domains_node_id ON domains(node_id);
CREATE INDEX IF NOT EXISTS idx_servers_domain_id ON servers(domain_id);

-- 1.5 Update RLS helper functions for new hierarchy path

-- Update can_access_domain to work with node path
CREATE OR REPLACE FUNCTION public.can_access_domain(_domain_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_super_admin()
    -- Direct domain membership
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      WHERE dm.domain_id = _domain_id AND dm.profile_id = get_my_profile_id()
    )
    -- Via site membership (for domains under sites via node path)
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN cluster_nodes cn ON cn.id = d.node_id
      JOIN clusters c ON c.id = cn.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      JOIN site_memberships sm ON sm.site_id = dc.site_id
      WHERE d.id = _domain_id AND sm.profile_id = get_my_profile_id()
    )
    -- Legacy: via site_id on domains (for unmigrated domains)
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN site_memberships sm ON sm.site_id = d.site_id
      WHERE d.id = _domain_id AND sm.profile_id = get_my_profile_id()
    );
$function$;

-- Update can_access_server to use domain path
CREATE OR REPLACE FUNCTION public.can_access_server(_server_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_super_admin()
    -- Via domain_id (new path)
    OR EXISTS (
      SELECT 1 FROM servers s
      WHERE s.id = _server_id AND s.domain_id IS NOT NULL AND can_access_domain(s.domain_id)
    )
    -- Legacy: via network path
    OR EXISTS (
      SELECT 1 FROM servers s
      JOIN networks n ON n.id = s.network_id
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE s.id = _server_id AND can_access_domain(dc.domain_id)
    );
$function$;

-- Update can_edit_server to use domain path
CREATE OR REPLACE FUNCTION public.can_edit_server(_server_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_super_admin()
    -- Via domain_id (new path)
    OR EXISTS (
      SELECT 1 FROM servers s
      WHERE s.id = _server_id AND s.domain_id IS NOT NULL AND can_edit_domain(s.domain_id)
    )
    -- Legacy: via network path
    OR EXISTS (
      SELECT 1 FROM servers s
      JOIN networks n ON n.id = s.network_id
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE s.id = _server_id AND can_edit_domain(dc.domain_id)
    );
$function$;

-- Update can_access_datacenter to use site_id
CREATE OR REPLACE FUNCTION public.can_access_datacenter(_dc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_super_admin()
    -- Via site_id (new path)
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      JOIN site_memberships sm ON sm.site_id = dc.site_id
      WHERE dc.id = _dc_id AND sm.profile_id = get_my_profile_id()
    )
    -- Legacy: via domain_id
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      WHERE dc.id = _dc_id AND dc.domain_id IS NOT NULL AND can_access_domain(dc.domain_id)
    );
$function$;

-- Update can_edit_datacenter to use site_id
CREATE OR REPLACE FUNCTION public.can_edit_datacenter(_dc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_super_admin()
    -- Via site membership with admin role
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      JOIN site_memberships sm ON sm.site_id = dc.site_id
      WHERE dc.id = _dc_id 
        AND sm.profile_id = get_my_profile_id()
        AND sm.site_role IN ('site_admin', 'site_operator')
    )
    -- Legacy: via domain_id
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      WHERE dc.id = _dc_id AND dc.domain_id IS NOT NULL AND can_edit_domain(dc.domain_id)
    );
$function$;

-- Update check_resource_access for new hierarchy
CREATE OR REPLACE FUNCTION public.check_resource_access(_resource_id uuid, _resource_type text, _required_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _domain_id uuid;
  _site_id uuid;
  _user_profile_id uuid;
  _required_level int;
  _user_level int := 0;
BEGIN
  -- Super admin bypass
  IF is_super_admin() THEN RETURN TRUE; END IF;
  
  -- Get current user's profile ID
  _user_profile_id := get_my_profile_id();
  IF _user_profile_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Map required role to numeric level
  _required_level := CASE _required_role
    WHEN 'viewer' THEN 1
    WHEN 'operator' THEN 2
    WHEN 'admin' THEN 3
    ELSE 1
  END;
  
  -- Get site_id based on resource type (new hierarchy: Site → DC → Cluster → Node → Domain → VM)
  CASE _resource_type
    WHEN 'site' THEN
      _site_id := _resource_id;
      
    WHEN 'datacenter' THEN
      SELECT dc.site_id INTO _site_id FROM datacenters dc WHERE dc.id = _resource_id;
      
    WHEN 'cluster' THEN
      SELECT dc.site_id INTO _site_id 
      FROM clusters c 
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE c.id = _resource_id;
      
    WHEN 'node' THEN
      SELECT dc.site_id INTO _site_id 
      FROM cluster_nodes cn
      JOIN clusters c ON c.id = cn.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE cn.id = _resource_id;
      
    WHEN 'domain' THEN
      -- Domain can be under node (new) or site (legacy)
      SELECT COALESCE(
        (SELECT dc.site_id FROM domains d 
         JOIN cluster_nodes cn ON cn.id = d.node_id
         JOIN clusters c ON c.id = cn.cluster_id
         JOIN datacenters dc ON dc.id = c.datacenter_id
         WHERE d.id = _resource_id),
        (SELECT d.site_id FROM domains d WHERE d.id = _resource_id)
      ) INTO _site_id;
      
    WHEN 'vm', 'server' THEN
      -- VM can be under domain (new) or network (legacy)
      SELECT COALESCE(
        (SELECT dc.site_id FROM servers s
         JOIN domains d ON d.id = s.domain_id
         JOIN cluster_nodes cn ON cn.id = d.node_id
         JOIN clusters c ON c.id = cn.cluster_id
         JOIN datacenters dc ON dc.id = c.datacenter_id
         WHERE s.id = _resource_id),
        (SELECT dc.site_id FROM servers s
         JOIN networks n ON n.id = s.network_id
         JOIN clusters c ON c.id = n.cluster_id
         JOIN datacenters dc ON dc.id = c.datacenter_id
         WHERE s.id = _resource_id)
      ) INTO _site_id;
      
    WHEN 'network' THEN
      SELECT dc.site_id INTO _site_id 
      FROM networks n
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE n.id = _resource_id;
      
    ELSE
      RETURN FALSE;
  END CASE;
  
  -- Check site membership
  IF _site_id IS NOT NULL THEN
    SELECT CASE sm.site_role
      WHEN 'site_admin' THEN 3
      WHEN 'site_operator' THEN 2
      WHEN 'site_viewer' THEN 1
      ELSE 0
    END INTO _user_level
    FROM site_memberships sm
    WHERE sm.site_id = _site_id AND sm.profile_id = _user_profile_id;
    
    IF COALESCE(_user_level, 0) >= _required_level THEN RETURN TRUE; END IF;
  END IF;
  
  RETURN FALSE;
END;
$function$;