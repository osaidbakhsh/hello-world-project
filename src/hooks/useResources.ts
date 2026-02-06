// ============================================================
// PHASE 1: Resources Hook - React Query Integration
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSite } from '@/contexts/SiteContext';
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourceStats,
  searchResources,
  upsertVMDetails,
  upsertServerDetails,
} from '@/services/resourceService';
import type {
  ResourceFilters,
  ResourceCreateInput,
  ResourceUpdateInput,
  ResourceVMDetailsInput,
  ResourceServerDetailsInput,
} from '@/types/resources';
import { toast } from 'sonner';

// ============================================================
// Query Keys
// ============================================================
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filters?: ResourceFilters) => [...resourceKeys.lists(), filters] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  stats: (siteId?: string) => [...resourceKeys.all, 'stats', siteId] as const,
  search: (query: string, siteId?: string) => [...resourceKeys.all, 'search', query, siteId] as const,
};

// ============================================================
// List Hook
// ============================================================
export function useResources(filters?: Omit<ResourceFilters, 'site_id'>) {
  const { selectedSite } = useSite();
  
  const fullFilters: ResourceFilters = {
    ...filters,
    site_id: selectedSite?.id,
  };

  return useQuery({
    queryKey: resourceKeys.list(fullFilters),
    queryFn: () => getResources(fullFilters),
    enabled: !!selectedSite,
  });
}

// ============================================================
// Detail Hook
// ============================================================
export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: resourceKeys.detail(id!),
    queryFn: () => getResourceById(id!),
    enabled: !!id,
  });
}

// ============================================================
// Stats Hook
// ============================================================
export function useResourceStats() {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: resourceKeys.stats(selectedSite?.id),
    queryFn: () => getResourceStats(selectedSite?.id),
    enabled: !!selectedSite,
  });
}

// ============================================================
// Search Hook
// ============================================================
export function useResourceSearch(query: string, enabled = true) {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: resourceKeys.search(query, selectedSite?.id),
    queryFn: () => searchResources(query, selectedSite?.id),
    enabled: enabled && query.length >= 2,
  });
}

// ============================================================
// Mutations
// ============================================================
export function useCreateResource() {
  const queryClient = useQueryClient();
  const { selectedSite } = useSite();

  return useMutation({
    mutationFn: (input: Omit<ResourceCreateInput, 'site_id'>) =>
      createResource({ ...input, site_id: selectedSite!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.stats() });
      toast.success('Resource created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create resource: ${error.message}`);
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResourceUpdateInput }) =>
      updateResource(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: resourceKeys.stats() });
      toast.success('Resource updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update resource: ${error.message}`);
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.stats() });
      toast.success('Resource deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete resource: ${error.message}`);
    },
  });
}

// ============================================================
// Detail Mutations
// ============================================================
export function useUpsertVMDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertVMDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(data.resource_id) });
      toast.success('VM details saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save VM details: ${error.message}`);
    },
  });
}

export function useUpsertServerDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertServerDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(data.resource_id) });
      toast.success('Server details saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save server details: ${error.message}`);
    },
  });
}
