/**
 * Notifications Hook - Fetch and manage scope-aware notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  site_id: string | null;
  domain_id: string | null;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  entity_type: string | null;
  entity_id: string | null;
  code: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface NotificationFilters {
  siteId?: string;
  domainId?: string;
  severity?: string;
  unreadOnly?: boolean;
  limit?: number;
}

export function useNotifications(filters: NotificationFilters = {}) {
  const { selectedSite } = useSite();
  const queryClient = useQueryClient();
  const effectiveSiteId = filters.siteId || selectedSite?.id;
  
  const query = useQuery({
    queryKey: ['notifications', effectiveSiteId, filters],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      // Filter by site if specified
      if (effectiveSiteId) {
        query = query.or(`site_id.eq.${effectiveSiteId},site_id.is.null`);
      }

      // Filter by domain if specified
      if (filters.domainId) {
        query = query.eq('domain_id', filters.domainId);
      }

      // Filter by severity
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      // Filter unread only
      if (filters.unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Refetch on new notification
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUnreadNotificationCount() {
  const { selectedSite } = useSite();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['notifications-unread-count', selectedSite?.id],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      if (selectedSite?.id) {
        query = query.or(`site_id.eq.${selectedSite.id},site_id.is.null`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    // Remove aggressive polling - rely on realtime subscription instead
    staleTime: 60 * 1000, // 1 minute stale time
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Subscribe to realtime for immediate updates (instead of polling)
  useEffect(() => {
    const channel = supabase
      .channel('notifications-count-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events for count updates
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Debounce the invalidation to prevent rapid re-fetches
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { selectedSite } = useSite();
  
  return useMutation({
    mutationFn: async () => {
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (selectedSite?.id) {
        query = query.or(`site_id.eq.${selectedSite.id},site_id.is.null`);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
