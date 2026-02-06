// ============================================================
// PHASE 1: Networks V2 Hook - React Query Integration
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSite } from '@/contexts/SiteContext';
import {
  getNetworksV2,
  getNetworkV2ById,
  createNetworkV2,
  updateNetworkV2,
  deleteNetworkV2,
  getNetworkV2Stats,
  getNetworksForCluster,
  getSiteWideNetworks,
  type NetworkV2Filters,
} from '@/services/networkV2Service';
import type {
  NetworkV2CreateInput,
  NetworkV2UpdateInput,
} from '@/types/resources';
import { toast } from 'sonner';

// ============================================================
// Query Keys
// ============================================================
export const networkV2Keys = {
  all: ['networks-v2'] as const,
  lists: () => [...networkV2Keys.all, 'list'] as const,
  list: (filters?: NetworkV2Filters) => [...networkV2Keys.lists(), filters] as const,
  details: () => [...networkV2Keys.all, 'detail'] as const,
  detail: (id: string) => [...networkV2Keys.details(), id] as const,
  stats: (siteId?: string) => [...networkV2Keys.all, 'stats', siteId] as const,
  forCluster: (clusterId: string) => [...networkV2Keys.all, 'cluster', clusterId] as const,
  siteWide: (siteId: string) => [...networkV2Keys.all, 'site-wide', siteId] as const,
};

// ============================================================
// List Hook
// ============================================================
export function useNetworksV2(filters?: Omit<NetworkV2Filters, 'site_id'>) {
  const { selectedSite } = useSite();
  
  const fullFilters: NetworkV2Filters = {
    ...filters,
    site_id: selectedSite?.id,
  };

  return useQuery({
    queryKey: networkV2Keys.list(fullFilters),
    queryFn: () => getNetworksV2(fullFilters),
    enabled: !!selectedSite,
  });
}

// ============================================================
// Detail Hook
// ============================================================
export function useNetworkV2(id: string | undefined) {
  return useQuery({
    queryKey: networkV2Keys.detail(id!),
    queryFn: () => getNetworkV2ById(id!),
    enabled: !!id,
  });
}

// ============================================================
// Stats Hook
// ============================================================
export function useNetworkV2Stats() {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: networkV2Keys.stats(selectedSite?.id),
    queryFn: () => getNetworkV2Stats(selectedSite?.id),
    enabled: !!selectedSite,
  });
}

// ============================================================
// Cluster Networks Hook
// ============================================================
export function useClusterNetworks(clusterId: string | undefined) {
  return useQuery({
    queryKey: networkV2Keys.forCluster(clusterId!),
    queryFn: () => getNetworksForCluster(clusterId!),
    enabled: !!clusterId,
  });
}

// ============================================================
// Site-Wide Networks Hook
// ============================================================
export function useSiteWideNetworks() {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: networkV2Keys.siteWide(selectedSite?.id!),
    queryFn: () => getSiteWideNetworks(selectedSite?.id!),
    enabled: !!selectedSite,
  });
}

// ============================================================
// Mutations
// ============================================================
export function useCreateNetworkV2() {
  const queryClient = useQueryClient();
  const { selectedSite } = useSite();

  return useMutation({
    mutationFn: (input: Omit<NetworkV2CreateInput, 'site_id'>) =>
      createNetworkV2({ ...input, site_id: selectedSite!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: networkV2Keys.lists() });
      queryClient.invalidateQueries({ queryKey: networkV2Keys.stats() });
      toast.success('Network created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create network: ${error.message}`);
    },
  });
}

export function useUpdateNetworkV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NetworkV2UpdateInput }) =>
      updateNetworkV2(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: networkV2Keys.lists() });
      queryClient.invalidateQueries({ queryKey: networkV2Keys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: networkV2Keys.stats() });
      toast.success('Network updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update network: ${error.message}`);
    },
  });
}

export function useDeleteNetworkV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNetworkV2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: networkV2Keys.lists() });
      queryClient.invalidateQueries({ queryKey: networkV2Keys.stats() });
      toast.success('Network deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete network: ${error.message}`);
    },
  });
}
