import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled';

export interface ApprovalRequest {
  id: string;
  site_id: string;
  domain_id: string | null;
  scope_type: string;
  scope_id: string;
  entity_type: string;
  entity_id: string | null;
  action_type: string;
  request_data: Record<string, unknown>;
  status: ApprovalStatus;
  requested_by: string;
  approver_role: string | null;
  decided_by: string | null;
  decided_at: string | null;
  requester_notes: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester?: { full_name: string; email: string };
  decider?: { full_name: string; email: string };
}

export interface ApprovalEvent {
  id: string;
  request_id: string;
  event_type: string;
  actor_id: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { full_name: string };
}

export interface CreateApprovalInput {
  site_id: string;
  domain_id?: string | null;
  scope_type: string;
  scope_id: string;
  entity_type: string;
  entity_id?: string | null;
  action_type: string;
  request_data?: Record<string, unknown>;
  approver_role?: string;
  requester_notes?: string;
}

export interface DecideApprovalInput {
  id: string;
  decision: 'approved' | 'rejected';
  decision_notes?: string;
}

export function useApprovals(filters?: { status?: ApprovalStatus; entity_type?: string }) {
  const { selectedSite } = useSite();

  return useQuery({
    queryKey: ['approvals', selectedSite?.id, filters],
    queryFn: async () => {
      if (!selectedSite) return [];

      let query = (supabase as any)
        .from('approval_requests')
        .select('*')
        .eq('site_id', selectedSite.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalRequest[];
    },
    enabled: !!selectedSite,
  });
}

export function useApprovalDetail(requestId: string | null) {
  return useQuery({
    queryKey: ['approval-detail', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await (supabase as any)
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data as ApprovalRequest;
    },
    enabled: !!requestId,
  });
}

export function useApprovalEvents(requestId: string | null) {
  return useQuery({
    queryKey: ['approval-events', requestId],
    queryFn: async () => {
      if (!requestId) return [];

      const { data, error } = await (supabase as any)
        .from('approval_events')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ApprovalEvent[];
    },
    enabled: !!requestId,
  });
}

export function useCreateApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateApprovalInput) => {
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const insertData = {
        site_id: input.site_id,
        domain_id: input.domain_id || null,
        scope_type: input.scope_type,
        scope_id: input.scope_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id || null,
        action_type: input.action_type,
        request_data: input.request_data || {},
        approver_role: input.approver_role || null,
        requester_notes: input.requester_notes || null,
        requested_by: profile.id,
        status: 'pending' as const,
      };

      const { data, error } = await (supabase as any)
        .from('approval_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Create initial event
      await (supabase as any).from('approval_events').insert({
        request_id: data.id,
        event_type: 'created',
        actor_id: profile.id,
        message: 'Approval request created',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast({ title: 'Success', description: 'Approval request submitted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDecideApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, decision, decision_notes }: DecideApprovalInput) => {
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await (supabase as any)
        .from('approval_requests')
        .update({
          status: decision,
          decided_by: profile.id,
          decided_at: new Date().toISOString(),
          decision_notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create decision event
      await (supabase as any).from('approval_events').insert({
        request_id: id,
        event_type: decision,
        actor_id: profile.id,
        message: decision === 'approved' 
          ? 'Request approved' + (decision_notes ? `: ${decision_notes}` : '')
          : 'Request rejected' + (decision_notes ? `: ${decision_notes}` : ''),
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['approval-events', data.id] });
      toast({ 
        title: 'Success', 
        description: `Request ${data.status}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function usePendingApprovalCount() {
  const { selectedSite } = useSite();

  return useQuery({
    queryKey: ['pending-approval-count', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite) return 0;

      const { count, error } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', selectedSite.id)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedSite,
  });
}
