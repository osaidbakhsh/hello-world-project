/**
 * AD Integration Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';
import type { 
  DomainIntegration, 
  IntegrationRun, 
  ADSnapshot, 
  ADUser, 
  ADComputer, 
  ADGroup, 
  ADDomainController,
  ScanAgent 
} from '@/types/ad-integration';
import { toast } from 'sonner';

// ============================================================
// Query Keys
// ============================================================
export const adKeys = {
  all: ['ad'] as const,
  integrations: () => [...adKeys.all, 'integrations'] as const,
  integration: (id: string) => [...adKeys.integrations(), id] as const,
  runs: (integrationId: string) => [...adKeys.all, 'runs', integrationId] as const,
  snapshots: (domainId: string) => [...adKeys.all, 'snapshots', domainId] as const,
  latestSnapshot: (domainId: string) => [...adKeys.snapshots(domainId), 'latest'] as const,
  users: (domainId: string) => [...adKeys.all, 'users', domainId] as const,
  computers: (domainId: string) => [...adKeys.all, 'computers', domainId] as const,
  groups: (domainId: string) => [...adKeys.all, 'groups', domainId] as const,
  dcs: (domainId: string) => [...adKeys.all, 'dcs', domainId] as const,
  agents: () => [...adKeys.all, 'agents'] as const,
  agent: (id: string) => [...adKeys.agents(), id] as const,
};

// ============================================================
// Domain Integrations
// ============================================================
export function useDomainIntegrations(domainId?: string) {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: adKeys.integrations(),
    queryFn: async () => {
      let query = supabase
        .from('domain_integrations')
        .select('*, domains(name, fqdn), scan_agents(name, status)')
        .order('created_at', { ascending: false });

      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else if (selectedSite) {
        query = query.eq('site_id', selectedSite.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (DomainIntegration & { domains: { name: string; fqdn: string | null }; scan_agents: { name: string; status: string } | null })[];
    },
    enabled: !!selectedSite || !!domainId,
  });
}

export function useDomainIntegration(integrationId: string) {
  return useQuery({
    queryKey: adKeys.integration(integrationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_integrations')
        .select('*, domains(name, fqdn), scan_agents(name, status)')
        .eq('id', integrationId)
        .single();
      if (error) throw error;
      return data as DomainIntegration & { domains: { name: string; fqdn: string | null }; scan_agents: { name: string; status: string } | null };
    },
    enabled: !!integrationId,
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DomainIntegration> & { id: string }) => {
      const { data, error } = await supabase
        .from('domain_integrations')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adKeys.integrations() });
      toast.success('Integration updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update integration: ${error.message}`);
    },
  });
}

// ============================================================
// Integration Runs
// ============================================================
export function useIntegrationRuns(integrationId: string, limit = 20) {
  return useQuery({
    queryKey: adKeys.runs(integrationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_runs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as IntegrationRun[];
    },
    enabled: !!integrationId,
  });
}

// ============================================================
// AD Snapshots
// ============================================================
export function useADSnapshots(domainId: string, limit = 30) {
  return useQuery({
    queryKey: adKeys.snapshots(domainId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_snapshots')
        .select('*')
        .eq('domain_id', domainId)
        .order('captured_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ADSnapshot[];
    },
    enabled: !!domainId,
  });
}

export function useLatestADSnapshot(domainId: string) {
  return useQuery({
    queryKey: adKeys.latestSnapshot(domainId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_snapshots')
        .select('*')
        .eq('domain_id', domainId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ADSnapshot | null;
    },
    enabled: !!domainId,
  });
}

// ============================================================
// AD Users
// ============================================================
export function useADUsers(domainId: string, capturedAt?: string) {
  return useQuery({
    queryKey: [...adKeys.users(domainId), capturedAt],
    queryFn: async () => {
      let query = supabase
        .from('ad_users')
        .select('*')
        .eq('domain_id', domainId)
        .order('sam_account_name');

      if (capturedAt) {
        query = query.eq('captured_at', capturedAt);
      } else {
        // Get latest capture
        const { data: latest } = await supabase
          .from('ad_snapshots')
          .select('captured_at')
          .eq('domain_id', domainId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latest) {
          query = query.eq('captured_at', latest.captured_at);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ADUser[];
    },
    enabled: !!domainId,
  });
}

// ============================================================
// AD Computers
// ============================================================
export function useADComputers(domainId: string, capturedAt?: string) {
  return useQuery({
    queryKey: [...adKeys.computers(domainId), capturedAt],
    queryFn: async () => {
      let query = supabase
        .from('ad_computers')
        .select('*')
        .eq('domain_id', domainId)
        .order('name');

      if (capturedAt) {
        query = query.eq('captured_at', capturedAt);
      } else {
        const { data: latest } = await supabase
          .from('ad_snapshots')
          .select('captured_at')
          .eq('domain_id', domainId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latest) {
          query = query.eq('captured_at', latest.captured_at);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ADComputer[];
    },
    enabled: !!domainId,
  });
}

// ============================================================
// AD Groups
// ============================================================
export function useADGroups(domainId: string, capturedAt?: string) {
  return useQuery({
    queryKey: [...adKeys.groups(domainId), capturedAt],
    queryFn: async () => {
      let query = supabase
        .from('ad_groups')
        .select('*')
        .eq('domain_id', domainId)
        .order('name');

      if (capturedAt) {
        query = query.eq('captured_at', capturedAt);
      } else {
        const { data: latest } = await supabase
          .from('ad_snapshots')
          .select('captured_at')
          .eq('domain_id', domainId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latest) {
          query = query.eq('captured_at', latest.captured_at);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ADGroup[];
    },
    enabled: !!domainId,
  });
}

// ============================================================
// AD Domain Controllers
// ============================================================
export function useADDomainControllers(domainId: string, capturedAt?: string) {
  return useQuery({
    queryKey: [...adKeys.dcs(domainId), capturedAt],
    queryFn: async () => {
      let query = supabase
        .from('ad_domain_controllers')
        .select('*')
        .eq('domain_id', domainId)
        .order('name');

      if (capturedAt) {
        query = query.eq('captured_at', capturedAt);
      } else {
        const { data: latest } = await supabase
          .from('ad_snapshots')
          .select('captured_at')
          .eq('domain_id', domainId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latest) {
          query = query.eq('captured_at', latest.captured_at);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ADDomainController[];
    },
    enabled: !!domainId,
  });
}

// ============================================================
// Agents
// ============================================================
export function useScanAgents() {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: adKeys.agents(),
    queryFn: async () => {
      let query = supabase
        .from('scan_agents')
        .select('*, domains(name)')
        .order('created_at', { ascending: false });

      if (selectedSite) {
        query = query.or(`site_id.eq.${selectedSite.id},domains.site_id.eq.${selectedSite.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (ScanAgent & { domains: { name: string } })[];
    },
    enabled: !!selectedSite,
  });
}

export function useScanAgent(agentId: string) {
  return useQuery({
    queryKey: adKeys.agent(agentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scan_agents')
        .select('*, domains(name)')
        .eq('id', agentId)
        .single();
      if (error) throw error;
      return data as ScanAgent & { domains: { name: string } };
    },
    enabled: !!agentId,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agent: { 
      name: string; 
      domain_id: string; 
      site_id?: string;
      agent_type?: string; 
    }) => {
      // Generate a random token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();
      
      // Hash the token (we'll store only the hash)
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: newAgent, error } = await supabase
        .from('scan_agents')
        .insert({
          name: agent.name,
          domain_id: agent.domain_id,
          site_id: agent.site_id,
          agent_type: agent.agent_type || 'windows-ad',
          auth_token_hash: tokenHash,
          status: 'OFFLINE',
        })
        .select()
        .single();

      if (error) throw error;

      // Return both the agent and the plain token (shown once)
      return { agent: newAgent, token };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adKeys.agents() });
      toast.success('Agent created. Save the token - it will only be shown once!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('scan_agents')
        .delete()
        .eq('id', agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adKeys.agents() });
      toast.success('Agent deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete agent: ${error.message}`);
    },
  });
}

export function useRotateAgentToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      // Generate a new token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();
      
      // Hash the token
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('scan_agents')
        .update({ auth_token_hash: tokenHash })
        .eq('id', agentId);

      if (error) throw error;

      return { token };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adKeys.agents() });
      toast.success('Token rotated. Save the new token - it will only be shown once!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to rotate token: ${error.message}`);
    },
  });
}
