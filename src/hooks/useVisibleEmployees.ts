import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains } from '@/hooks/useSiteDomains';

export interface VisibleEmployee {
  id: string;
  full_name: string;
  email: string | null;
}

export function useVisibleEmployees() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['visible-employees', selectedSite?.id],
    queryFn: async () => {
      // If no site selected, use the RPC function as fallback
      if (!selectedSite) {
        const { data, error } = await supabase.rpc('list_visible_employees');
        if (error) throw error;
        return (data || []) as VisibleEmployee[];
      }
      
      // Get profiles with domain membership in the selected site
      if (siteDomainIds.length === 0) return [];
      
      const { data: memberships, error: memberError } = await supabase
        .from('domain_memberships')
        .select('profile_id')
        .in('domain_id', siteDomainIds);
      
      if (memberError) throw memberError;
      
      const profileIds = [...new Set(memberships?.map(m => m.profile_id) || [])];
      if (profileIds.length === 0) return [];
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds)
        .order('full_name');
      
      if (profileError) throw profileError;
      return (profiles || []) as VisibleEmployee[];
    },
    // Ensure fresh data for domain membership changes
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
