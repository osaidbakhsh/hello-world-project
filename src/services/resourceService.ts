// ============================================================
// PHASE 1 & B/C: Resource Service - Unified Inventory CRUD + RPCs
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  Resource,
  ResourceCreateInput,
  ResourceUpdateInput,
  ResourceWithDetails,
  ResourceFilters,
  ResourceStats,
  ResourceVMDetails,
  ResourceVMDetailsInput,
  ResourceServerDetails,
  ResourceServerDetailsInput,
  ResourceType,
  ResourceStatus,
  CriticalityLevel,
  PhysicalServerInput,
  VMInput,
  ServerInventoryView,
} from '@/types/resources';

// ============================================================
// Resource CRUD Operations
// ============================================================

export async function getResources(filters?: ResourceFilters): Promise<ResourceWithDetails[]> {
  let query = supabase
    .from('resources')
    .select(`
      *,
      sites:site_id (name),
      domains:domain_id (name),
      clusters:cluster_id (name),
      networks_v2:network_id (name),
      owner:owner_user_id (full_name),
      responsible:responsible_user_id (full_name),
      resource_vm_details (*),
      resource_server_details (*)
    `)
    .order('name');

  // Apply filters
  if (filters?.site_id) {
    query = query.eq('site_id', filters.site_id);
  }
  if (filters?.domain_id) {
    query = query.eq('domain_id', filters.domain_id);
  }
  // DomainAdmin Option A: Exclude site-level resources (domain_id IS NULL)
  if (filters?.exclude_null_domain) {
    query = query.not('domain_id', 'is', null);
  }
  if (filters?.cluster_id) {
    query = query.eq('cluster_id', filters.cluster_id);
  }
  if (filters?.resource_type) {
    if (Array.isArray(filters.resource_type)) {
      query = query.in('resource_type', filters.resource_type);
    } else {
      query = query.eq('resource_type', filters.resource_type);
    }
  }
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.criticality) {
    if (Array.isArray(filters.criticality)) {
      query = query.in('criticality', filters.criticality);
    } else {
      query = query.eq('criticality', filters.criticality);
    }
  }
  if (filters?.environment) {
    query = query.eq('environment', filters.environment);
  }
  if (filters?.owner_team) {
    query = query.eq('owner_team', filters.owner_team);
  }
  if (filters?.is_backed_up !== undefined) {
    query = query.eq('is_backed_up', filters.is_backed_up);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,hostname.ilike.%${filters.search}%,primary_ip.ilike.%${filters.search}%`);
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }

  // Transform the data to match ResourceWithDetails
  return (data || []).map((item: any) => ({
    ...item,
    site_name: item.sites?.name,
    domain_name: item.domains?.name,
    cluster_name: item.clusters?.name,
    network_name: item.networks_v2?.name,
    owner_name: item.owner?.full_name,
    responsible_name: item.responsible?.full_name,
    vm_details: item.resource_vm_details?.[0] || null,
    server_details: item.resource_server_details?.[0] || null,
  }));
}

export async function getResourceById(id: string): Promise<ResourceWithDetails | null> {
  const { data, error } = await supabase
    .from('resources')
    .select(`
      *,
      sites:site_id (name),
      domains:domain_id (name),
      clusters:cluster_id (name),
      networks_v2:network_id (name),
      owner:owner_user_id (full_name),
      responsible:responsible_user_id (full_name),
      resource_vm_details (*),
      resource_server_details (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching resource:', error);
    throw error;
  }

  return {
    ...data,
    site_name: (data as any).sites?.name,
    domain_name: (data as any).domains?.name,
    cluster_name: (data as any).clusters?.name,
    network_name: (data as any).networks_v2?.name,
    owner_name: (data as any).owner?.full_name,
    responsible_name: (data as any).responsible?.full_name,
    vm_details: (data as any).resource_vm_details?.[0] || null,
    server_details: (data as any).resource_server_details?.[0] || null,
  } as ResourceWithDetails;
}

export async function createResource(input: ResourceCreateInput): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .insert(input as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating resource:', error);
    throw error;
  }

  return data as unknown as Resource;
}

export async function updateResource(id: string, input: ResourceUpdateInput): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .update(input as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating resource:', error);
    throw error;
  }

  return data as unknown as Resource;
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting resource:', error);
    throw error;
  }
}

// ============================================================
// VM Details Operations
// ============================================================

export async function getVMDetails(resourceId: string): Promise<ResourceVMDetails | null> {
  const { data, error } = await supabase
    .from('resource_vm_details')
    .select('*')
    .eq('resource_id', resourceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as ResourceVMDetails;
}

export async function upsertVMDetails(input: ResourceVMDetailsInput): Promise<ResourceVMDetails> {
  const { data, error } = await supabase
    .from('resource_vm_details')
    .upsert(input as any, { onConflict: 'resource_id' })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ResourceVMDetails;
}

// ============================================================
// Server Details Operations
// ============================================================

export async function getServerDetails(resourceId: string): Promise<ResourceServerDetails | null> {
  const { data, error } = await supabase
    .from('resource_server_details')
    .select('*')
    .eq('resource_id', resourceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as ResourceServerDetails;
}

export async function upsertServerDetails(input: ResourceServerDetailsInput): Promise<ResourceServerDetails> {
  const { data, error } = await supabase
    .from('resource_server_details')
    .upsert(input as any, { onConflict: 'resource_id' })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ResourceServerDetails;
}

// ============================================================
// Statistics & Aggregations
// ============================================================

export async function getResourceStats(siteId?: string): Promise<ResourceStats> {
  let query = supabase.from('resources').select('resource_type, status, criticality, is_backed_up');
  
  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching resource stats:', error);
    throw error;
  }

  const resources = data || [];
  
  const stats: ResourceStats = {
    total: resources.length,
    by_type: {} as Record<ResourceType, number>,
    by_status: {} as Record<ResourceStatus, number>,
    by_criticality: {} as Record<CriticalityLevel, number>,
    backed_up: 0,
    not_backed_up: 0,
    critical_offline: 0,
  };

  // Initialize counters
  const types: ResourceType[] = ['vm', 'physical_server', 'appliance', 'service', 'container', 'database'];
  const statuses: ResourceStatus[] = ['online', 'offline', 'maintenance', 'degraded', 'unknown', 'decommissioned'];
  const criticalities: CriticalityLevel[] = ['critical', 'high', 'medium', 'low'];

  types.forEach(t => stats.by_type[t] = 0);
  statuses.forEach(s => stats.by_status[s] = 0);
  criticalities.forEach(c => stats.by_criticality[c] = 0);

  // Count
  resources.forEach((r: any) => {
    if (r.resource_type) stats.by_type[r.resource_type as ResourceType]++;
    if (r.status) stats.by_status[r.status as ResourceStatus]++;
    if (r.criticality) stats.by_criticality[r.criticality as CriticalityLevel]++;
    if (r.is_backed_up) stats.backed_up++;
    else stats.not_backed_up++;
    if (r.criticality === 'critical' && r.status === 'offline') stats.critical_offline++;
  });

  return stats;
}

// ============================================================
// Bulk Operations
// ============================================================

export async function bulkUpdateResourceStatus(
  ids: string[],
  status: ResourceStatus
): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ status } as any)
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUpdateResourceTags(
  ids: string[],
  tags: string[],
  mode: 'replace' | 'append' = 'replace'
): Promise<void> {
  if (mode === 'replace') {
    const { error } = await supabase
      .from('resources')
      .update({ tags } as any)
      .in('id', ids);
    if (error) throw error;
  } else {
    // For append mode, we need to fetch current tags and merge
    const { data: resources, error: fetchError } = await supabase
      .from('resources')
      .select('id, tags')
      .in('id', ids);
    
    if (fetchError) throw fetchError;

    // Update each resource with merged tags
    for (const resource of resources || []) {
      const currentTags = (resource as any).tags || [];
      const mergedTags = [...new Set([...currentTags, ...tags])];
      await supabase
        .from('resources')
        .update({ tags: mergedTags } as any)
        .eq('id', resource.id);
    }
  }
}

// ============================================================
// Search & Discovery
// ============================================================

export async function searchResources(
  query: string,
  siteId?: string,
  limit = 20
): Promise<ResourceWithDetails[]> {
  let dbQuery = supabase
    .from('resources')
    .select(`
      id, name, hostname, primary_ip, resource_type, status, criticality,
      sites:site_id (name)
    `)
    .or(`name.ilike.%${query}%,hostname.ilike.%${query}%,primary_ip.ilike.%${query}%,fqdn.ilike.%${query}%`)
    .limit(limit);

  if (siteId) {
    dbQuery = dbQuery.eq('site_id', siteId);
  }

  const { data, error } = await dbQuery;

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    site_name: item.sites?.name,
  })) as ResourceWithDetails[];
}

// ============================================================
// PHASE B/C: Transactional RPCs
// ============================================================

/**
 * Atomic upsert for physical servers.
 * Creates/updates both resources and servers tables in a single transaction.
 */
export async function upsertPhysicalServer(params: PhysicalServerInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_physical_server', {
    p_network_id: params.network_id || null,
    p_site_id: params.site_id || null,
    p_domain_id: params.domain_id || null,
    p_name: params.name,
    p_hostname: params.hostname || null,
    p_ip_address: params.ip_address || null,
    p_operating_system: params.operating_system || null,
    p_status: params.status || 'unknown',
    p_criticality: params.criticality || null,
    p_environment: params.environment || null,
    p_owner: params.owner || null,
    p_responsible_user: params.responsible_user || null,
    p_cpu: params.cpu || null,
    p_ram: params.ram || null,
    p_disk_space: params.disk_space || null,
    p_vendor: params.vendor || null,
    p_model: params.model || null,
    p_serial_number: params.serial_number || null,
    p_warranty_end: params.warranty_end || null,
    p_eol_date: params.eol_date || null,
    p_eos_date: params.eos_date || null,
    p_purchase_date: params.purchase_date || null,
    p_is_backed_up: params.is_backed_up ?? params.is_backed_up_by_veeam ?? false,
    p_backup_policy: params.backup_policy || null,
    p_is_backed_up_by_veeam: params.is_backed_up_by_veeam ?? false,
    p_backup_frequency: params.backup_frequency || null,
    p_backup_job_name: params.backup_job_name || null,
    p_beneficiary_department: params.beneficiary_department || null,
    p_primary_application: params.primary_application || null,
    p_business_owner: params.business_owner || null,
    p_contract_id: params.contract_id || null,
    p_support_level: params.support_level || 'standard',
    p_server_role: params.server_role || null,
    p_rpo_hours: params.rpo_hours || null,
    p_rto_hours: params.rto_hours || null,
    p_last_restore_test: params.last_restore_test || null,
    p_notes: params.notes || null,
    p_tags: params.tags || null,
    p_resource_id: params.resource_id || null,
  });

  if (error) {
    console.error('Error upserting physical server:', error);
    throw error;
  }

  return data as string;
}

/**
 * Atomic upsert for VMs.
 * Creates/updates both resources and resource_vm_details tables in a single transaction.
 */
export async function upsertVM(params: VMInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_vm', {
    p_site_id: params.site_id || null,
    p_domain_id: params.domain_id || null,
    p_cluster_id: params.cluster_id || null,
    p_network_id: params.network_id || null,
    p_name: params.name,
    p_hostname: params.hostname || null,
    p_primary_ip: params.primary_ip || null,
    p_os: params.os || null,
    p_cpu_cores: params.cpu_cores || null,
    p_ram_gb: params.ram_gb || null,
    p_storage_gb: params.storage_gb || null,
    p_status: params.status || 'unknown',
    p_criticality: params.criticality || null,
    p_environment: params.environment || null,
    p_owner_team: params.owner_team || null,
    p_hypervisor_type: params.hypervisor_type || null,
    p_hypervisor_host: params.hypervisor_host || null,
    p_vm_id: params.vm_id || null,
    p_template_name: params.template_name || null,
    p_is_template: params.is_template ?? false,
    p_tools_status: params.tools_status || null,
    p_tools_version: params.tools_version || null,
    p_snapshot_count: params.snapshot_count ?? 0,
    p_notes: params.notes || null,
    p_tags: params.tags || null,
    p_resource_id: params.resource_id || null,
  });

  if (error) {
    console.error('Error upserting VM:', error);
    throw error;
  }

  return data as string;
}

/**
 * Atomic delete for physical servers.
 * Removes both servers and resources rows in a single transaction.
 */
export async function deletePhysicalServer(resourceId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_physical_server', {
    p_resource_id: resourceId,
  });

  if (error) {
    console.error('Error deleting physical server:', error);
    throw error;
  }
}

/**
 * Atomic delete for VMs.
 * Removes both resource_vm_details and resources rows in a single transaction.
 */
export async function deleteVM(resourceId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_vm', {
    p_resource_id: resourceId,
  });

  if (error) {
    console.error('Error deleting VM:', error);
    throw error;
  }
}

// ============================================================
// PHASE B/C: Server Inventory View (Flattened Read)
// ============================================================

/**
 * Fetch servers from the flattened server_inventory_view.
 * This replaces direct reads from the servers table.
 */
export async function getServerInventory(
  siteId: string,
  networkId?: string,
  domainId?: string
): Promise<ServerInventoryView[]> {
  let query = supabase
    .from('server_inventory_view')
    .select('*')
    .eq('site_id', siteId);

  if (networkId) {
    query = query.eq('network_id', networkId);
  }

  if (domainId) {
    query = query.eq('domain_id', domainId);
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching server inventory:', error);
    throw error;
  }

  return (data || []) as ServerInventoryView[];
}

/**
 * Find existing server by deterministic match (site_id + hostname OR site_id + ip_address).
 * Used for idempotent imports.
 */
export async function findExistingServerInView(
  siteId: string,
  hostname?: string,
  ipAddress?: string
): Promise<ServerInventoryView | null> {
  if (!hostname && !ipAddress) return null;

  let query = supabase
    .from('server_inventory_view')
    .select('*')
    .eq('site_id', siteId);

  // Build OR condition for hostname and IP
  const conditions: string[] = [];
  if (hostname) {
    conditions.push(`name.ilike.${hostname}`);
  }
  if (ipAddress) {
    conditions.push(`ip_address.eq.${ipAddress}`);
  }

  if (conditions.length > 0) {
    query = query.or(conditions.join(','));
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error('Error finding existing server:', error);
    return null;
  }

  return data as ServerInventoryView | null;
}
