import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains } from '@/hooks/useSiteDomains';
import type { 
  Datacenter, 
  Cluster, 
  ClusterNode, 
  VM, 
  DatacenterStats 
} from '@/types/datacenter';

// Datacenters - filtered by site
export const useDatacenters = (domainId?: string) => {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: ['datacenters', selectedSite?.id, domainId],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      let query = supabase
        .from('datacenters')
        .select('*, domains(name)')
        .eq('site_id', selectedSite.id)
        .order('name');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Datacenter[];
    },
    enabled: !!selectedSite,
  });
};

// Clusters - filtered by site domains
export const useClusters = (domainId?: string) => {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['clusters', selectedSite?.id, domainId],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      let query = supabase
        .from('clusters')
        .select('*, datacenters(*), domains(name)')
        .order('name');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else if (siteDomainIds.length > 0) {
        query = query.in('domain_id', siteDomainIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Cluster[];
    },
    enabled: !!selectedSite,
  });
};

// Cluster Nodes - filtered by site domains
export const useClusterNodes = (domainId?: string, clusterId?: string) => {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['cluster_nodes', selectedSite?.id, domainId, clusterId],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      let query = supabase
        .from('cluster_nodes')
        .select('*, clusters(*)')
        .order('name');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else if (siteDomainIds.length > 0) {
        query = query.in('domain_id', siteDomainIds);
      }
      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ClusterNode[];
    },
    enabled: !!selectedSite,
  });
};

// VMs - filtered by site domains
export const useVMs = (domainId?: string, clusterId?: string) => {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['vms', selectedSite?.id, domainId, clusterId],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      let query = supabase
        .from('vms')
        .select('*, clusters(*), cluster_nodes(*)')
        .order('name');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else if (siteDomainIds.length > 0) {
        query = query.in('domain_id', siteDomainIds);
      }
      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as VM[];
    },
    enabled: !!selectedSite,
  });
};

// Stats calculation
export const useDatacenterStats = (domainId?: string) => {
  const { data: clusters } = useClusters(domainId);
  const { data: nodes } = useClusterNodes(domainId);
  const { data: vms } = useVMs(domainId);

  const stats: DatacenterStats = {
    clustersCount: clusters?.length || 0,
    nodesCount: nodes?.length || 0,
    vmsCount: vms?.length || 0,
    totalRamGb: nodes?.reduce((acc, n) => acc + (n.ram_gb || 0), 0) || 0,
    usedRamGb: vms?.reduce((acc, v) => acc + (v.ram_gb || 0), 0) || 0,
    totalStorageTb: nodes?.reduce((acc, n) => acc + (n.storage_total_tb || 0), 0) || 0,
    usedStorageTb: nodes?.reduce((acc, n) => acc + (n.storage_used_tb || 0), 0) || 0,
    totalCpuCores: nodes?.reduce((acc, n) => acc + (n.cpu_cores || 0), 0) || 0,
    usedCpuCores: vms?.reduce((acc, v) => acc + (v.vcpu || 0), 0) || 0,
  };

  return stats;
};

// Mutations
export const useCreateCluster = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cluster: Partial<Cluster>) => {
      const { data, error } = await supabase
        .from('clusters')
        .insert([cluster as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      toast({ title: 'تم إنشاء الكلستر بنجاح' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateCluster = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cluster> & { id: string }) => {
      const { data, error } = await supabase
        .from('clusters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      toast({ title: 'تم تحديث الكلستر بنجاح' });
    },
  });
};

export const useDeleteCluster = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clusters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      toast({ title: 'تم حذف الكلستر' });
    },
  });
};

export const useCreateNode = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (node: Partial<ClusterNode>) => {
      const { data, error } = await supabase
        .from('cluster_nodes')
        .insert([node as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster_nodes'] });
      toast({ title: 'تم إضافة النود بنجاح' });
    },
  });
};

export const useUpdateNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClusterNode> & { id: string }) => {
      const { data, error } = await supabase
        .from('cluster_nodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster_nodes'] });
    },
  });
};

export const useDeleteNode = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cluster_nodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster_nodes'] });
      toast({ title: 'تم حذف النود' });
    },
  });
};

export const useCreateVM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vm: Partial<VM>) => {
      const { data, error } = await supabase
        .from('vms')
        .insert([vm as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
      toast({ title: 'تم إضافة VM بنجاح' });
    },
  });
};

export const useUpdateVM = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VM> & { id: string }) => {
      const { data, error } = await supabase
        .from('vms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
};

export const useDeleteVM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
      toast({ title: 'تم حذف VM' });
    },
  });
};
