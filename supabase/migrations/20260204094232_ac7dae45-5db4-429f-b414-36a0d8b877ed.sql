-- ============================================================
-- MIGRATION 3: Unified Security Function (check_resource_access)
-- ============================================================

-- Create the unified check_resource_access function
-- This function traverses the hierarchy and checks user permissions
CREATE OR REPLACE FUNCTION public.check_resource_access(
  _resource_id uuid,
  _resource_type text,
  _required_role text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Get domain_id and site_id based on resource type
  CASE _resource_type
    WHEN 'site' THEN
      _site_id := _resource_id;
      _domain_id := NULL;
      
    WHEN 'domain' THEN
      SELECT site_id INTO _site_id FROM domains WHERE id = _resource_id;
      _domain_id := _resource_id;
      
    WHEN 'datacenter' THEN
      SELECT d.id, d.site_id INTO _domain_id, _site_id 
      FROM datacenters dc 
      JOIN domains d ON d.id = dc.domain_id 
      WHERE dc.id = _resource_id;
      
    WHEN 'cluster' THEN
      SELECT d.id, d.site_id INTO _domain_id, _site_id 
      FROM clusters c 
      JOIN datacenters dc ON dc.id = c.datacenter_id
      JOIN domains d ON d.id = dc.domain_id 
      WHERE c.id = _resource_id;
      
    WHEN 'network' THEN
      SELECT d.id, d.site_id INTO _domain_id, _site_id 
      FROM networks n
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      JOIN domains d ON d.id = dc.domain_id 
      WHERE n.id = _resource_id;
      
    WHEN 'node' THEN
      SELECT d.id, d.site_id INTO _domain_id, _site_id 
      FROM cluster_nodes cn
      JOIN clusters c ON c.id = cn.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      JOIN domains d ON d.id = dc.domain_id 
      WHERE cn.id = _resource_id;
      
    WHEN 'vm' THEN
      SELECT d.id, d.site_id INTO _domain_id, _site_id 
      FROM vms v
      JOIN clusters c ON c.id = v.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      JOIN domains d ON d.id = dc.domain_id 
      WHERE v.id = _resource_id;
      
    WHEN 'server' THEN
      SELECT d.id, d.site_id INTO _domain_id, _site_id 
      FROM servers s
      JOIN networks n ON n.id = s.network_id
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      JOIN domains d ON d.id = dc.domain_id 
      WHERE s.id = _resource_id;
      
    ELSE
      RETURN FALSE;
  END CASE;
  
  -- Check site membership first (highest priority)
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
  
  -- Check domain membership
  IF _domain_id IS NOT NULL THEN
    SELECT CASE 
      WHEN dm.domain_role = 'domain_admin' THEN 3
      WHEN dm.can_edit = true THEN 2
      ELSE 1
    END INTO _user_level
    FROM domain_memberships dm
    WHERE dm.domain_id = _domain_id AND dm.profile_id = _user_profile_id;
    
    IF COALESCE(_user_level, 0) >= _required_level THEN RETURN TRUE; END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create convenience wrapper functions for common checks
CREATE OR REPLACE FUNCTION public.can_view_resource(_resource_id uuid, _resource_type text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_resource_access(_resource_id, _resource_type, 'viewer');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_resource(_resource_id uuid, _resource_type text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_resource_access(_resource_id, _resource_type, 'operator');
$$;

CREATE OR REPLACE FUNCTION public.can_admin_resource(_resource_id uuid, _resource_type text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_resource_access(_resource_id, _resource_type, 'admin');
$$;

-- Update network functions to use proper hierarchy chain
CREATE OR REPLACE FUNCTION public.can_access_network(_network_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM networks n
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE n.id = _network_id AND can_access_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_network(_network_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM networks n
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE n.id = _network_id AND can_edit_domain(dc.domain_id)
    );
$$;

-- Update VM functions to use proper hierarchy chain  
CREATE OR REPLACE FUNCTION public.can_access_vm(_vm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM vms v
      JOIN clusters c ON c.id = v.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE v.id = _vm_id AND can_access_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_vm(_vm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM vms v
      JOIN clusters c ON c.id = v.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE v.id = _vm_id AND can_edit_domain(dc.domain_id)
    );
$$;

-- Update node functions to use proper hierarchy chain
CREATE OR REPLACE FUNCTION public.can_access_node(_node_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM cluster_nodes cn
      JOIN clusters c ON c.id = cn.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE cn.id = _node_id AND can_access_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_node(_node_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM cluster_nodes cn
      JOIN clusters c ON c.id = cn.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE cn.id = _node_id AND can_edit_domain(dc.domain_id)
    );
$$;

-- Update server functions to use proper hierarchy chain
CREATE OR REPLACE FUNCTION public.can_access_server(_server_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM servers s
      JOIN networks n ON n.id = s.network_id
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE s.id = _server_id AND can_access_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_server(_server_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM servers s
      JOIN networks n ON n.id = s.network_id
      JOIN clusters c ON c.id = n.cluster_id
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE s.id = _server_id AND can_edit_domain(dc.domain_id)
    );
$$;