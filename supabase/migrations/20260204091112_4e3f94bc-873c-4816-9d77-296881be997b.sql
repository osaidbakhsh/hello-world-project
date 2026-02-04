-- ============================================================
-- PHASE 2: NETWORKS UNDER CLUSTERS
-- ============================================================
-- Fixes: 
-- 1. Use 'other' for cluster_type (valid CHECK constraint value)
-- 2. Qualify all column references to avoid ambiguity
-- ============================================================

-- Step 1: Add UNIQUE constraint on clusters(domain_id, name) for idempotent default cluster creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clusters_domain_name_unique' AND table_name = 'clusters'
  ) THEN
    ALTER TABLE clusters ADD CONSTRAINT clusters_domain_name_unique UNIQUE (domain_id, name);
  END IF;
END$$;

-- Step 2: Add cluster_id to networks (nullable first)
ALTER TABLE networks ADD COLUMN IF NOT EXISTS cluster_id uuid;

-- Step 3: Create DEFAULT-CLUSTER for each domain that has networks (idempotent)
INSERT INTO clusters (domain_id, name, cluster_type, notes)
SELECT DISTINCT 
  n.domain_id,
  'DEFAULT-CLUSTER',
  'other',
  'Auto-created for existing networks'
FROM networks n
WHERE NOT EXISTS (
  SELECT 1 FROM clusters c 
  WHERE c.domain_id = n.domain_id AND c.name = 'DEFAULT-CLUSTER'
)
ON CONFLICT (domain_id, name) DO NOTHING;

-- Step 4: Backfill networks.cluster_id using DEFAULT-CLUSTER (deterministic)
UPDATE networks n
SET cluster_id = (
  SELECT c.id FROM clusters c 
  WHERE c.domain_id = n.domain_id AND c.name = 'DEFAULT-CLUSTER'
)
WHERE n.cluster_id IS NULL;

-- Step 5: For networks in domains without DEFAULT-CLUSTER, create one and assign
DO $$
DECLARE
  _network RECORD;
  _cluster_id uuid;
BEGIN
  FOR _network IN 
    SELECT net.id, net.domain_id 
    FROM networks net 
    WHERE net.cluster_id IS NULL
  LOOP
    INSERT INTO clusters (domain_id, name, cluster_type, notes)
    VALUES (_network.domain_id, 'DEFAULT-CLUSTER', 'other', 'Auto-created for network backfill')
    ON CONFLICT (domain_id, name) DO NOTHING;
    
    SELECT clus.id INTO _cluster_id FROM clusters clus 
    WHERE clus.domain_id = _network.domain_id AND clus.name = 'DEFAULT-CLUSTER';
    
    UPDATE networks SET cluster_id = _cluster_id WHERE networks.id = _network.id;
  END LOOP;
END$$;

-- Step 6: Verify no NULL cluster_id remains before enforcing NOT NULL
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM networks WHERE networks.cluster_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL: % networks still have NULL cluster_id', null_count;
  END IF;
END$$;

-- Step 7: Enforce NOT NULL on networks.cluster_id
ALTER TABLE networks ALTER COLUMN cluster_id SET NOT NULL;

-- Step 8: Add FK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_networks_cluster' AND table_name = 'networks'
  ) THEN
    ALTER TABLE networks ADD CONSTRAINT fk_networks_cluster 
      FOREIGN KEY (cluster_id) REFERENCES clusters(id);
  END IF;
END$$;

-- Step 9: Add index on networks.cluster_id
CREATE INDEX IF NOT EXISTS idx_networks_cluster ON networks(cluster_id);

-- ============================================================
-- SECURITY FUNCTIONS: can_access_network, can_edit_network
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_network(_network_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM networks net
      JOIN clusters clus ON clus.id = net.cluster_id
      WHERE net.id = _network_id AND can_access_domain(clus.domain_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_network(_network_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM networks net
      JOIN clusters clus ON clus.id = net.cluster_id
      WHERE net.id = _network_id AND can_edit_domain(clus.domain_id)
    )
$$;

-- ============================================================
-- UPDATE networks RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Admins full access to networks" ON networks;
DROP POLICY IF EXISTS "Domain members can view networks" ON networks;
DROP POLICY IF EXISTS "networks_select" ON networks;
DROP POLICY IF EXISTS "networks_insert" ON networks;
DROP POLICY IF EXISTS "networks_update" ON networks;
DROP POLICY IF EXISTS "networks_delete" ON networks;

CREATE POLICY "networks_select" ON networks FOR SELECT
USING (is_super_admin() OR can_access_network(networks.id));

CREATE POLICY "networks_insert" ON networks FOR INSERT
WITH CHECK (
  is_super_admin() 
  OR EXISTS (
    SELECT 1 FROM clusters clus 
    WHERE clus.id = networks.cluster_id AND can_edit_domain(clus.domain_id)
  )
);

CREATE POLICY "networks_update" ON networks FOR UPDATE
USING (is_super_admin() OR can_edit_network(networks.id))
WITH CHECK (is_super_admin() OR can_edit_network(networks.id));

CREATE POLICY "networks_delete" ON networks FOR DELETE
USING (
  is_super_admin() 
  OR EXISTS (
    SELECT 1 FROM clusters clus 
    WHERE clus.id = networks.cluster_id AND is_domain_admin(clus.domain_id)
  )
);