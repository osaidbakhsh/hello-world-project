import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Site } from '@/contexts/SiteContext';

export interface CreateSiteData {
  name: string;
  code: string;
  city?: string;
  region?: string;
  timezone?: string;
  notes?: string;
}

export interface UpdateSiteData extends Partial<CreateSiteData> {
  id: string;
}

export const useSites = () => {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, code, city, region, timezone, notes, created_at')
        .order('name');
      
      if (error) throw error;
      return data as Site[];
    },
  });
};

export const useCreateSite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSiteData) => {
      const { data: site, error } = await supabase
        .from('sites')
        .insert({
          name: data.name,
          code: data.code.toUpperCase(),
          city: data.city || null,
          region: data.region || null,
          timezone: data.timezone || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return site;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: 'Site created',
        description: 'The site has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating site',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateSiteData) => {
      const { id, ...updateData } = data;
      const { data: site, error } = await supabase
        .from('sites')
        .update({
          ...updateData,
          code: updateData.code?.toUpperCase(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return site;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: 'Site updated',
        description: 'The site has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating site',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (siteId: string) => {
      // Check for dependent records
      const { count: dcCount } = await supabase
        .from('datacenters')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId);
      
      const { count: domainCount } = await supabase
        .from('domains')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId);

      if ((dcCount || 0) > 0 || (domainCount || 0) > 0) {
        throw new Error('Cannot delete site with existing datacenters or domains. Please remove them first.');
      }

      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: 'Site deleted',
        description: 'The site has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting site',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
