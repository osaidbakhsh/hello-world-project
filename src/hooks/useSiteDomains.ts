import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';

/**
 * Reusable hook that returns domain IDs for the currently selected site.
 * Use this hook to filter data by site across the application.
 */
export function useSiteDomains() {
  const { selectedSite } = useSite();

  return useQuery({
    queryKey: ['site-domains', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      const { data, error } = await supabase
        .from('domains')
        .select('id')
        .eq('site_id', selectedSite.id);
      
      if (error) throw error;
      return data?.map(d => d.id) || [];
    },
    enabled: !!selectedSite,
    staleTime: 30 * 1000, // Cache for 30 seconds only - ensure fresh data on site switch
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });
}

/**
 * Hook that returns profile IDs for employees belonging to the selected site's domains.
 */
export function useSiteProfileIds() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();

  return useQuery({
    // Include siteDomainIds in query key to refetch when domains change
    queryKey: ['site-profile-ids', selectedSite?.id, siteDomainIds],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      const { data: memberships, error } = await supabase
        .from('domain_memberships')
        .select('profile_id')
        .in('domain_id', siteDomainIds);
      
      if (error) throw error;
      return [...new Set(memberships?.map(m => m.profile_id) || [])];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0 && !domainsLoading,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
}
