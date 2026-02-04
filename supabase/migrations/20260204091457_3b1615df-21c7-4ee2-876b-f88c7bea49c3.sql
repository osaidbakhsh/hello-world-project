-- ============================================================
-- PHASE 3: SERVERS UNDER NETWORKS
-- ============================================================
-- Strategy:
-- 1. Create DEFAULT-NETWORK for each domain (under DEFAULT-CLUSTER)
-- 2. Assign orphan servers (network_id IS NULL) to first domain's DEFAULT-NETWORK
-- 3. Enforce NOT NULL on network_id
-- 4. Create can_access_server and can_edit_server functions
-- 5. Update server RLS policies (remove is_admin)
-- ============================================================

-- Step 1: Create DEFAULT-NETWORK for each domain (under their DEFAULT-CLUSTER)
INSERT INTO networks (name, cluster_id, domain_id, description)
SELECT 'DEFAULT-NETWORK', c.id, c.domain_id, 'Auto-created for orphan servers'
FROM clusters c
WHERE c.name = 'DEFAULT-CLUSTER'
AND NOT EXISTS (
  SELECT 1 FROM networks n 
  WHERE n.cluster_id = c.id AND n.name = 'DEFAULT-NETWORK'
)
ON CONFLICT DO NOTHING;

-- Step 2: Assign orphan servers to first domain's DEFAULT-NETWORK
-- (servers don't have domain_id, so assign to first domain alphabetically for determinism)
UPDATE servers
SET network_id = (
  SELECT n.id 
  FROM networks n
  JOIN clusters c ON c.id = n.cluster_id
  JOIN domains d ON d.id = c.domain_id
  WHERE n.name = 'DEFAULT-NETWORK' AND c.name = 'DEFAULT-CLUSTER'
  ORDER BY d.name ASC
  LIMIT 1
)
WHERE network_id IS NULL;

-- Step 3: Enforce NOT NULL on servers.network_id
ALTER TABLE servers ALTER COLUMN network_id SET NOT NULL;

-- Step 4: Add index on servers.network_id
CREATE INDEX IF NOT EXISTS idx_servers_network ON servers(network_id);

-- Step 5: Add FK constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_servers_network' AND table_name = 'servers'
  ) THEN
    ALTER TABLE servers ADD CONSTRAINT fk_servers_network 
      FOREIGN KEY (network_id) REFERENCES networks(id);
  END IF;
END$$;

-- ============================================================
-- SECURITY FUNCTIONS
-- ============================================================

-- can_access_server: Uses network→cluster→domain chain
CREATE OR REPLACE FUNCTION public.can_access_server(_server_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM servers srv
      JOIN networks net ON net.id = srv.network_id
      JOIN clusters clus ON clus.id = net.cluster_id
      WHERE srv.id = _server_id AND can_access_domain(clus.domain_id)
    )
$$;

-- can_edit_server: Uses network→cluster→domain chain
CREATE OR REPLACE FUNCTION public.can_edit_server(_server_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM servers srv
      JOIN networks net ON net.id = srv.network_id
      JOIN clusters clus ON clus.id = net.cluster_id
      WHERE srv.id = _server_id AND can_edit_domain(clus.domain_id)
    )
$$;

-- ============================================================
-- RLS POLICIES FOR servers (remove is_admin)
-- ============================================================
DROP POLICY IF EXISTS "Admins can do all on servers" ON servers;
DROP POLICY IF EXISTS "servers_select_v2" ON servers;
DROP POLICY IF EXISTS "servers_insert_v2" ON servers;
DROP POLICY IF EXISTS "servers_update_v2" ON servers;
DROP POLICY IF EXISTS "servers_delete_v2" ON servers;
DROP POLICY IF EXISTS "servers_select" ON servers;
DROP POLICY IF EXISTS "servers_insert" ON servers;
DROP POLICY IF EXISTS "servers_update" ON servers;
DROP POLICY IF EXISTS "servers_delete" ON servers;

-- SELECT: Use can_access_server
CREATE POLICY "servers_select" ON servers FOR SELECT
USING (can_access_server(id));

-- INSERT: Check network access via cluster→domain chain
CREATE POLICY "servers_insert" ON servers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM networks n
    JOIN clusters c ON c.id = n.cluster_id
    WHERE n.id = network_id AND can_edit_domain(c.domain_id)
  )
);

-- UPDATE: Use can_edit_server
CREATE POLICY "servers_update" ON servers FOR UPDATE
USING (can_edit_server(id))
WITH CHECK (can_edit_server(id));

-- DELETE: Use can_edit_server (or domain_admin via chain)
CREATE POLICY "servers_delete" ON servers FOR DELETE
USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM servers srv
    JOIN networks net ON net.id = srv.network_id
    JOIN clusters clus ON clus.id = net.cluster_id
    WHERE srv.id = servers.id AND is_domain_admin(clus.domain_id)
  )
);