
-- ============================================================
-- PHASE A: Schema changes for unified inventory linkage
-- ============================================================

-- A2: Add resource_id linkage to servers table
ALTER TABLE public.servers 
ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL;

-- Create unique index for 1:1 linkage
CREATE UNIQUE INDEX IF NOT EXISTS servers_resource_id_unique ON public.servers(resource_id) WHERE resource_id IS NOT NULL;

-- A3: Add unique constraint on resources for idempotent upsert
-- source + external_id must be unique per site
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_site_source_external_unique'
  ) THEN
    ALTER TABLE public.resources 
    ADD CONSTRAINT resources_site_source_external_unique 
    UNIQUE (site_id, source, external_id);
  END IF;
END $$;

-- ============================================================
-- PHASE A.4: Backfill migration function (idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION backfill_servers_to_resources()
RETURNS TABLE(
  servers_processed int,
  resources_created int,
  resources_updated int,
  resources_linked int
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_servers_processed int := 0;
  v_created int := 0;
  v_updated int := 0;
  v_linked int := 0;
  v_server RECORD;
  v_site_id uuid;
  v_domain_id uuid;
  v_resource_id uuid;
  v_external_id text;
  v_status resource_status;
BEGIN
  FOR v_server IN 
    SELECT s.*, 
           n.domain_id as network_domain_id,
           d.site_id as derived_site_id
    FROM servers s
    LEFT JOIN networks n ON n.id = s.network_id
    LEFT JOIN domains d ON d.id = n.domain_id
  LOOP
    v_servers_processed := v_servers_processed + 1;
    v_external_id := 'server:' || v_server.id::text;
    v_site_id := v_server.derived_site_id;
    v_domain_id := COALESCE(v_server.domain_id, v_server.network_domain_id);
    
    -- Skip if site_id cannot be derived
    IF v_site_id IS NULL THEN
      RAISE WARNING 'Cannot derive site_id for server %', v_server.id;
      CONTINUE;
    END IF;
    
    -- Map status: servers use 'active'/'inactive'/'maintenance', resources use enum
    v_status := CASE v_server.status
      WHEN 'active' THEN 'online'::resource_status
      WHEN 'inactive' THEN 'offline'::resource_status
      WHEN 'maintenance' THEN 'maintenance'::resource_status
      ELSE 'unknown'::resource_status
    END;
    
    -- Check if server already linked
    IF v_server.resource_id IS NOT NULL THEN
      -- Update existing resource
      UPDATE resources SET
        name = v_server.name,
        hostname = v_server.name,  -- Use name as hostname if not separate
        primary_ip = v_server.ip_address,
        os = v_server.operating_system,
        status = v_status,
        environment = v_server.environment,
        owner_team = v_server.owner,
        notes = v_server.notes,
        is_backed_up = COALESCE(v_server.is_backed_up_by_veeam, false),
        backup_policy = v_server.backup_frequency,
        vendor = v_server.vendor,
        model = v_server.model,
        serial_number = v_server.serial_number,
        warranty_end = v_server.warranty_end,
        eol_date = v_server.eol_date,
        eos_date = v_server.eos_date,
        department = v_server.beneficiary_department,
        application = v_server.primary_application,
        updated_at = now()
      WHERE id = v_server.resource_id;
      v_updated := v_updated + 1;
    ELSE
      -- Check if resource exists by external_id (idempotent)
      SELECT id INTO v_resource_id
      FROM resources
      WHERE site_id = v_site_id 
        AND source = 'servers_migration' 
        AND external_id = v_external_id;
      
      IF v_resource_id IS NOT NULL THEN
        -- Update existing resource
        UPDATE resources SET
          name = v_server.name,
          hostname = v_server.name,
          primary_ip = v_server.ip_address,
          os = v_server.operating_system,
          domain_id = v_domain_id,
          status = v_status,
          environment = v_server.environment,
          owner_team = v_server.owner,
          notes = v_server.notes,
          is_backed_up = COALESCE(v_server.is_backed_up_by_veeam, false),
          backup_policy = v_server.backup_frequency,
          vendor = v_server.vendor,
          model = v_server.model,
          serial_number = v_server.serial_number,
          warranty_end = v_server.warranty_end,
          eol_date = v_server.eol_date,
          eos_date = v_server.eos_date,
          department = v_server.beneficiary_department,
          application = v_server.primary_application,
          updated_at = now()
        WHERE id = v_resource_id;
        v_updated := v_updated + 1;
      ELSE
        -- Insert new resource
        INSERT INTO resources (
          site_id, domain_id, resource_type, name, hostname, primary_ip, os,
          status, criticality, environment, owner_team, notes,
          is_backed_up, backup_policy, vendor, model, serial_number,
          warranty_end, eol_date, eos_date, department, application,
          source, external_id, created_by
        ) VALUES (
          v_site_id, v_domain_id, 'physical_server', v_server.name, v_server.name, 
          v_server.ip_address, v_server.operating_system,
          v_status, 'medium', v_server.environment, v_server.owner, v_server.notes,
          COALESCE(v_server.is_backed_up_by_veeam, false), v_server.backup_frequency,
          v_server.vendor, v_server.model, v_server.serial_number,
          v_server.warranty_end, v_server.eol_date, v_server.eos_date,
          v_server.beneficiary_department, v_server.primary_application,
          'servers_migration', v_external_id, v_server.created_by
        ) RETURNING id INTO v_resource_id;
        v_created := v_created + 1;
      END IF;
      
      -- Link server to resource
      UPDATE servers SET resource_id = v_resource_id WHERE id = v_server.id;
      v_linked := v_linked + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_servers_processed, v_created, v_updated, v_linked;
END;
$$;

-- Execute the backfill immediately
SELECT * FROM backfill_servers_to_resources();

-- ============================================================
-- Add index for efficient filtering by resource_type
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_resources_type_site ON resources(resource_type, site_id);
CREATE INDEX IF NOT EXISTS idx_resources_type_domain ON resources(resource_type, domain_id);
