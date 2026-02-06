// ============================================================
// PHASE 1: Resource Service - Unified Inventory CRUD
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
