import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Domain, Network, Server, Task, Vacation, EmployeeReport, License, Profile, YearlyGoal, DomainMembership } from '@/lib/supabase';

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

// Generic fetch hook
function useSupabaseQuery<T>(
  tableName: string,
  options?: { 
    enabled?: boolean;
    orderBy?: string;
    ascending?: boolean;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from(tableName as any).select('*');
      
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? false });
      }
      
      const { data: result, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setData((result as T[]) || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [tableName, options?.orderBy, options?.ascending]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetch();
    }
  }, [fetch, options?.enabled]);

  return { data, isLoading, error, refetch: fetch };
}

// Domain hooks
export function useDomains() {
  return useSupabaseQuery<Domain>('domains', { orderBy: 'name', ascending: true });
}

export function useNetworks(domainId?: string) {
  const [data, setData] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('networks').select('*');
      if (domainId) {
        query = query.eq('domain_id', domainId);
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
  }, [domainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Server hooks
export function useServers(networkId?: string) {
  const [data, setData] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('servers').select('*');
      if (networkId) {
        query = query.eq('network_id', networkId);
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
  }, [networkId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

// Task hooks
export function useTasks() {
  return useSupabaseQuery<Task>('tasks', { orderBy: 'created_at', ascending: false });
}

// Vacation hooks
export function useVacations() {
  return useSupabaseQuery<Vacation>('vacations', { orderBy: 'created_at', ascending: false });
}

// Employee Reports hooks
export function useEmployeeReports() {
  return useSupabaseQuery<EmployeeReport>('employee_reports', { orderBy: 'created_at', ascending: false });
}

// License hooks
export function useLicenses() {
  return useSupabaseQuery<License>('licenses', { orderBy: 'expiry_date', ascending: true });
}

// Profile hooks
export function useProfiles() {
  return useSupabaseQuery<Profile>('profiles', { orderBy: 'full_name', ascending: true });
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

// Dashboard stats
export function useDashboardStats(selectedDomainId?: string) {
  const { isAdmin } = useAuth();
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
      // Fetch servers
      let serversQuery = supabase.from('servers').select('*');
      const { data: servers } = await serversQuery;

      // Fetch tasks
      const { data: tasks } = await supabase.from('tasks').select('*');

      // Fetch licenses
      const { data: licenses } = await supabase.from('licenses').select('*');

      // Fetch profiles
      const { data: profiles } = await supabase.from('profiles').select('*');

      // Fetch networks
      let networksQuery = supabase.from('networks').select('*');
      if (selectedDomainId) {
        networksQuery = networksQuery.eq('domain_id', selectedDomainId);
      }
      const { data: networks } = await networksQuery;

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      setStats({
        totalServers: servers?.length || 0,
        activeServers: servers?.filter(s => s.status === 'active').length || 0,
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
        pendingTasks: tasks?.filter(t => t.status === 'pending').length || 0,
        overdueTasks: tasks?.filter(t => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < now && t.status !== 'completed')).length || 0,
        totalLicenses: licenses?.length || 0,
        expiringLicenses: licenses?.filter(l => l.expiry_date && new Date(l.expiry_date) <= thirtyDaysFromNow).length || 0,
        totalEmployees: profiles?.length || 0,
        totalNetworks: networks?.length || 0,
      });
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDomainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { stats, isLoading, refetch: fetch };
}

// Website Applications hooks
export function useWebsiteApplications() {
  const [data, setData] = useState<WebsiteApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('website_applications')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setData((result as WebsiteApplication[]) || []);
    } catch (e) {
      console.error('Error fetching website applications:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  action: string,
  tableName?: string,
  recordId?: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
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
export function useServerMutations() {
  const createServer = async (serverData: Record<string, any>) => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .insert(serverData as any)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('create', 'servers', data.id, undefined, serverData);
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
      await logAuditAction('update', 'servers', id, old, serverData);
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
      await logAuditAction('delete', 'servers', id, old, undefined);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return { createServer, updateServer, deleteServer };
}

// CRUD operations for Licenses
export function useLicenseMutations() {
  const createLicense = async (licenseData: Record<string, any>) => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .insert(licenseData as any)
        .select()
        .single();
      if (error) throw error;
      await logAuditAction('create', 'licenses', data.id, undefined, licenseData);
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
      await logAuditAction('update', 'licenses', id, old, licenseData);
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
      await logAuditAction('delete', 'licenses', id, old, undefined);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return { createLicense, updateLicense, deleteLicense };
}
