

# Phase B/C Implementation Plan: Transactional Dual-Write with Production Safety

## Executive Summary

This plan implements the unified inventory model by creating PostgreSQL RPCs for atomic dual-table writes, a flattened view for simplified reads, and updating the UI to be type-aware. All changes follow production safety requirements with no destructive schema changes.

---

## Current State Analysis

| Component | Current State |
|-----------|---------------|
| `servers` table | 36 rows with rich fields (Veeam, lifecycle, DR, capacity) |
| `resources` table | 36 rows linked via `servers.resource_id` |
| Linkage | 100% complete - all 36 servers have `resource_id` populated |
| Field ownership | Duplicated fields exist (vendor/model/serial in both tables) |
| Write path | Client writes to `servers` only, NOT atomic with resources |
| Read path | Servers page reads from `servers`; Resources page reads from `resources` |

---

## Part 1: Database Schema (No Destructive Changes)

### 1.1 Field Ownership Matrix

```text
+------------------------+----------------+-------------------------------------+
| Field Category         | Owner Table    | Notes                               |
+------------------------+----------------+-------------------------------------+
| Identity               | resources      | name, hostname, fqdn                |
| Network                | resources      | primary_ip, mac_address             |
| System Specs           | resources      | os, cpu_cores, ram_gb, storage_gb   |
| Status/Criticality     | resources      | status, criticality                 |
| Classification         | resources      | environment, tags                   |
| Ownership              | resources      | owner_team, department              |
| Asset Lifecycle        | resources      | vendor, model, serial, warranty     |
| Backup Summary         | resources      | is_backed_up, backup_policy         |
| EOL/EOS                | resources      | eol_date, eos_date                  |
| Notes                  | resources      | notes, custom_fields                |
+------------------------+----------------+-------------------------------------+
| Network Association    | servers        | network_id (references networks)    |
| Domain Association     | servers        | domain_id (for legacy path)         |
| Veeam Details          | servers        | backup_job_name, backup_frequency   |
| Support Contract       | servers        | contract_id, support_level          |
| Server Roles           | servers        | server_role[]                       |
| DR Configuration       | servers        | rpo_hours, rto_hours, last_restore  |
| Business Context       | servers        | beneficiary_dept, primary_app       |
| Responsible User       | servers        | responsible_user, business_owner    |
+------------------------+----------------+-------------------------------------+
```

**Key Decision**: Keep legacy fields in `servers` (no DROP COLUMN). The RPC will write to both, but reads will prefer `resources` for shared fields.

### 1.2 Database View: `server_inventory_view`

Creates a flattened read model for the Servers page:

```sql
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
  
  -- Identity (from resources)
  r.name,
  r.hostname,
  r.primary_ip AS ip_address,
  r.os AS operating_system,
  
  -- Status (from resources)
  r.status,
  r.criticality,
  r.environment,
  
  -- Ownership (from resources)
  r.owner_team AS owner,
  
  -- System specs (from resources, fallback to servers)
  COALESCE(r.cpu_cores::text, s.cpu) AS cpu,
  COALESCE(r.ram_gb::text || ' GB', s.ram) AS ram,
  COALESCE(r.storage_gb::text || ' GB', s.disk_space) AS disk_space,
  
  -- Asset lifecycle (from resources)
  r.vendor,
  r.model,
  r.serial_number,
  r.warranty_end,
  r.eol_date,
  r.eos_date,
  
  -- Backup summary (from resources)
  r.is_backed_up,
  r.backup_policy,
  
  -- Server-specific (from servers)
  s.beneficiary_department,
  s.primary_application,
  s.business_owner,
  s.is_backed_up_by_veeam,
  s.backup_frequency,
  s.backup_job_name,
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
  
  -- Joined names
  n.name AS network_name,
  d.name AS domain_name,
  site.name AS site_name
  
FROM resources r
INNER JOIN servers s ON s.resource_id = r.id
LEFT JOIN networks n ON n.id = s.network_id
LEFT JOIN domains d ON d.id = COALESCE(r.domain_id, s.domain_id)
LEFT JOIN sites site ON site.id = r.site_id
WHERE r.resource_type = 'physical_server';
```

The `security_invoker = true` option ensures the view respects RLS policies from the underlying `resources` table.

---

## Part 2: Transactional RPCs (SECURITY DEFINER)

### 2.1 RPC: `upsert_physical_server`

```sql
CREATE OR REPLACE FUNCTION public.upsert_physical_server(
  -- Site/Domain scope (site_id derived from network if not provided)
  p_network_id uuid,
  p_site_id uuid DEFAULT NULL,
  p_domain_id uuid DEFAULT NULL,
  
  -- Identity
  p_name text,
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
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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
  
  -- Validate site_id
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'site_id is required (directly or via network_id)';
  END IF;

  -- Permission check: inventory.resources.manage at site scope
  IF NOT is_super_admin() AND NOT can_manage_site(v_site_id) THEN
    -- Check domain-level permission if domain_id is set
    IF v_domain_id IS NOT NULL AND NOT can_manage_domain(v_domain_id) THEN
      RAISE EXCEPTION 'Permission denied: inventory.resources.manage required';
    ELSIF v_domain_id IS NULL THEN
      RAISE EXCEPTION 'Permission denied: site-level resources require site.manage';
    END IF;
  END IF;

  -- Map status string to enum
  v_resource_status := CASE p_status
    WHEN 'active' THEN 'online'::resource_status
    WHEN 'inactive' THEN 'offline'::resource_status
    WHEN 'maintenance' THEN 'maintenance'::resource_status
    ELSE COALESCE(p_status::resource_status, 'unknown'::resource_status)
  END;
  
  -- Map criticality string to enum
  IF p_criticality IS NOT NULL AND p_criticality != '' THEN
    v_criticality := p_criticality::criticality_level;
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
    
    -- UPDATE linked server
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
    WHERE resource_id = p_resource_id;
    
  ELSE
    -- INSERT new resource
    INSERT INTO resources (
      site_id, domain_id, resource_type, name, hostname, primary_ip, os,
      status, criticality, environment, owner_team, vendor, model, serial_number,
      warranty_end, eol_date, eos_date, is_backed_up, backup_policy, notes, tags,
      source, created_by
    ) VALUES (
      v_site_id, v_domain_id, 'physical_server', p_name, p_hostname, p_ip_address, 
      p_operating_system, v_resource_status, v_criticality, p_environment, p_owner,
      p_vendor, p_model, p_serial_number, p_warranty_end, p_eol_date, p_eos_date,
      p_is_backed_up, p_backup_policy, p_notes, p_tags, 'manual', v_user_id
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
      p_environment, p_status, p_owner, p_responsible_user, p_cpu, p_ram, p_disk_space,
      p_vendor, p_model, p_serial_number, p_warranty_end, p_eol_date, p_eos_date, p_purchase_date,
      p_is_backed_up_by_veeam, p_backup_frequency, p_backup_job_name,
      p_beneficiary_department, p_primary_application, p_business_owner,
      p_contract_id, p_support_level, p_server_role, p_rpo_hours, p_rto_hours,
      p_last_restore_test, p_notes, v_user_id
    )
    RETURNING id INTO v_server_id;
  END IF;
  
  RETURN v_resource_id;
END;
$$;
```

### 2.2 RPC: `upsert_vm`

```sql
CREATE OR REPLACE FUNCTION public.upsert_vm(
  -- Scope
  p_site_id uuid,
  p_domain_id uuid DEFAULT NULL,
  p_cluster_id uuid DEFAULT NULL,
  
  -- Identity
  p_name text,
  p_hostname text DEFAULT NULL,
  p_primary_ip text DEFAULT NULL,
  p_os text DEFAULT NULL,
  
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
  v_resource_status resource_status;
  v_criticality criticality_level;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Permission check
  IF NOT is_super_admin() AND NOT can_manage_site(p_site_id) THEN
    IF p_domain_id IS NOT NULL AND NOT can_manage_domain(p_domain_id) THEN
      RAISE EXCEPTION 'Permission denied';
    ELSIF p_domain_id IS NULL THEN
      RAISE EXCEPTION 'Permission denied: site-level resources require site.manage';
    END IF;
  END IF;

  -- Map status
  v_resource_status := COALESCE(p_status::resource_status, 'unknown'::resource_status);
  IF p_criticality IS NOT NULL AND p_criticality != '' THEN
    v_criticality := p_criticality::criticality_level;
  END IF;

  IF p_resource_id IS NOT NULL THEN
    -- UPDATE
    UPDATE resources SET
      name = COALESCE(p_name, name),
      hostname = COALESCE(p_hostname, hostname),
      primary_ip = COALESCE(p_primary_ip, primary_ip),
      os = COALESCE(p_os, os),
      status = v_resource_status,
      criticality = COALESCE(v_criticality, criticality),
      environment = COALESCE(p_environment, environment),
      owner_team = COALESCE(p_owner_team, owner_team),
      cluster_id = COALESCE(p_cluster_id, cluster_id),
      domain_id = COALESCE(p_domain_id, domain_id),
      notes = COALESCE(p_notes, notes),
      tags = COALESCE(p_tags, tags),
      updated_at = now()
    WHERE id = p_resource_id
    RETURNING id INTO v_resource_id;
    
    -- Upsert VM details
    INSERT INTO resource_vm_details (resource_id, hypervisor_type, hypervisor_host, vm_id, 
      template_name, is_template, tools_status, tools_version, snapshot_count)
    VALUES (v_resource_id, p_hypervisor_type, p_hypervisor_host, p_vm_id,
      p_template_name, p_is_template, p_tools_status, p_tools_version, p_snapshot_count)
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
    INSERT INTO resources (site_id, domain_id, cluster_id, resource_type, name, hostname, 
      primary_ip, os, status, criticality, environment, owner_team, notes, tags, source, created_by)
    VALUES (p_site_id, p_domain_id, p_cluster_id, 'vm', p_name, p_hostname, p_primary_ip, 
      p_os, v_resource_status, v_criticality, p_environment, p_owner_team, p_notes, p_tags, 
      'manual', v_user_id)
    RETURNING id INTO v_resource_id;
    
    INSERT INTO resource_vm_details (resource_id, hypervisor_type, hypervisor_host, vm_id,
      template_name, is_template, tools_status, tools_version, snapshot_count)
    VALUES (v_resource_id, p_hypervisor_type, p_hypervisor_host, p_vm_id,
      p_template_name, p_is_template, p_tools_status, p_tools_version, p_snapshot_count);
  END IF;
  
  RETURN v_resource_id;
END;
$$;
```

### 2.3 RPC: `delete_physical_server`

```sql
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
    RAISE EXCEPTION 'Resource not found';
  END IF;
  
  -- Permission check (same as upsert)
  IF NOT is_super_admin() AND NOT can_manage_site(v_site_id) THEN
    IF v_domain_id IS NOT NULL AND NOT can_manage_domain(v_domain_id) THEN
      RAISE EXCEPTION 'Permission denied';
    ELSIF v_domain_id IS NULL THEN
      RAISE EXCEPTION 'Permission denied: site-level resources require site.manage';
    END IF;
  END IF;
  
  -- Delete server first (child)
  DELETE FROM servers WHERE resource_id = p_resource_id;
  
  -- Delete resource (parent)
  DELETE FROM resources WHERE id = p_resource_id;
END;
$$;
```

### 2.4 RLS Hardening for `servers` Table

Ensure `servers` RLS is constrained via the linked `resources` row:

```sql
-- Drop old policies that allow standalone server access
DROP POLICY IF EXISTS "servers_select" ON servers;
DROP POLICY IF EXISTS "servers_insert" ON servers;
DROP POLICY IF EXISTS "servers_update" ON servers;
DROP POLICY IF EXISTS "servers_delete" ON servers;

-- New policies: servers are accessed only via their linked resource
CREATE POLICY "servers_select_via_resource" ON servers FOR SELECT
USING (
  resource_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM resources r WHERE r.id = servers.resource_id AND can_access_site(r.site_id)
  )
);

CREATE POLICY "servers_insert_via_rpc" ON servers FOR INSERT
WITH CHECK (false); -- All inserts go through RPC

CREATE POLICY "servers_update_via_rpc" ON servers FOR UPDATE
USING (false); -- All updates go through RPC

CREATE POLICY "servers_delete_via_rpc" ON servers FOR DELETE
USING (false); -- All deletes go through RPC
```

---

## Part 3: Frontend Changes

### 3.1 Update `src/services/resourceService.ts`

Add RPC callers:

```typescript
export async function upsertPhysicalServer(params: PhysicalServerInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_physical_server', {
    p_network_id: params.network_id,
    p_name: params.name,
    p_hostname: params.hostname,
    p_ip_address: params.ip_address,
    // ... all other params
    p_resource_id: params.resource_id || null,
  });
  if (error) throw error;
  return data;
}

export async function upsertVM(params: VMInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_vm', { /* params */ });
  if (error) throw error;
  return data;
}

export async function deletePhysicalServer(resourceId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_physical_server', { p_resource_id: resourceId });
  if (error) throw error;
}
```

### 3.2 Update `src/hooks/useSupabaseData.ts`

Change `useServerMutations` to use RPCs:

```typescript
export function useServerMutations(profileId?: string) {
  const createServer = async (formData: Record<string, any>) => {
    const resourceId = await upsertPhysicalServer({
      network_id: formData.network_id,
      name: formData.name,
      // ... map all fields
    });
    await logAuditAction(profileId, 'create', 'servers', resourceId, undefined, formData);
    return { data: { id: resourceId }, error: null };
  };

  const updateServer = async (resourceId: string, formData: Record<string, any>) => {
    await upsertPhysicalServer({
      ...formData,
      resource_id: resourceId,
    });
    await logAuditAction(profileId, 'update', 'servers', resourceId);
    return { data: { id: resourceId }, error: null };
  };

  const deleteServer = async (resourceId: string) => {
    await deletePhysicalServer(resourceId);
    await logAuditAction(profileId, 'delete', 'servers', resourceId);
    return { error: null };
  };

  return { createServer, updateServer, deleteServer };
}
```

### 3.3 Update `src/pages/Servers.tsx` Read Path

Change to read from the flattened view:

```typescript
export function useServers(networkId?: string) {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: ['server-inventory', selectedSite?.id, networkId],
    queryFn: async () => {
      let query = supabase
        .from('server_inventory_view')
        .select('*')
        .eq('site_id', selectedSite.id);
      
      if (networkId) {
        query = query.eq('network_id', networkId);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSite,
    staleTime: 30000,
  });
}
```

### 3.4 Update `src/hooks/useSmartImport.ts`

Use deterministic matching strategy:

```typescript
const importServers = async (data: any[], siteId: string) => {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };
  
  for (const row of data) {
    try {
      const hostname = row.name || row.Name || '';
      const ip = row.ip_address || row.IP || '';
      
      if (!hostname) {
        results.errors.push({ row, error: 'Name required' });
        continue;
      }
      
      // Deterministic match: site_id + (hostname OR primary_ip)
      const { data: existing } = await supabase
        .from('server_inventory_view')
        .select('id')
        .eq('site_id', siteId)
        .or(`name.eq.${hostname},ip_address.eq.${ip}`)
        .maybeSingle();
      
      const resourceId = await upsertPhysicalServer({
        network_id: row.network_id,
        name: hostname,
        ip_address: ip,
        // ... map all fields
        resource_id: existing?.id || null,
      });
      
      if (existing) {
        results.updated++;
      } else {
        results.created++;
      }
    } catch (error: any) {
      results.errors.push({ row, error: error.message });
    }
  }
  
  return results;
};
```

### 3.5 Type-Aware Resources Form

Create new components for the 2-step form:

```text
src/components/resources/ResourceTypeStep.tsx    - Step 1: Select type
src/components/resources/SharedFieldsSection.tsx - Shared fields (all types)
src/components/resources/ServerDetailsSection.tsx - Physical server fields
src/components/resources/VMDetailsSection.tsx    - VM-specific fields
```

The form will:
1. First prompt for resource type selection
2. Show shared fields (name, hostname, IP, OS, status, criticality, environment)
3. Conditionally show type-specific section:
   - **Physical Server**: Reuses current Servers modal fields (network, Veeam, lifecycle, DR)
   - **VM**: Shows hypervisor, cluster, VM UUID, tools status, snapshot count

---

## Part 4: Verification Checklist

| # | Test | Method | Expected |
|---|------|--------|----------|
| 1 | Add server via Servers page | UI + DB query | RPC creates `resources` + `servers` atomically |
| 2 | Edit server via Servers page | UI + DB query | RPC updates both tables |
| 3 | Delete server | UI + DB query | Cascading delete via RPC |
| 4 | Add VM via Resources page | UI + DB query | Creates `resources` + `resource_vm_details` |
| 5 | View reads from view | Network tab | `server_inventory_view` is queried |
| 6 | Excel import idempotency | Import same file twice | No duplicates, updated count > 0 |
| 7 | DomainAdmin sees domain resources only | Login as DomainAdmin | `exclude_null_domain` enforced |
| 8 | DomainAdmin cannot create site-level | Attempt via RPC | Error: "site-level resources require site.manage" |
| 9 | View does not leak cross-site data | Query view as DomainAdmin | Only sees resources in assigned domain |
| 10 | Dashboard counts match | Compare with SQL | `COUNT(resources WHERE type='physical_server')` |
| 11 | Backfill idempotency | Run migration twice | No duplicates (unique constraint) |

---

## Part 5: Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXX_transactional_rpcs.sql` | RPCs + View + RLS hardening |
| `src/components/resources/ResourceTypeStep.tsx` | Type selection step |
| `src/components/resources/SharedFieldsSection.tsx` | Shared form fields |
| `src/components/resources/ServerDetailsSection.tsx` | Server-specific form |
| `src/components/resources/VMDetailsSection.tsx` | VM-specific form |

### Modified Files
| File | Changes |
|------|---------|
| `src/services/resourceService.ts` | Add RPC callers |
| `src/hooks/useSupabaseData.ts` | Update `useServerMutations` to use RPCs, update `useServers` to use view |
| `src/hooks/useSmartImport.ts` | Update import to use RPC with deterministic matching |
| `src/pages/Servers.tsx` | Read from view (no UI changes) |
| `src/pages/Resources.tsx` | Type-aware 2-step form |
| `src/types/resources.ts` | Add extended types for server/VM inputs |

---

## Migration Safety Notes

1. **No destructive DROP COLUMN** - Legacy fields in `servers` are preserved
2. **RPCs are additive** - Old code paths still work until fully switched
3. **View is read-only** - All mutations must go through RPCs
4. **RLS hardening is reversible** - Can restore old policies if needed
5. **Rollback safe** - Drop RPCs/view to revert

