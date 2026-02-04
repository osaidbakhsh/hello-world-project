-- ============================================================
-- MIGRATION 2: Enforce Clusters → Datacenters Relationship
-- ============================================================

-- 1. Create DEFAULT-DATACENTER for each domain that has clusters without datacenter_id
INSERT INTO datacenters (domain_id, name, notes, location)
SELECT DISTINCT c.domain_id, 'DEFAULT-DATACENTER', 'Auto-created for hierarchy enforcement', 'Default Location'
FROM clusters c
WHERE c.datacenter_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM datacenters dc 
    WHERE dc.domain_id = c.domain_id AND dc.name = 'DEFAULT-DATACENTER'
  );

-- 2. Backfill clusters.datacenter_id for any NULL values
UPDATE clusters c
SET datacenter_id = (
  SELECT dc.id FROM datacenters dc 
  WHERE dc.domain_id = c.domain_id 
  AND dc.name = 'DEFAULT-DATACENTER'
  LIMIT 1
)
WHERE c.datacenter_id IS NULL;

-- 3. For any remaining clusters without datacenter_id, create a datacenter first
-- (handles edge case where domain has no DEFAULT-DATACENTER yet)
INSERT INTO datacenters (domain_id, name, notes, location)
SELECT DISTINCT c.domain_id, 'DEFAULT-DATACENTER', 'Auto-created for hierarchy enforcement', 'Default Location'
FROM clusters c
WHERE c.datacenter_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM datacenters dc 
    WHERE dc.domain_id = c.domain_id AND dc.name = 'DEFAULT-DATACENTER'
  );

-- Update again after creating missing datacenters
UPDATE clusters c
SET datacenter_id = (
  SELECT dc.id FROM datacenters dc 
  WHERE dc.domain_id = c.domain_id 
  LIMIT 1
)
WHERE c.datacenter_id IS NULL;

-- 4. Now enforce NOT NULL constraint (only if all clusters have datacenter_id)
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM clusters WHERE datacenter_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE clusters ALTER COLUMN datacenter_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Cannot set NOT NULL: % clusters still have NULL datacenter_id', null_count;
  END IF;
END$$;

-- 5. Add FK constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clusters_datacenter_id_fkey_strict' 
    AND table_name = 'clusters'
  ) THEN
    -- Drop old FK if exists to recreate with proper name
    ALTER TABLE clusters DROP CONSTRAINT IF EXISTS clusters_datacenter_id_fkey;
    ALTER TABLE clusters ADD CONSTRAINT clusters_datacenter_id_fkey 
      FOREIGN KEY (datacenter_id) REFERENCES datacenters(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- 6. Update datacenter access functions to use hierarchy
CREATE OR REPLACE FUNCTION public.can_access_datacenter(_dc_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      WHERE dc.id = _dc_id AND can_access_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_datacenter(_dc_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      WHERE dc.id = _dc_id AND can_edit_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_datacenter_admin(_dc_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM datacenters dc 
      WHERE dc.id = _dc_id AND is_domain_admin(dc.domain_id)
    );
$$;

-- 7. Update cluster access functions to include datacenter chain
CREATE OR REPLACE FUNCTION public.can_access_cluster(_cluster_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM clusters c 
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE c.id = _cluster_id AND can_access_domain(dc.domain_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_cluster(_cluster_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM clusters c 
      JOIN datacenters dc ON dc.id = c.datacenter_id
      WHERE c.id = _cluster_id AND can_edit_domain(dc.domain_id)
    );
$$;

-- 8. Refactor datacenters RLS to use hierarchical functions instead of is_admin()
DROP POLICY IF EXISTS "Admins full access to datacenters" ON datacenters;
DROP POLICY IF EXISTS "Domain editors can manage datacenters" ON datacenters;
DROP POLICY IF EXISTS "Domain members can view datacenters" ON datacenters;

CREATE POLICY "datacenters_select" ON datacenters
FOR SELECT USING ((SELECT can_access_datacenter(id)));

CREATE POLICY "datacenters_insert" ON datacenters
FOR INSERT WITH CHECK ((SELECT can_edit_domain(domain_id)));

CREATE POLICY "datacenters_update" ON datacenters
FOR UPDATE USING ((SELECT can_edit_datacenter(id)))
WITH CHECK ((SELECT can_edit_datacenter(id)));

CREATE POLICY "datacenters_delete" ON datacenters
FOR DELETE USING ((SELECT is_datacenter_admin(id)));

-- 9. Refactor clusters RLS to use proper hierarchy
DROP POLICY IF EXISTS "Domain editors can manage clusters" ON clusters;
DROP POLICY IF EXISTS "clusters_delete" ON clusters;
DROP POLICY IF EXISTS "clusters_insert" ON clusters;
DROP POLICY IF EXISTS "clusters_select" ON clusters;
DROP POLICY IF EXISTS "clusters_update" ON clusters;

CREATE POLICY "clusters_select" ON clusters
FOR SELECT USING ((SELECT can_access_cluster(id)));

CREATE POLICY "clusters_insert" ON clusters
FOR INSERT WITH CHECK ((SELECT can_edit_datacenter(datacenter_id)));

CREATE POLICY "clusters_update" ON clusters
FOR UPDATE USING ((SELECT can_edit_cluster(id)))
WITH CHECK ((SELECT can_edit_cluster(id)));

CREATE POLICY "clusters_delete" ON clusters
FOR DELETE USING ((SELECT is_super_admin()) OR EXISTS (
  SELECT 1 FROM clusters c 
  JOIN datacenters dc ON dc.id = c.datacenter_id
  WHERE c.id = clusters.id AND is_domain_admin(dc.domain_id)
));