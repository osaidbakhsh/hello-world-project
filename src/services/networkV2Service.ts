// ============================================================
// PHASE 1: Network V2 Service - Polymorphic Scoping
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  NetworkV2,
  NetworkV2CreateInput,
  NetworkV2UpdateInput,
  NetworkScopeType,
} from '@/types/resources';

// ============================================================
// Network V2 CRUD Operations
// ============================================================

export interface NetworkV2Filters {
  site_id?: string;
  scope_type?: NetworkScopeType;
  scope_id?: string;
  is_management?: boolean;
  search?: string;
}

export async function getNetworksV2(filters?: NetworkV2Filters): Promise<NetworkV2[]> {
  let query = supabase
    .from('networks_v2')
    .select(`
      *,
      sites:site_id (name),
      clusters:scope_id (name)
    `)
    .order('name');

  if (filters?.site_id) {
    query = query.eq('site_id', filters.site_id);
  }
  if (filters?.scope_type) {
    query = query.eq('scope_type', filters.scope_type);
  }
  if (filters?.scope_id) {
    query = query.eq('scope_id', filters.scope_id);
  }
  if (filters?.is_management !== undefined) {
    query = query.eq('is_management', filters.is_management);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,cidr.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching networks:', error);
    throw error;
  }

  return (data || []) as unknown as NetworkV2[];
}

export async function getNetworkV2ById(id: string): Promise<NetworkV2 | null> {
  const { data, error } = await supabase
    .from('networks_v2')
    .select(`
      *,
      sites:site_id (name),
      clusters:scope_id (name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching network:', error);
    throw error;
  }

  return data as unknown as NetworkV2;
}

export async function createNetworkV2(input: NetworkV2CreateInput): Promise<NetworkV2> {
  // If scope_type is 'site', set scope_id to site_id
  const payload = {
    ...input,
    scope_id: input.scope_type === 'site' ? input.site_id : input.scope_id,
  };

  const { data, error } = await supabase
    .from('networks_v2')
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating network:', error);
    throw error;
  }

  return data as unknown as NetworkV2;
}

export async function updateNetworkV2(id: string, input: NetworkV2UpdateInput): Promise<NetworkV2> {
  const { data, error } = await supabase
    .from('networks_v2')
    .update(input as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating network:', error);
    throw error;
  }

  return data as unknown as NetworkV2;
}

export async function deleteNetworkV2(id: string): Promise<void> {
  const { error } = await supabase
    .from('networks_v2')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting network:', error);
    throw error;
  }
}

// ============================================================
// Network Aggregations
// ============================================================

export interface NetworkV2Stats {
  total: number;
  by_scope_type: Record<NetworkScopeType, number>;
  management_networks: number;
  with_vlan: number;
}

export async function getNetworkV2Stats(siteId?: string): Promise<NetworkV2Stats> {
  let query = supabase.from('networks_v2').select('scope_type, is_management, vlan_id');
  
  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const networks = data || [];
  
  const stats: NetworkV2Stats = {
    total: networks.length,
    by_scope_type: { site: 0, cluster: 0 },
    management_networks: 0,
    with_vlan: 0,
  };

  networks.forEach((n: any) => {
    if (n.scope_type) stats.by_scope_type[n.scope_type as NetworkScopeType]++;
    if (n.is_management) stats.management_networks++;
    if (n.vlan_id) stats.with_vlan++;
  });

  return stats;
}

// ============================================================
// Utility Functions
// ============================================================

export async function getNetworksForCluster(clusterId: string): Promise<NetworkV2[]> {
  return getNetworksV2({ scope_type: 'cluster', scope_id: clusterId });
}

export async function getSiteWideNetworks(siteId: string): Promise<NetworkV2[]> {
  return getNetworksV2({ site_id: siteId, scope_type: 'site' });
}
