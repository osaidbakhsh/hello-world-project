-- ============================================================
-- PHASE 4: VMs UNDER CLUSTERS
-- ============================================================
-- VMs already have cluster_id (NOT NULL) - just need RLS updates
-- Strategy:
-- 1. Create can_access_vm and can_edit_vm functions
-- 2. Update VM RLS policies (remove is_admin)
-- ============================================================

-- ============================================================
-- SECURITY FUNCTIONS
-- ============================================================

-- can_access_vm: Uses cluster→domain chain
CREATE OR REPLACE FUNCTION public.can_access_vm(_vm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM vms v
      JOIN clusters c ON c.id = v.cluster_id
      WHERE v.id = _vm_id AND can_access_domain(c.domain_id)
    )
$$;

-- can_edit_vm: Uses cluster→domain chain
CREATE OR REPLACE FUNCTION public.can_edit_vm(_vm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM vms v
      JOIN clusters c ON c.id = v.cluster_id
      WHERE v.id = _vm_id AND can_edit_domain(c.domain_id)
    )
$$;

-- ============================================================
-- RLS POLICIES FOR vms (remove is_admin)
-- ============================================================
DROP POLICY IF EXISTS "Admins full access to vms" ON vms;
DROP POLICY IF EXISTS "Domain members can view vms" ON vms;
DROP POLICY IF EXISTS "Domain editors can manage vms" ON vms;
DROP POLICY IF EXISTS "vms_select" ON vms;
DROP POLICY IF EXISTS "vms_insert" ON vms;
DROP POLICY IF EXISTS "vms_update" ON vms;
DROP POLICY IF EXISTS "vms_delete" ON vms;

-- SELECT: Use can_access_vm
CREATE POLICY "vms_select" ON vms FOR SELECT
USING (can_access_vm(id));

-- INSERT: Check cluster access via domain chain
CREATE POLICY "vms_insert" ON vms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clusters c
    WHERE c.id = cluster_id AND can_edit_domain(c.domain_id)
  )
);

-- UPDATE: Use can_edit_vm
CREATE POLICY "vms_update" ON vms FOR UPDATE
USING (can_edit_vm(id))
WITH CHECK (can_edit_vm(id));

-- DELETE: Use domain admin via cluster chain
CREATE POLICY "vms_delete" ON vms FOR DELETE
USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM vms v
    JOIN clusters c ON c.id = v.cluster_id
    WHERE v.id = vms.id AND is_domain_admin(c.domain_id)
  )
);

-- ============================================================
-- Also update cluster_nodes RLS (remove is_admin if present)
-- ============================================================

-- First check and drop old policies
DROP POLICY IF EXISTS "Admins full access to cluster_nodes" ON cluster_nodes;
DROP POLICY IF EXISTS "Domain members can view cluster_nodes" ON cluster_nodes;
DROP POLICY IF EXISTS "Domain editors can manage cluster_nodes" ON cluster_nodes;
DROP POLICY IF EXISTS "cluster_nodes_select" ON cluster_nodes;
DROP POLICY IF EXISTS "cluster_nodes_insert" ON cluster_nodes;
DROP POLICY IF EXISTS "cluster_nodes_update" ON cluster_nodes;
DROP POLICY IF EXISTS "cluster_nodes_delete" ON cluster_nodes;

-- Create security functions for cluster_nodes
CREATE OR REPLACE FUNCTION public.can_access_node(_node_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM cluster_nodes n
      JOIN clusters c ON c.id = n.cluster_id
      WHERE n.id = _node_id AND can_access_domain(c.domain_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_node(_node_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM cluster_nodes n
      JOIN clusters c ON c.id = n.cluster_id
      WHERE n.id = _node_id AND can_edit_domain(c.domain_id)
    )
$$;

-- SELECT: Use can_access_node
CREATE POLICY "cluster_nodes_select" ON cluster_nodes FOR SELECT
USING (can_access_node(id));

-- INSERT: Check cluster access via domain chain
CREATE POLICY "cluster_nodes_insert" ON cluster_nodes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clusters c
    WHERE c.id = cluster_id AND can_edit_domain(c.domain_id)
  )
);

-- UPDATE: Use can_edit_node
CREATE POLICY "cluster_nodes_update" ON cluster_nodes FOR UPDATE
USING (can_edit_node(id))
WITH CHECK (can_edit_node(id));

-- DELETE: Use domain admin via cluster chain
CREATE POLICY "cluster_nodes_delete" ON cluster_nodes FOR DELETE
USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM cluster_nodes n
    JOIN clusters c ON c.id = n.cluster_id
    WHERE n.id = cluster_nodes.id AND is_domain_admin(c.domain_id)
  )
);