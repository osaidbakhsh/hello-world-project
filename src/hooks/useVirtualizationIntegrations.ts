// ============================================================
// VIRTUALIZATION INTEGRATIONS HOOK
// Manages hypervisor integrations with preview/sync modes
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  VirtualizationIntegration,
  VirtualizationIntegrationCreateInput,
  VirtualizationIntegrationUpdateInput,
  VirtualizationIntegrationWithDetails,
  VirtualizationIntegrationFilters,
  VirtualizationSyncRun,
  DiscoveredResource,
  DiscoveredResourceFilters,
  TestConnectionRequest,
  TestConnectionResponse,
  RunPreviewResponse,
  RunSyncResponse,
  IntegrationConfig,
  IntegrationType,
  IntegrationStatus,
  IntegrationMode,
} from '@/types/virtualization';
import { toast } from 'sonner';

const QUERY_KEY = 'virtualization-integrations';
const SYNC_RUNS_KEY = 'virtualization-sync-runs';
const DISCOVERED_KEY = 'discovered-resources';

// ============================================================
// Integration CRUD
// ============================================================

export function useVirtualizationIntegrations(filters?: VirtualizationIntegrationFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async (): Promise<VirtualizationIntegrationWithDetails[]> => {
      let query = supabase
        .from('virtualization_integrations')
        .select(`
          *,
          sites:site_id (name),
          domains:domain_id (name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.site_id) {
        query = query.eq('site_id', filters.site_id);
      }
      if (filters?.integration_type) {
        query = query.eq('integration_type', filters.integration_type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.mode) {
        query = query.eq('mode', filters.mode);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching integrations:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        ...item,
        integration_type: item.integration_type as IntegrationType,
        status: item.status as IntegrationStatus,
        mode: item.mode as IntegrationMode,
        config_json: item.config_json as IntegrationConfig,
        site_name: item.sites?.name,
        domain_name: item.domains?.name,
      })) as VirtualizationIntegrationWithDetails[];
    },
  });
}

export function useVirtualizationIntegration(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<VirtualizationIntegrationWithDetails | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('virtualization_integrations')
        .select(`
          *,
          sites:site_id (name),
          domains:domain_id (name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        ...data,
        integration_type: data.integration_type as IntegrationType,
        status: data.status as IntegrationStatus,
        mode: data.mode as IntegrationMode,
        config_json: data.config_json as IntegrationConfig,
        site_name: (data as any).sites?.name,
        domain_name: (data as any).domains?.name,
      } as VirtualizationIntegrationWithDetails;
    },
    enabled: !!id,
  });
}

export function useCreateVirtualizationIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VirtualizationIntegrationCreateInput): Promise<VirtualizationIntegration> => {
      const { data, error } = await supabase
        .from('virtualization_integrations')
        .insert(input as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as VirtualizationIntegration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Integration created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create integration: ${error.message}`);
    },
  });
}

export function useUpdateVirtualizationIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: VirtualizationIntegrationUpdateInput & { id: string }): Promise<VirtualizationIntegration> => {
      const { data, error } = await supabase
        .from('virtualization_integrations')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as VirtualizationIntegration;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      toast.success('Integration updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update integration: ${error.message}`);
    },
  });
}

export function useDeleteVirtualizationIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('virtualization_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Integration deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete integration: ${error.message}`);
    },
  });
}

// ============================================================
// Sync Runs
// ============================================================

export function useSyncRuns(integrationId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: [SYNC_RUNS_KEY, integrationId, limit],
    queryFn: async (): Promise<VirtualizationSyncRun[]> => {
      if (!integrationId) return [];

      const { data, error } = await supabase
        .from('virtualization_sync_runs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as VirtualizationSyncRun[];
    },
    enabled: !!integrationId,
  });
}

// ============================================================
// Discovered Resources
// ============================================================

export function useDiscoveredResources(filters: DiscoveredResourceFilters) {
  return useQuery({
    queryKey: [DISCOVERED_KEY, filters],
    queryFn: async (): Promise<DiscoveredResource[]> => {
      let query = supabase
        .from('discovered_resources')
        .select('*')
        .eq('integration_id', filters.integration_id)
        .order('discovered_at', { ascending: false });

      if (filters.run_id) {
        query = query.eq('run_id', filters.run_id);
      }
      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.diff_action) {
        query = query.eq('diff_action', filters.diff_action);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,external_id.ilike.%${filters.search}%,ip_address.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as DiscoveredResource[];
    },
    enabled: !!filters.integration_id,
  });
}

// ============================================================
// Edge Function Calls (Server-side operations)
// ============================================================

export function useTestConnection() {
  return useMutation({
    mutationFn: async (request: TestConnectionRequest): Promise<TestConnectionResponse> => {
      const { data, error } = await supabase.functions.invoke('virt-test-connection', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });
}

export function useRunPreview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<RunPreviewResponse> => {
      const { data, error } = await supabase.functions.invoke('virt-run-preview', {
        body: { integration_id: integrationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, integrationId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, integrationId] });
      queryClient.invalidateQueries({ queryKey: [SYNC_RUNS_KEY, integrationId] });
      queryClient.invalidateQueries({ queryKey: [DISCOVERED_KEY] });
      toast.success('Preview completed successfully');
    },
    onError: (error) => {
      toast.error(`Preview failed: ${error.message}`);
    },
  });
}

export function useRunSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<RunSyncResponse> => {
      const { data, error } = await supabase.functions.invoke('virt-run-sync', {
        body: { integration_id: integrationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, integrationId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, integrationId] });
      queryClient.invalidateQueries({ queryKey: [SYNC_RUNS_KEY, integrationId] });
      queryClient.invalidateQueries({ queryKey: [DISCOVERED_KEY] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Sync completed successfully');
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}
