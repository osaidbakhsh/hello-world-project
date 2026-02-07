// ============================================================
// Optimized Supabase Data Hooks with React Query
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Domain, Network, Server, Task, Vacation, EmployeeReport, License, Profile, YearlyGoal, DomainMembership } from '@/types/supabase-models';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains, useSiteProfileIds } from '@/hooks/useSiteDomains';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useState } from 'react';

// ============================================================
// Types
// ============================================================
export interface WebsiteApplication {
  id: string;
  name: string;
  url: string;
  category: string | null;
  icon: string | null;
  description: string | null;
  domain_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  sort_order: number;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  related_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================
// Query Keys - Centralized for consistency
// ============================================================
export const queryKeys = {
  domains: (siteId?: string) => ['domains', siteId] as const,
  networks: (siteId?: string, domainId?: string) => ['networks', siteId, domainId] as const,
  servers: (siteId?: string, networkId?: string) => ['servers', siteId, networkId] as const,
  tasks: (siteId?: string) => ['tasks', siteId] as const,
  vacations: (siteId?: string) => ['vacations', siteId] as const,
  licenses: (siteId?: string) => ['licenses', siteId] as const,
  profiles: (siteId?: string) => ['profiles', siteId] as const,
  employeeReports: (siteId?: string) => ['employee-reports', siteId] as const,
  yearlyGoals: (profileId?: string) => ['yearly-goals', profileId] as const,
  domainMemberships: (profileId?: string) => ['domain-memberships', profileId] as const,
  dashboardStats: (siteId?: string, domainId?: string) => ['dashboard-stats', siteId, domainId] as const,
  webApps: (siteId?: string) => ['web-apps', siteId] as const,
  notifications: (userId?: string) => ['notifications', userId] as const,
};

// ============================================================
// Domain hooks - filtered by selected site
// ============================================================
export function useDomains() {
  const { selectedSite } = useSite();

  const query = useQuery({
    queryKey: queryKeys.domains(selectedSite?.id),
    queryFn: async () => {
      let q = supabase.from('domains').select('*').order('name', { ascending: true });
      if (selectedSite) {
        q = q.eq('site_id', selectedSite.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as Domain[]) || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// Network hooks - filtered by site domains
// ============================================================
export function useNetworks(domainId?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();

  const query = useQuery({
    queryKey: queryKeys.networks(selectedSite?.id, domainId),
    queryFn: async () => {
      let q = supabase.from('networks').select('*');
      
      if (domainId) {
        q = q.eq('domain_id', domainId);
      } else if (siteDomainIds.length > 0) {
        q = q.in('domain_id', siteDomainIds);
      } else if (selectedSite) {
        return []; // No domains for this site
      }
      
      const { data, error } = await q.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !domainsLoading && (!!domainId || siteDomainIds.length > 0 || !selectedSite),
    staleTime: 60 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || domainsLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Server hooks - filtered by site
// ============================================================
export function useServers(networkId?: string) {
  const { selectedSite } = useSite();
  const { data: siteNetworks = [], isLoading: networksLoading } = useNetworks();

  const query = useQuery({
    queryKey: queryKeys.servers(selectedSite?.id, networkId),
    queryFn: async () => {
      if (!selectedSite) {
        const { data, error } = await supabase.from('server_inventory_view').select('*').order('name');
        if (error) throw error;
        return (data || []).map((row: any) => ({
          ...row,
          id: row.server_id || row.id,
          resource_id: row.id || row.resource_id,
        }));
      }
      
      let q = supabase.from('server_inventory_view').select('*').eq('site_id', selectedSite.id);
      
      if (networkId) {
        q = q.eq('network_id', networkId);
      } else if (siteNetworks.length > 0) {
        const siteNetworkIds = siteNetworks.map(n => n.id);
        q = q.in('network_id', siteNetworkIds);
      } else {
        return [];
      }
      
      const { data, error } = await q.order('name');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        id: row.server_id || row.id,
        resource_id: row.id || row.resource_id,
      }));
    },
    enabled: !networksLoading,
    staleTime: 60 * 1000,
  });

  return {
    data: (query.data as Server[]) || [],
    isLoading: query.isLoading || networksLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Task hooks - filtered by site via assigned_to profile membership
// ============================================================
export function useTasks() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds, isLoading: profilesLoading } = useSiteProfileIds();

  const query = useQuery({
    queryKey: queryKeys.tasks(selectedSite?.id),
    queryFn: async () => {
      let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      if (siteProfileIds && siteProfileIds.length > 0) {
        q = q.in('assigned_to', siteProfileIds);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as Task[]) || [];
    },
    enabled: !profilesLoading,
    staleTime: 30 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || profilesLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// Vacation hooks - filtered by site via profile membership
// ============================================================
export function useVacations() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds, isLoading: profilesLoading } = useSiteProfileIds();

  const query = useQuery({
    queryKey: queryKeys.vacations(selectedSite?.id),
    queryFn: async () => {
      let q = supabase.from('vacations').select('*').order('created_at', { ascending: false });
      
      if (siteProfileIds && siteProfileIds.length > 0) {
        q = q.in('profile_id', siteProfileIds);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as Vacation[]) || [];
    },
    enabled: !profilesLoading,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || profilesLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// Employee Reports hooks - filtered by site via profile membership
// ============================================================
export function useEmployeeReports() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();

  const query = useQuery({
    queryKey: queryKeys.employeeReports(selectedSite?.id),
    queryFn: async () => {
      let q = supabase.from('employee_reports').select('*').order('created_at', { ascending: false });
      
      if (selectedSite && siteProfileIds.length > 0) {
        q = q.in('profile_id', siteProfileIds);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as EmployeeReport[]) || [];
    },
    staleTime: 60 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// License hooks - filtered by site via domain
// ============================================================
export function useLicenses() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();

  const query = useQuery({
    queryKey: queryKeys.licenses(selectedSite?.id),
    queryFn: async () => {
      let q = supabase.from('licenses').select('*').order('expiry_date', { ascending: true });
      
      if (selectedSite && siteDomainIds.length > 0) {
        q = q.in('domain_id', siteDomainIds);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as License[]) || [];
    },
    enabled: !domainsLoading || !selectedSite,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || domainsLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// Profile hooks - filtered by site via domain membership
// ============================================================
export function useProfiles() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds, isLoading: profilesLoading } = useSiteProfileIds();

  const query = useQuery({
    queryKey: queryKeys.profiles(selectedSite?.id),
    queryFn: async () => {
      let q = supabase.from('profiles').select('*').order('full_name', { ascending: true });
      
      // Only filter if we have profile IDs; null means show all
      if (selectedSite && siteProfileIds && siteProfileIds.length > 0) {
        q = q.in('id', siteProfileIds);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as Profile[]) || [];
    },
    enabled: !profilesLoading,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || profilesLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// Yearly Goals hooks
// ============================================================
export function useYearlyGoals(profileId?: string) {
  const query = useQuery({
    queryKey: queryKeys.yearlyGoals(profileId),
    queryFn: async () => {
      let q = supabase.from('yearly_goals').select('*');
      if (profileId) {
        q = q.eq('profile_id', profileId);
      }
      const { data, error } = await q.order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  return {
    data: (query.data as YearlyGoal[]) || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Domain Memberships hooks
// ============================================================
export function useDomainMemberships(profileId?: string) {
  const query = useQuery({
    queryKey: queryKeys.domainMemberships(profileId),
    queryFn: async () => {
      let q = supabase.from('domain_memberships').select('*');
      if (profileId) {
        q = q.eq('profile_id', profileId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  return {
    data: (query.data as DomainMembership[]) || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// App Settings - App Name
// ============================================================
export function useAppName() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['app-name'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'app_name')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value || 'IT';
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateAppName = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newName, updated_at: new Date().toISOString() })
        .eq('key', 'app_name');
      
      if (!error) {
        queryClient.setQueryData(['app-name'], newName);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating app name:', e);
      return false;
    }
  };

  return { 
    appName: query.data || 'IT', 
    isLoading: query.isLoading, 
    updateAppName, 
    refetch: query.refetch 
  };
}

// ============================================================
// App Settings - General
// ============================================================
export function useAppSettings() {
  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      
      if (!error && data?.value) {
        return data.value;
      }
      return null;
    } catch (e) {
      console.error(`Error fetching setting ${key}:`, e);
      return null;
    }
  }, []);

  const updateSetting = async (key: string, value: string): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        return !error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ key, value });
        return !error;
      }
    } catch (e) {
      console.error(`Error updating setting ${key}:`, e);
      return false;
    }
  };

  return { getSetting, updateSetting };
}

// ============================================================
// Dashboard Stats - Optimized with single query
// ============================================================
export function useDashboardStats(selectedDomainId?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();
  const { data: siteProfileIds = [], isLoading: profilesLoading } = useSiteProfileIds();

  const query = useQuery({
    queryKey: queryKeys.dashboardStats(selectedSite?.id, selectedDomainId),
    queryFn: async () => {
      const domainIdsToUse = selectedDomainId 
        ? [selectedDomainId] 
        : (selectedSite && siteDomainIds.length > 0 ? siteDomainIds : []);

      // Parallel fetch all data
      const [resourcesRes, tasksRes, licensesRes, profilesRes, networksRes] = await Promise.all([
        // Resources
        selectedSite 
          ? supabase.from('resources').select('resource_type, status').eq('site_id', selectedSite.id)
          : supabase.from('resources').select('resource_type, status'),
        
        // Tasks
        siteProfileIds.length > 0
          ? supabase.from('tasks').select('status, task_status, due_date').in('assigned_to', siteProfileIds)
          : supabase.from('tasks').select('status, task_status, due_date'),
        
        // Licenses
        domainIdsToUse.length > 0
          ? supabase.from('licenses').select('expiry_date').in('domain_id', domainIdsToUse)
          : supabase.from('licenses').select('expiry_date'),
        
        // Profiles
        siteProfileIds.length > 0
          ? supabase.from('profiles').select('id').in('id', siteProfileIds)
          : supabase.from('profiles').select('id'),
        
        // Networks
        domainIdsToUse.length > 0
          ? supabase.from('networks').select('id').in('domain_id', domainIdsToUse)
          : supabase.from('networks').select('id'),
      ]);

      const resourcesData = resourcesRes.data || [];
      const tasksData = tasksRes.data || [];
      const licensesData = licensesRes.data || [];
      const profilesData = profilesRes.data || [];
      const networksData = networksRes.data || [];

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const physicalServers = resourcesData.filter(r => r.resource_type === 'physical_server');
      const activeServers = physicalServers.filter(s => s.status === 'online');

      const completedTasks = tasksData.filter(t => 
        t.status === 'completed' || (t as any).task_status === 'done'
      ).length;
      
      const pendingTasks = tasksData.filter(t => 
        t.status !== 'completed' && (t as any).task_status !== 'done'
      ).length;
      
      const overdueTasks = tasksData.filter(t => 
        t.due_date && 
        new Date(t.due_date) < now && 
        t.status !== 'completed' && 
        (t as any).task_status !== 'done'
      ).length;

      // Calculate VM and total resources counts
      const vms = resourcesData.filter(r => r.resource_type === 'vm');
      const activeResources = resourcesData.filter(r => r.status === 'online');

      return {
        totalResources: resourcesData.length,
        totalVMs: vms.length,
        totalServers: physicalServers.length,
        activeServers: activeServers.length,
        activeResources: activeResources.length,
        totalTasks: tasksData.length,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalLicenses: licensesData.length,
        expiringLicenses: licensesData.filter(l => l.expiry_date && new Date(l.expiry_date) <= thirtyDaysFromNow).length,
        totalEmployees: profilesData.length,
        totalNetworks: networksData.length,
      };
    },
    enabled: !domainsLoading && !profilesLoading,
    staleTime: 30 * 1000,
  });

  return {
    stats: query.data || {
      totalResources: 0,
      totalVMs: 0,
      totalServers: 0,
      activeServers: 0,
      activeResources: 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      totalLicenses: 0,
      expiringLicenses: 0,
      totalEmployees: 0,
      totalNetworks: 0,
    },
    isLoading: query.isLoading || domainsLoading || profilesLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Web Applications hooks
// ============================================================
export function useWebsiteApplications(includeInactive?: boolean) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();

  const query = useQuery({
    queryKey: [...queryKeys.webApps(selectedSite?.id), includeInactive],
    queryFn: async () => {
      let q = supabase.from('website_applications').select('*').order('sort_order');
      
      if (selectedSite && siteDomainIds.length > 0) {
        q = q.in('domain_id', siteDomainIds);
      }
      
      if (!includeInactive) {
        q = q.eq('is_active', true);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as WebsiteApplication[]) || [];
    },
    enabled: !domainsLoading || !selectedSite,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || domainsLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Notifications hooks
// ============================================================
export function useNotificationsData() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.notifications(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data as Notification[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Audit Logs hooks
// ============================================================
export function useAuditLogs(filters?: { 
  startDate?: Date; 
  endDate?: Date; 
  action?: string;
  tableName?: string;
}) {
  const query = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filters?.action) {
        q = q.eq('action', filters.action);
      }
      if (filters?.tableName) {
        q = q.eq('table_name', filters.tableName);
      }
      if (filters?.startDate) {
        q = q.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        q = q.lte('created_at', filters.endDate.toISOString());
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data as AuditLog[]) || [];
    },
    staleTime: 30 * 1000,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// Hook for invalidating related queries
// ============================================================
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  const { selectedSite } = useSite();

  return {
    invalidateDomains: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
    invalidateNetworks: () => queryClient.invalidateQueries({ queryKey: ['networks'] }),
    invalidateServers: () => queryClient.invalidateQueries({ queryKey: ['servers'] }),
    invalidateTasks: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    invalidateVacations: () => queryClient.invalidateQueries({ queryKey: ['vacations'] }),
    invalidateLicenses: () => queryClient.invalidateQueries({ queryKey: ['licenses'] }),
    invalidateProfiles: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['networks'] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  };
}

// ============================================================
// Server Mutations
// ============================================================
export function useServerMutations() {
  const queryClient = useQueryClient();

  const createServer = async (data: any) => {
    const { data: result, error } = await supabase
      .from('servers')
      .insert(data)
      .select()
      .single();
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
    return { data: result, error };
  };

  const updateServer = async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('servers')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
    return { data: result, error };
  };

  const deleteServer = async (id: string) => {
    const { error } = await supabase
      .from('servers')
      .delete()
      .eq('id', id);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
    return { error };
  };

  return { createServer, updateServer, deleteServer };
}

// ============================================================
// License Mutations
// ============================================================
export function useLicenseMutations() {
  const queryClient = useQueryClient();

  const createLicense = async (data: any) => {
    const { data: result, error } = await supabase
      .from('licenses')
      .insert(data)
      .select()
      .single();
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
    return { data: result, error };
  };

  const updateLicense = async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('licenses')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
    return { data: result, error };
  };

  const deleteLicense = async (id: string) => {
    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('id', id);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
    return { error };
  };

  return { createLicense, updateLicense, deleteLicense };
}
