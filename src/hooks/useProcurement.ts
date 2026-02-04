import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains } from '@/hooks/useSiteDomains';

export interface ProcurementRequest {
  id: string;
  domain_id: string;
  request_number: string;
  title: string;
  description?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'ordered' | 'received' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currency: string;
  needed_by?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  domains?: { name: string };
  profiles?: { full_name: string; email: string };
}

export interface ProcurementItem {
  id: string;
  request_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  specs?: string;
  estimated_unit_price?: number;
  created_at: string;
  updated_at: string;
}

export interface ProcurementQuotation {
  id: string;
  request_id: string;
  vendor_name: string;
  quotation_ref?: string;
  quote_date?: string;
  valid_until?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total?: number;
  currency: string;
  file_path: string;
  original_filename: string;
  uploaded_by?: string;
  created_at: string;
  profiles?: { full_name: string };
}

export interface ProcurementActivityLog {
  id: string;
  request_id: string;
  actor_profile_id?: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
  profiles?: { full_name: string };
}

// Fetch procurement requests - filtered by site
export const useProcurementRequests = (domainId?: string, status?: string) => {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['procurement_requests', selectedSite?.id, domainId, status],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      let query = supabase
        .from('procurement_requests')
        .select('*, domains(name), profiles!procurement_requests_created_by_fkey(full_name, email)')
        .order('created_at', { ascending: false });

      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else if (siteDomainIds.length > 0) {
        query = query.in('domain_id', siteDomainIds);
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProcurementRequest[];
    },
    enabled: !!selectedSite,
  });
};

// Fetch single request with items and quotations
export const useProcurementRequest = (requestId?: string) => {
  return useQuery({
    queryKey: ['procurement_request', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await supabase
        .from('procurement_requests')
        .select('*, domains(name), profiles!procurement_requests_created_by_fkey(full_name, email)')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data as ProcurementRequest;
    },
    enabled: !!requestId,
  });
};

// Fetch items for a request
export const useProcurementItems = (requestId?: string) => {
  return useQuery({
    queryKey: ['procurement_items', requestId],
    queryFn: async () => {
      if (!requestId) return [];

      const { data, error } = await supabase
        .from('procurement_request_items')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at');

      if (error) throw error;
      return data as ProcurementItem[];
    },
    enabled: !!requestId,
  });
};

// Fetch quotations for a request
export const useProcurementQuotations = (requestId?: string) => {
  return useQuery({
    queryKey: ['procurement_quotations', requestId],
    queryFn: async () => {
      if (!requestId) return [];

      const { data, error } = await supabase
        .from('procurement_quotations')
        .select('*, profiles!procurement_quotations_uploaded_by_fkey(full_name)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProcurementQuotation[];
    },
    enabled: !!requestId,
  });
};

// Fetch activity logs for a request
export const useProcurementActivityLogs = (requestId?: string) => {
  return useQuery({
    queryKey: ['procurement_activity_logs', requestId],
    queryFn: async () => {
      if (!requestId) return [];

      const { data, error } = await supabase
        .from('procurement_activity_logs')
        .select('*, profiles!procurement_activity_logs_actor_profile_id_fkey(full_name)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProcurementActivityLog[];
    },
    enabled: !!requestId,
  });
};

// Generate request number
export const useGenerateRequestNumber = () => {
  return useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.rpc('generate_procurement_request_number', {
        p_domain_id: domainId,
      });
      if (error) throw error;
      return data as string;
    },
  });
};

// Create request
export const useCreateProcurementRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (request: Partial<ProcurementRequest>) => {
      const { data, error } = await supabase
        .from('procurement_requests')
        .insert([request as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
      toast({
        title: language === 'ar' ? 'تم إنشاء الطلب' : 'Request Created',
      });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Update request
export const useUpdateProcurementRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProcurementRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('procurement_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_request'] });
      toast({
        title: language === 'ar' ? 'تم تحديث الطلب' : 'Request Updated',
      });
    },
  });
};

// Delete request
export const useDeleteProcurementRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('procurement_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
      toast({
        title: language === 'ar' ? 'تم حذف الطلب' : 'Request Deleted',
      });
    },
  });
};

// Add item
export const useAddProcurementItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<ProcurementItem>) => {
      const { data, error } = await supabase
        .from('procurement_request_items')
        .insert([item as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_items', variables.request_id] });
    },
  });
};

// Update item
export const useUpdateProcurementItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request_id, ...updates }: Partial<ProcurementItem> & { id: string; request_id: string }) => {
      const { data, error } = await supabase
        .from('procurement_request_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, request_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_items', data.request_id] });
    },
  });
};

// Delete item
export const useDeleteProcurementItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request_id }: { id: string; request_id: string }) => {
      const { error } = await supabase
        .from('procurement_request_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { request_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_items', data.request_id] });
    },
  });
};

// Add quotation
export const useAddProcurementQuotation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (quotation: Partial<ProcurementQuotation>) => {
      const { data, error } = await supabase
        .from('procurement_quotations')
        .insert([quotation as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_quotations', variables.request_id] });
      toast({
        title: language === 'ar' ? 'تم رفع عرض السعر' : 'Quotation Uploaded',
      });
    },
  });
};

// Delete quotation
export const useDeleteProcurementQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request_id, file_path }: { id: string; request_id: string; file_path: string }) => {
      // Delete file from storage
      await supabase.storage.from('procurement-quotations').remove([file_path]);
      
      // Delete record
      const { error } = await supabase
        .from('procurement_quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { request_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_quotations', data.request_id] });
    },
  });
};

// Add activity log
export const useAddActivityLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Partial<ProcurementActivityLog>) => {
      const { data, error } = await supabase
        .from('procurement_activity_logs')
        .insert([log as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_activity_logs', variables.request_id] });
    },
  });
};
