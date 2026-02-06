-- ============================================================
-- PHASE B/C: Transactional RPCs + Flattened View + RLS Hardening
-- ============================================================

-- Part 1: Create flattened server inventory view
-- Uses security_invoker to inherit RLS from underlying tables
CREATE OR REPLACE VIEW public.server_inventory_view
WITH (security_invoker = true)
AS
SELECT 
  -- Primary key: use resource.id as canonical
  r.id,
  r.id AS resource_id,
  s.id AS server_id,
  
  -- Scope
  r.site_id,
  COALESCE(r.domain_id, s.domain_id) AS domain_id,
  s.network_id,
  
  -- Identity (from resources - source of truth)
  r.name,
  r.hostname,
  r.primary_ip AS ip_address,
  r.os AS operating_system,
  
  -- Status (from resources - source of truth)
  r.status::text AS status,
  r.criticality::text AS criticality,
  r.environment,
  
  -- Ownership (from resources - source of truth)
  r.owner_team AS owner,
  
  -- System specs (prefer resources, fallback to servers legacy)
  COALESCE(r.cpu_cores::text, s.cpu) AS cpu,
  COALESCE(
    CASE WHEN r.ram_gb IS NOT NULL THEN r.ram_gb::text || ' GB' ELSE NULL END, 
    s.ram
  ) AS ram,
  COALESCE(
    CASE WHEN r.storage_gb IS NOT NULL THEN r.storage_gb::text || ' GB' ELSE NULL END, 
    s.disk_space
  ) AS disk_space,
  
  -- Asset lifecycle (from resources - source of truth)
  r.vendor,
  r.model,
  r.serial_number,
  r.warranty_end,
  r.eol_date,
  r.eos_date,
  
  -- Backup summary (from resources - source of truth)
  r.is_backed_up,
  r.backup_policy,
  
  -- Server-specific (from servers - specialized details)
  s.beneficiary_department,
  s.primary_application,
  s.business_owner,
  s.is_backed_up_by_veeam,
  s.backup_frequency,
  s.backup_job_name,
  s.purchase_date,
  s.contract_id,
  s.support_level,
  s.server_role,
  s.rpo_hours,
  s.rto_hours,
  s.last_restore_test,
  s.responsible_user,
  
  -- Metadata
  r.notes,
  r.tags,
  r.created_at,
  r.updated_at,
  r.created_by,
  
  -- Joined names for display
  n.name AS network_name,
  d.name AS domain_name,
  site.name AS site_name
  
FROM resources r
INNER JOIN servers s ON s.resource_id = r.id
LEFT JOIN networks n ON n.id = s.network_id
LEFT JOIN domains d ON d.id = COALESCE(r.domain_id, s.domain_id)
LEFT JOIN sites site ON site.id = r.site_id
WHERE r.resource_type = 'physical_server';

-- Add comment for documentation
COMMENT ON VIEW public.server_inventory_view IS 
'Flattened read model joining resources + servers for the Servers page. Uses security_invoker to respect RLS.';

-- Part 2: Create upsert_physical_server RPC (atomic dual-write)
CREATE OR REPLACE FUNCTION public.upsert_physical_server(
  -- Site/Domain scope (site_id derived from network if not provided)
  p_network_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL,
  p_domain_id uuid DEFAULT NULL,
  
  -- Identity
  p_name text DEFAULT NULL,
  p_hostname text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_operating_system text DEFAULT NULL,
  
  -- Status
  p_status text DEFAULT 'unknown',
  p_criticality text DEFAULT NULL,
  p_environment text DEFAULT NULL,
  
  -- Ownership
  p_owner text DEFAULT NULL,
  p_responsible_user text DEFAULT NULL,
  
  -- System specs
  p_cpu text DEFAULT NULL,
  p_ram text DEFAULT NULL,
  p_disk_space text DEFAULT NULL,
  
  -- Asset lifecycle
  p_vendor text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial_number text DEFAULT NULL,
  p_warranty_end date DEFAULT NULL,
  p_eol_date date DEFAULT NULL,
  p_eos_date date DEFAULT NULL,
  p_purchase_date date DEFAULT NULL,
  
  -- Backup
  p_is_backed_up boolean DEFAULT false,
  p_backup_policy text DEFAULT NULL,
  p_is_backed_up_by_veeam boolean DEFAULT false,
  p_backup_frequency text DEFAULT NULL,
  p_backup_job_name text DEFAULT NULL,
  
  -- Server-specific
  p_beneficiary_department text DEFAULT NULL,
  p_primary_application text DEFAULT NULL,
  p_business_owner text DEFAULT NULL,
  p_contract_id text DEFAULT NULL,
  p_support_level text DEFAULT 'standard',
  p_server_role text[] DEFAULT NULL,
  p_rpo_hours int DEFAULT NULL,
  p_rto_hours int DEFAULT NULL,
  p_last_restore_test timestamptz DEFAULT NULL,
  
  -- Notes
  p_notes text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  
  -- Upsert key (NULL = create, UUID = update)
  p_resource_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource_id uuid;
  v_server_id uuid;
  v_site_id uuid;
  v_domain_id uuid;
  v_resource_status resource_status;
  v_criticality criticality_level;
  v_user_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get profile_id for created_by
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;

  -- Derive site_id and domain_id from network if not provided
  IF p_network_id IS NOT NULL THEN
    SELECT n.domain_id, d.site_id
    INTO v_domain_id, v_site_id
    FROM networks n
    JOIN domains d ON d.id = n.domain_id
    WHERE n.id = p_network_id;
    
    IF v_site_id IS NULL THEN
      RAISE EXCEPTION 'Invalid network_id: network not found or missing domain';
    END IF;
  ELSE
    v_site_id := p_site_id;
    v_domain_id := p_domain_id;
  END IF;
  
  -- For updates, derive site_id from existing resource if not provided
  IF p_resource_id IS NOT NULL AND v_site_id IS NULL THEN
    SELECT site_id, domain_id INTO v_site_id, v_domain_id
    FROM resources WHERE id = p_resource_id;
  END IF;
  
  -- Validate site_id for new resources
  IF p_resource_id IS NULL AND v_site_id IS NULL THEN
    RAISE EXCEPTION 'site_id is required for new resources (directly or via network_id)';
  END IF;

  -- Permission check: inventory.resources.manage at site scope
  IF NOT is_super_admin() THEN
    IF v_site_id IS NOT NULL AND NOT can_manage_site(v_site_id) THEN
      -- Check domain-level permission if domain_id is set
      IF v_domain_id IS NOT NULL THEN
        IF NOT can_manage_domain(v_domain_id) THEN
          RAISE EXCEPTION 'Permission denied: inventory.resources.manage required for domain';
        END IF;
      ELSE
        RAISE EXCEPTION 'Permission denied: site-level resources require site.manage permission';
      END IF;
    END IF;
  END IF;

  -- Map status string to enum (handle legacy 'active'/'inactive' values)
  v_resource_status := CASE LOWER(COALESCE(p_status, 'unknown'))
    WHEN 'active' THEN 'online'::resource_status
    WHEN 'inactive' THEN 'offline'::resource_status
    WHEN 'maintenance' THEN 'maintenance'::resource_status
    WHEN 'online' THEN 'online'::resource_status
    WHEN 'offline' THEN 'offline'::resource_status
    WHEN 'degraded' THEN 'degraded'::resource_status
    WHEN 'decommissioned' THEN 'decommissioned'::resource_status
    ELSE 'unknown'::resource_status
  END;
  
  -- Map criticality string to enum
  IF p_criticality IS NOT NULL AND p_criticality != '' THEN
    BEGIN
      v_criticality := p_criticality::criticality_level;
    EXCEPTION WHEN OTHERS THEN
      v_criticality := NULL;
    END;
  END IF;

  -- === ATOMIC TRANSACTION: resources + servers ===
  
  IF p_resource_id IS NOT NULL THEN
    -- UPDATE existing resource
    UPDATE resources SET
      name = COALESCE(p_name, name),
      hostname = COALESCE(p_hostname, hostname),
      primary_ip = COALESCE(p_ip_address, primary_ip),
      os = COALESCE(p_operating_system, os),
      status = v_resource_status,
      criticality = COALESCE(v_criticality, criticality),
      environment = COALESCE(p_environment, environment),
      owner_team = COALESCE(p_owner, owner_team),
      vendor = COALESCE(p_vendor, vendor),
      model = COALESCE(p_model, model),
      serial_number = COALESCE(p_serial_number, serial_number),
      warranty_end = COALESCE(p_warranty_end, warranty_end),
      eol_date = COALESCE(p_eol_date, eol_date),
      eos_date = COALESCE(p_eos_date, eos_date),
      is_backed_up = COALESCE(p_is_backed_up, is_backed_up),
      backup_policy = COALESCE(p_backup_policy, backup_policy),
      notes = COALESCE(p_notes, notes),
      tags = COALESCE(p_tags, tags),
      domain_id = COALESCE(v_domain_id, domain_id),
      updated_at = now()
    WHERE id = p_resource_id
    RETURNING id INTO v_resource_id;
    
    IF v_resource_id IS NULL THEN
      RAISE EXCEPTION 'Resource not found: %', p_resource_id;
    END IF;
    
    -- UPDATE linked server (or create if missing)
    UPDATE servers SET
      name = COALESCE(p_name, name),
      ip_address = COALESCE(p_ip_address, ip_address),
      operating_system = COALESCE(p_operating_system, operating_system),
      environment = COALESCE(p_environment, environment),
      status = COALESCE(p_status, status),
      owner = COALESCE(p_owner, owner),
      responsible_user = COALESCE(p_responsible_user, responsible_user),
      cpu = COALESCE(p_cpu, cpu),
      ram = COALESCE(p_ram, ram),
      disk_space = COALESCE(p_disk_space, disk_space),
      vendor = COALESCE(p_vendor, vendor),
      model = COALESCE(p_model, model),
      serial_number = COALESCE(p_serial_number, serial_number),
      warranty_end = COALESCE(p_warranty_end, warranty_end),
      eol_date = COALESCE(p_eol_date, eol_date),
      eos_date = COALESCE(p_eos_date, eos_date),
      purchase_date = COALESCE(p_purchase_date, purchase_date),
      is_backed_up_by_veeam = COALESCE(p_is_backed_up_by_veeam, is_backed_up_by_veeam),
      backup_frequency = COALESCE(p_backup_frequency, backup_frequency),
      backup_job_name = COALESCE(p_backup_job_name, backup_job_name),
      beneficiary_department = COALESCE(p_beneficiary_department, beneficiary_department),
      primary_application = COALESCE(p_primary_application, primary_application),
      business_owner = COALESCE(p_business_owner, business_owner),
      contract_id = COALESCE(p_contract_id, contract_id),
      support_level = COALESCE(p_support_level, support_level),
      server_role = COALESCE(p_server_role, server_role),
      rpo_hours = COALESCE(p_rpo_hours, rpo_hours),
      rto_hours = COALESCE(p_rto_hours, rto_hours),
      last_restore_test = COALESCE(p_last_restore_test, last_restore_test),
      network_id = COALESCE(p_network_id, network_id),
      domain_id = COALESCE(v_domain_id, domain_id),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE resource_id = p_resource_id
    RETURNING id INTO v_server_id;
    
    -- If no server exists for this resource, create one
    IF v_server_id IS NULL THEN
      INSERT INTO servers (
        resource_id, network_id, domain_id, name, ip_address, operating_system,
        environment, status, owner, responsible_user, cpu, ram, disk_space,
        vendor, model, serial_number, warranty_end, eol_date, eos_date, purchase_date,
        is_backed_up_by_veeam, backup_frequency, backup_job_name,
        beneficiary_department, primary_application, business_owner,
        contract_id, support_level, server_role, rpo_hours, rto_hours,
        last_restore_test, notes, created_by
      ) VALUES (
        v_resource_id, p_network_id, v_domain_id, p_name, p_ip_address, p_operating_system,
        p_environment, p_status, p_owner, p_responsible_user, p_cpu, p_ram, p_disk_space,
        p_vendor, p_model, p_serial_number, p_warranty_end, p_eol_date, p_eos_date, p_purchase_date,
        p_is_backed_up_by_veeam, p_backup_frequency, p_backup_job_name,
        p_beneficiary_department, p_primary_application, p_business_owner,
        p_contract_id, p_support_level, p_server_role, p_rpo_hours, p_rto_hours,
        p_last_restore_test, p_notes, v_profile_id
      );
    END IF;
    
  ELSE
    -- INSERT new resource
    INSERT INTO resources (
      site_id, domain_id, resource_type, name, hostname, primary_ip, os,
      status, criticality, environment, owner_team, vendor, model, serial_number,
      warranty_end, eol_date, eos_date, is_backed_up, backup_policy, notes, tags,
      source, created_by
    ) VALUES (
      v_site_id, v_domain_id, 'physical_server', p_name, COALESCE(p_hostname, p_name), p_ip_address, 
      p_operating_system, v_resource_status, v_criticality, p_environment, p_owner,
      p_vendor, p_model, p_serial_number, p_warranty_end, p_eol_date, p_eos_date,
      COALESCE(p_is_backed_up, p_is_backed_up_by_veeam, false), p_backup_policy, p_notes, p_tags, 
      'manual', v_profile_id
    )
    RETURNING id INTO v_resource_id;
    
    -- INSERT linked server
    INSERT INTO servers (
      resource_id, network_id, domain_id, name, ip_address, operating_system,
      environment, status, owner, responsible_user, cpu, ram, disk_space,
      vendor, model, serial_number, warranty_end, eol_date, eos_date, purchase_date,
      is_backed_up_by_veeam, backup_frequency, backup_job_name,
      beneficiary_department, primary_application, business_owner,
      contract_id, support_level, server_role, rpo_hours, rto_hours,
      last_restore_test, notes, created_by
    ) VALUES (
      v_resource_id, p_network_id, v_domain_id, p_name, p_ip_address, p_operating_system,
      p_environment, COALESCE(p_status, 'unknown'), p_owner, p_responsible_user, p_cpu, p_ram, p_disk_space,
      p_vendor, p_model, p_serial_number, p_warranty_end, p_eol_date, p_eos_date, p_purchase_date,
      COALESCE(p_is_backed_up_by_veeam, false), p_backup_frequency, p_backup_job_name,
      p_beneficiary_department, p_primary_application, p_business_owner,
      p_contract_id, COALESCE(p_support_level, 'standard'), p_server_role, p_rpo_hours, p_rto_hours,
      p_last_restore_test, p_notes, v_profile_id
    )
    RETURNING id INTO v_server_id;
  END IF;
  
  RETURN v_resource_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_physical_server IS 
'Atomic upsert for physical servers. Creates/updates both resources and servers tables in a single transaction.';

-- Part 3: Create upsert_vm RPC
CREATE OR REPLACE FUNCTION public.upsert_vm(
  -- Scope
  p_site_id uuid DEFAULT NULL,
  p_domain_id uuid DEFAULT NULL,
  p_cluster_id uuid DEFAULT NULL,
  p_network_id uuid DEFAULT NULL,
  
  -- Identity
  p_name text DEFAULT NULL,
  p_hostname text DEFAULT NULL,
  p_primary_ip text DEFAULT NULL,
  p_os text DEFAULT NULL,
  
  -- System specs
  p_cpu_cores int DEFAULT NULL,
  p_ram_gb numeric DEFAULT NULL,
  p_storage_gb numeric DEFAULT NULL,
  
  -- Status
  p_status text DEFAULT 'unknown',
  p_criticality text DEFAULT NULL,
  p_environment text DEFAULT NULL,
  p_owner_team text DEFAULT NULL,
  
  -- VM-specific
  p_hypervisor_type text DEFAULT NULL,
  p_hypervisor_host text DEFAULT NULL,
  p_vm_id text DEFAULT NULL,
  p_template_name text DEFAULT NULL,
  p_is_template boolean DEFAULT false,
  p_tools_status text DEFAULT NULL,
  p_tools_version text DEFAULT NULL,
  p_snapshot_count int DEFAULT 0,
  
  -- Notes
  p_notes text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  
  -- Upsert key
  p_resource_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource_id uuid;
  v_site_id uuid;
  v_domain_id uuid;
  v_resource_status resource_status;
  v_criticality criticality_level;
  v_user_id uuid;
  v_profile_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
  
  -- Derive site_id from cluster if not provided
  IF p_cluster_id IS NOT NULL AND p_site_id IS NULL THEN
    SELECT dc.site_id, c.domain_id INTO v_site_id, v_domain_id
    FROM clusters c
    JOIN datacenters dc ON dc.id = c.datacenter_id
    WHERE c.id = p_cluster_id;
  ELSIF p_network_id IS NOT NULL AND p_site_id IS NULL THEN
    SELECT d.site_id, n.domain_id INTO v_site_id, v_domain_id
    FROM networks n
    JOIN domains d ON d.id = n.domain_id
    WHERE n.id = p_network_id;
  ELSE
    v_site_id := p_site_id;
    v_domain_id := p_domain_id;
  END IF;
  
  -- For updates, derive site_id from existing resource if not provided
  IF p_resource_id IS NOT NULL AND v_site_id IS NULL THEN
    SELECT site_id, domain_id INTO v_site_id, v_domain_id
    FROM resources WHERE id = p_resource_id;
  END IF;
  
  -- Validate site_id for new resources
  IF p_resource_id IS NULL AND v_site_id IS NULL THEN
    RAISE EXCEPTION 'site_id is required for new VMs (directly or via cluster_id/network_id)';
  END IF;
  
  -- Permission check
  IF NOT is_super_admin() THEN
    IF v_site_id IS NOT NULL AND NOT can_manage_site(v_site_id) THEN
      IF v_domain_id IS NOT NULL THEN
        IF NOT can_manage_domain(v_domain_id) THEN
          RAISE EXCEPTION 'Permission denied: inventory.resources.manage required for domain';
        END IF;
      ELSE
        RAISE EXCEPTION 'Permission denied: site-level resources require site.manage permission';
      END IF;
    END IF;
  END IF;

  -- Map status
  v_resource_status := CASE LOWER(COALESCE(p_status, 'unknown'))
    WHEN 'active' THEN 'online'::resource_status
    WHEN 'inactive' THEN 'offline'::resource_status
    WHEN 'online' THEN 'online'::resource_status
    WHEN 'offline' THEN 'offline'::resource_status
    WHEN 'maintenance' THEN 'maintenance'::resource_status
    WHEN 'degraded' THEN 'degraded'::resource_status
    ELSE 'unknown'::resource_status
  END;
  
  IF p_criticality IS NOT NULL AND p_criticality != '' THEN
    BEGIN
      v_criticality := p_criticality::criticality_level;
    EXCEPTION WHEN OTHERS THEN
      v_criticality := NULL;
    END;
  END IF;

  IF p_resource_id IS NOT NULL THEN
    -- UPDATE
    UPDATE resources SET
      name = COALESCE(p_name, name),
      hostname = COALESCE(p_hostname, hostname),
      primary_ip = COALESCE(p_primary_ip, primary_ip),
      os = COALESCE(p_os, os),
      cpu_cores = COALESCE(p_cpu_cores, cpu_cores),
      ram_gb = COALESCE(p_ram_gb, ram_gb),
      storage_gb = COALESCE(p_storage_gb, storage_gb),
      status = v_resource_status,
      criticality = COALESCE(v_criticality, criticality),
      environment = COALESCE(p_environment, environment),
      owner_team = COALESCE(p_owner_team, owner_team),
      cluster_id = COALESCE(p_cluster_id, cluster_id),
      network_id = COALESCE(p_network_id, network_id),
      domain_id = COALESCE(v_domain_id, domain_id),
      notes = COALESCE(p_notes, notes),
      tags = COALESCE(p_tags, tags),
      updated_at = now()
    WHERE id = p_resource_id
    RETURNING id INTO v_resource_id;
    
    IF v_resource_id IS NULL THEN
      RAISE EXCEPTION 'Resource not found: %', p_resource_id;
    END IF;
    
    -- Upsert VM details
    INSERT INTO resource_vm_details (resource_id, hypervisor_type, hypervisor_host, vm_id, 
      template_name, is_template, tools_status, tools_version, snapshot_count)
    VALUES (v_resource_id, p_hypervisor_type, p_hypervisor_host, p_vm_id,
      p_template_name, COALESCE(p_is_template, false), p_tools_status, p_tools_version, 
      COALESCE(p_snapshot_count, 0))
    ON CONFLICT (resource_id) DO UPDATE SET
      hypervisor_type = COALESCE(EXCLUDED.hypervisor_type, resource_vm_details.hypervisor_type),
      hypervisor_host = COALESCE(EXCLUDED.hypervisor_host, resource_vm_details.hypervisor_host),
      vm_id = COALESCE(EXCLUDED.vm_id, resource_vm_details.vm_id),
      template_name = COALESCE(EXCLUDED.template_name, resource_vm_details.template_name),
      is_template = COALESCE(EXCLUDED.is_template, resource_vm_details.is_template),
      tools_status = COALESCE(EXCLUDED.tools_status, resource_vm_details.tools_status),
      tools_version = COALESCE(EXCLUDED.tools_version, resource_vm_details.tools_version),
      snapshot_count = COALESCE(EXCLUDED.snapshot_count, resource_vm_details.snapshot_count),
      updated_at = now();
  ELSE
    -- INSERT
    INSERT INTO resources (site_id, domain_id, cluster_id, network_id, resource_type, name, hostname, 
      primary_ip, os, cpu_cores, ram_gb, storage_gb, status, criticality, environment, owner_team, 
      notes, tags, source, created_by)
    VALUES (v_site_id, v_domain_id, p_cluster_id, p_network_id, 'vm', p_name, 
      COALESCE(p_hostname, p_name), p_primary_ip, p_os, p_cpu_cores, p_ram_gb, p_storage_gb,
      v_resource_status, v_criticality, p_environment, p_owner_team, p_notes, p_tags, 
      'manual', v_profile_id)
    RETURNING id INTO v_resource_id;
    
    INSERT INTO resource_vm_details (resource_id, hypervisor_type, hypervisor_host, vm_id,
      template_name, is_template, tools_status, tools_version, snapshot_count)
    VALUES (v_resource_id, p_hypervisor_type, p_hypervisor_host, p_vm_id,
      p_template_name, COALESCE(p_is_template, false), p_tools_status, p_tools_version, 
      COALESCE(p_snapshot_count, 0));
  END IF;
  
  RETURN v_resource_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_vm IS 
'Atomic upsert for VMs. Creates/updates both resources and resource_vm_details tables in a single transaction.';

-- Part 4: Create delete_physical_server RPC
CREATE OR REPLACE FUNCTION public.delete_physical_server(p_resource_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id uuid;
  v_domain_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get scope for permission check
  SELECT site_id, domain_id INTO v_site_id, v_domain_id
  FROM resources WHERE id = p_resource_id;
  
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Resource not found: %', p_resource_id;
  END IF;
  
  -- Permission check (same as upsert)
  IF NOT is_super_admin() THEN
    IF NOT can_manage_site(v_site_id) THEN
      IF v_domain_id IS NOT NULL THEN
        IF NOT can_manage_domain(v_domain_id) THEN
          RAISE EXCEPTION 'Permission denied: inventory.resources.manage required';
        END IF;
      ELSE
        RAISE EXCEPTION 'Permission denied: site-level resources require site.manage permission';
      END IF;
    END IF;
  END IF;
  
  -- Delete server first (child)
  DELETE FROM servers WHERE resource_id = p_resource_id;
  
  -- Delete resource (parent)
  DELETE FROM resources WHERE id = p_resource_id;
END;
$$;

COMMENT ON FUNCTION public.delete_physical_server IS 
'Atomic delete for physical servers. Removes both servers and resources rows in a single transaction.';

-- Part 5: Create delete_vm RPC
CREATE OR REPLACE FUNCTION public.delete_vm(p_resource_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id uuid;
  v_domain_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT site_id, domain_id INTO v_site_id, v_domain_id
  FROM resources WHERE id = p_resource_id;
  
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'Resource not found: %', p_resource_id;
  END IF;
  
  IF NOT is_super_admin() THEN
    IF NOT can_manage_site(v_site_id) THEN
      IF v_domain_id IS NOT NULL THEN
        IF NOT can_manage_domain(v_domain_id) THEN
          RAISE EXCEPTION 'Permission denied';
        END IF;
      ELSE
        RAISE EXCEPTION 'Permission denied: site-level resources require site.manage';
      END IF;
    END IF;
  END IF;
  
  -- Delete VM details first (child)
  DELETE FROM resource_vm_details WHERE resource_id = p_resource_id;
  
  -- Delete resource (parent)
  DELETE FROM resources WHERE id = p_resource_id;
END;
$$;

COMMENT ON FUNCTION public.delete_vm IS 
'Atomic delete for VMs. Removes both resource_vm_details and resources rows in a single transaction.';

-- Part 6: Harden servers RLS to constrain access via linked resource
-- First, check and drop existing policies if they exist
DO $$
BEGIN
  -- Drop policies if they exist (safe re-run)
  DROP POLICY IF EXISTS "servers_select" ON servers;
  DROP POLICY IF EXISTS "servers_insert" ON servers;
  DROP POLICY IF EXISTS "servers_update" ON servers;
  DROP POLICY IF EXISTS "servers_delete" ON servers;
  DROP POLICY IF EXISTS "Servers are viewable by site members" ON servers;
  DROP POLICY IF EXISTS "Servers can be inserted by site admins" ON servers;
  DROP POLICY IF EXISTS "Servers can be updated by site admins" ON servers;
  DROP POLICY IF EXISTS "Servers can be deleted by site admins" ON servers;
  DROP POLICY IF EXISTS "servers_select_via_resource" ON servers;
  DROP POLICY IF EXISTS "servers_insert_via_rpc" ON servers;
  DROP POLICY IF EXISTS "servers_update_via_rpc" ON servers;
  DROP POLICY IF EXISTS "servers_delete_via_rpc" ON servers;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- New RLS policies: servers are accessed only via their linked resource
-- SELECT: Allow if user can access the linked resource's site
CREATE POLICY "servers_select_via_resource" ON servers FOR SELECT
USING (
  -- Super admin bypass
  is_super_admin()
  OR (
    resource_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM resources r 
      WHERE r.id = servers.resource_id 
      AND can_access_site(r.site_id)
    )
  )
  -- Legacy fallback for unlinked servers (temporary, until all are linked)
  OR (
    resource_id IS NULL 
    AND domain_id IS NOT NULL 
    AND can_access_domain(domain_id)
  )
);

-- INSERT/UPDATE/DELETE: Only via RPC (SECURITY DEFINER)
-- These policies block direct client writes, forcing use of RPCs
CREATE POLICY "servers_insert_via_rpc" ON servers FOR INSERT
WITH CHECK (
  -- Only allow inserts from SECURITY DEFINER functions (RPCs)
  -- Client-side inserts are blocked
  current_setting('role', true) = 'rpc_user' OR is_super_admin()
);

CREATE POLICY "servers_update_via_rpc" ON servers FOR UPDATE
USING (
  current_setting('role', true) = 'rpc_user' OR is_super_admin()
);

CREATE POLICY "servers_delete_via_rpc" ON servers FOR DELETE
USING (
  current_setting('role', true) = 'rpc_user' OR is_super_admin()
);