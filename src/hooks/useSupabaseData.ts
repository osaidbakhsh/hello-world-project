import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Domain, Network, Server, Task, Vacation, EmployeeReport, License, Profile, YearlyGoal, DomainMembership } from '@/types/supabase-models';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains, useSiteProfileIds } from '@/hooks/useSiteDomains';

// Types for new tables
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
import { useAuth } from '@/contexts/AuthContext';

// Domain hooks - now filtered by selected site
export function useDomains() {
  const { selectedSite } = useSite();
  const [data, setData] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('domains').select('*').order('name', { ascending: true });
      
      if (selectedSite) {
        query = query.eq('site_id', selectedSite.id);
      }
      
      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData((result as Domain[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function useNetworks(domainId?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();
  const [data, setData] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    // Wait for domains to load
    if (!selectedSite || (domainsLoading && !domainId)) {
      setData([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      let query = supabase.from('networks').select('*');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else if (siteDomainIds.length > 0) {
        query = query.in('domain_id', siteDomainIds);
      } else {
        setData([]);
        setIsLoading(false);
        return;
      }
      
      const { data: result, error } = await query.order('name');
      if (error) throw error;
      setData(result || []);
    } catch (e) {
      console.error('Error fetching networks:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [domainId, selectedSite?.id, siteDomainIds, domainsLoading]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Server hooks - filtered by site
export function useServers(networkId?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();
  const [data, setData] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    // Wait for domains to load before fetching servers
    if (!selectedSite || (domainsLoading && !networkId)) {
      setData([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      let query = supabase.from('servers').select('*');
      
      if (networkId) {
        query = query.eq('network_id', networkId);
      } else if (siteDomainIds.length > 0) {
        // Filter by domain_id for servers in the site's domains
        query = query.in('domain_id', siteDomainIds);
      } else {
        // No domains for this site, return empty
        setData([]);
        setIsLoading(false);
        return;
      }
      
      const { data: result, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setData(result || []);
    } catch (e) {
      console.error('Error fetching servers:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [networkId, selectedSite?.id, siteDomainIds, domainsLoading]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Task hooks - filtered by site via assigned_to profile membership
export function useTasks() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  const [data, setData] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      // Filter tasks by profiles in the selected site
      if (selectedSite && siteProfileIds.length > 0) {
        query = query.in('assigned_to', siteProfileIds);
      }
      
      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData((result as Task[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id, siteProfileIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// Vacation hooks - filtered by site via profile membership
export function useVacations() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  const [data, setData] = useState<Vacation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('vacations').select('*').order('created_at', { ascending: false });
      
      if (selectedSite && siteProfileIds.length > 0) {
        query = query.in('profile_id', siteProfileIds);
      }
      
      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData((result as Vacation[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id, siteProfileIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// Employee Reports hooks - filtered by site via profile membership
export function useEmployeeReports() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  const [data, setData] = useState<EmployeeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('employee_reports').select('*').order('created_at', { ascending: false });
      
      if (selectedSite && siteProfileIds.length > 0) {
        query = query.in('profile_id', siteProfileIds);
      }
      
      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData((result as EmployeeReport[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id, siteProfileIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// License hooks - filtered by site via domain
export function useLicenses() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  const [data, setData] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('licenses').select('*').order('expiry_date', { ascending: true });
      
      if (selectedSite && siteDomainIds.length > 0) {
        query = query.in('domain_id', siteDomainIds);
      }
      
      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData((result as License[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id, siteDomainIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// Profile hooks - filtered by site via domain membership
export function useProfiles() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  const [data, setData] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('full_name', { ascending: true });
      
      if (selectedSite && siteProfileIds.length > 0) {
        query = query.in('id', siteProfileIds);
      }
      
      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData((result as Profile[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id, siteProfileIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// Yearly Goals hooks
export function useYearlyGoals(profileId?: string) {
  const [data, setData] = useState<YearlyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('yearly_goals').select('*');
      if (profileId) {
        query = query.eq('profile_id', profileId);
      }
      const { data: result, error } = await query.order('year', { ascending: false });
      if (error) throw error;
      setData(result || []);
    } catch (e) {
      console.error('Error fetching yearly goals:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Domain Memberships hooks
export function useDomainMemberships(profileId?: string) {
  const [data, setData] = useState<DomainMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('domain_memberships').select('*');
      if (profileId) {
        query = query.eq('profile_id', profileId);
      }
      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (e) {
      console.error('Error fetching domain memberships:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// App Settings
export function useAppName() {
  const [appName, setAppName] = useState('IT');
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'app_name')
        .maybeSingle();
      
      if (!error && data?.value) {
        setAppName(data.value);
      }
    } catch (e) {
      console.error('Error fetching app name:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateAppName = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newName, updated_at: new Date().toISOString() })
        .eq('key', 'app_name');
      
      if (!error) {
        setAppName(newName);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating app name:', e);
      return false;
    }
  };

  return { appName, isLoading, updateAppName, refetch: fetch };
}

// App Settings - General
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
      // Try to update first
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
        // Insert new setting
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

// Dashboard stats - filtered by site
export function useDashboardStats(selectedDomainId?: string) {
  const { isAdmin } = useAuth();
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  
  const [stats, setStats] = useState({
    totalServers: 0,
    activeServers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalLicenses: 0,
    expiringLicenses: 0,
    totalEmployees: 0,
    totalNetworks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use site domain IDs or selected domain ID
      const domainIdsToUse = selectedDomainId 
        ? [selectedDomainId] 
        : (selectedSite && siteDomainIds.length > 0 ? siteDomainIds : []);
      
      // Fetch networks for domain filtering
      let networkIds: string[] = [];
      if (domainIdsToUse.length > 0) {
        const { data: domainNetworks } = await supabase
          .from('networks')
          .select('id')
          .in('domain_id', domainIdsToUse);
        networkIds = domainNetworks?.map(n => n.id) || [];
      }

      // Fetch servers - filter by domain_id
      let serversData: any[] = [];
      if (domainIdsToUse.length > 0) {
        const { data } = await supabase
          .from('servers')
          .select('*')
          .in('domain_id', domainIdsToUse);
        serversData = data || [];
      } else {
        const { data } = await supabase.from('servers').select('*');
        serversData = data || [];
      }

      // Fetch tasks - filter by assigned_to profile
      let tasksData: any[] = [];
      if (selectedSite && siteProfileIds.length > 0) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .in('assigned_to', siteProfileIds);
        tasksData = data || [];
      } else {
        const { data } = await supabase.from('tasks').select('*');
        tasksData = data || [];
      }

      // Fetch licenses - filter by domain_id
      let licensesData: any[] = [];
      if (domainIdsToUse.length > 0) {
        const { data } = await supabase
          .from('licenses')
          .select('*')
          .in('domain_id', domainIdsToUse);
        licensesData = data || [];
      } else {
        const { data } = await supabase.from('licenses').select('*');
        licensesData = data || [];
      }

      // Fetch profiles - filter by site profile ids
      let profilesData: any[] = [];
      if (selectedSite && siteProfileIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .in('id', siteProfileIds);
        profilesData = data || [];
      } else {
        const { data } = await supabase.from('profiles').select('*');
        profilesData = data || [];
      }

      // Fetch networks - filter by domain_id
      let networksData: any[] = [];
      if (domainIdsToUse.length > 0) {
        const { data } = await supabase
          .from('networks')
          .select('*')
          .in('domain_id', domainIdsToUse);
        networksData = data || [];
      } else {
        const { data } = await supabase.from('networks').select('*');
        networksData = data || [];
      }

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Calculate task stats using BOTH status AND task_status for Kanban sync
      const completedTasks = tasksData?.filter(t => 
        t.status === 'completed' || (t as any).task_status === 'done'
      ).length || 0;
      
      const pendingTasks = tasksData?.filter(t => 
        t.status !== 'completed' && (t as any).task_status !== 'done'
      ).length || 0;
      
      const overdueTasks = tasksData?.filter(t => 
        t.due_date && 
        new Date(t.due_date) < now && 
        t.status !== 'completed' && 
        (t as any).task_status !== 'done'
      ).length || 0;

      setStats({
        totalServers: serversData.length,
        activeServers: serversData.filter(s => s.status === 'active').length,
        totalTasks: tasksData?.length || 0,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalLicenses: licensesData.length,
        expiringLicenses: licensesData.filter(l => l.expiry_date && new Date(l.expiry_date) <= thirtyDaysFromNow).length,
        totalEmployees: profilesData?.length || 0,
        totalNetworks: networksData?.length || 0,
      });
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDomainId, selectedSite?.id, siteDomainIds, siteProfileIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { stats, isLoading, refetch: fetch };
}

// Website Applications hooks - filtered by site (includes global apps with null domain_id)
export function useWebsiteApplications(includeInactive = false) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  const [data, setData] = useState<WebsiteApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('website_applications')
        .select('*');
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      // Include global apps (null domain_id) + site-specific apps
      if (selectedSite && siteDomainIds.length > 0) {
        // Build OR filter for domain_id in siteDomainIds or domain_id is null
        const domainFilter = siteDomainIds.map(id => `domain_id.eq.${id}`).join(',');
        query = query.or(`domain_id.is.null,${domainFilter}`);
      }
      
      const { data: result, error } = await query.order('sort_order', { ascending: true });
      if (error) throw error;
      setData((result as WebsiteApplication[]) || []);
    } catch (e) {
      console.error('Error fetching website applications:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, selectedSite?.id, siteDomainIds]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Notifications hooks
export function useNotifications() {
  const [data, setData] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const notifications = (result as Notification[]) || [];
      setData(notifications);
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    } catch (e) {
      console.error('Error fetching notifications:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      fetch();
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      fetch();
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
    }
  };

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, unreadCount, isLoading, refetch: fetch, markAsRead, markAllAsRead };
}

// Audit Logs hooks
export function useAuditLogs(limit = 100) {
  const [data, setData] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setData((result as AuditLog[]) || []);
    } catch (e) {
      console.error('Error fetching audit logs:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Log an action to audit_logs
export async function logAuditAction(
  userId: string | undefined,
  action: string,
  tableName?: string,
  recordId?: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      user_agent: navigator.userAgent,
    });
  } catch (e) {
    console.error('Error logging audit action:', e);
  }
}

// CRUD operations for Servers
export function useServerMutations(profileId?: string) {
  const createServer = async (serverData: Record<string, any>) => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .insert(serverData as any)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction(profileId, 'create', 'servers', data.id, undefined, serverData);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  };

  const updateServer = async (id: string, serverData: Record<string, any>) => {
    try {
      const { data: old } = await supabase.from('servers').select('*').eq('id', id).single();
      const { data, error } = await supabase
        .from('servers')
        .update({ ...serverData, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction(profileId, 'update', 'servers', id, old, serverData);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  };

  const deleteServer = async (id: string) => {
    try {
      const { data: old } = await supabase.from('servers').select('*').eq('id', id).single();
      const { error } = await supabase.from('servers').delete().eq('id', id);
      if (error) throw error;
      await logAuditAction(profileId, 'delete', 'servers', id, old, undefined);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return { createServer, updateServer, deleteServer };
}

// CRUD operations for Licenses
export function useLicenseMutations(profileId?: string) {
  const createLicense = async (licenseData: Record<string, any>) => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .insert(licenseData as any)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction(profileId, 'create', 'licenses', data.id, undefined, licenseData);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  };

  const updateLicense = async (id: string, licenseData: Record<string, any>) => {
    try {
      const { data: old } = await supabase.from('licenses').select('*').eq('id', id).single();
      const { data, error } = await supabase
        .from('licenses')
        .update(licenseData as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction(profileId, 'update', 'licenses', id, old, licenseData);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  };

  const deleteLicense = async (id: string) => {
    try {
      const { data: old } = await supabase.from('licenses').select('*').eq('id', id).single();
      const { error } = await supabase.from('licenses').delete().eq('id', id);
      if (error) throw error;
      await logAuditAction(profileId, 'delete', 'licenses', id, old, undefined);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return { createLicense, updateLicense, deleteLicense };
}
