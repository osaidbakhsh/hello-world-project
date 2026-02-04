import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Site {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  notes: string | null;
  created_at: string | null;
}

interface SiteContextType {
  // Currently selected site
  selectedSite: Site | null;
  setSelectedSite: (site: Site | null) => void;
  
  // All accessible sites
  sites: Site[];
  isLoading: boolean;
  error: Error | null;
  
  // Helpers
  clearSelection: () => void;
  refetchSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

const SITE_STORAGE_KEY = 'selected-site-id';

export const SiteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedSite, setSelectedSiteState] = useState<Site | null>(null);

  // Fetch all accessible sites
  const { data: sites = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, code, city, region, timezone, notes, created_at')
        .order('name');
      
      if (error) throw error;
      return data as Site[];
    },
    enabled: !!user,
  });

  // Restore selection from localStorage on mount
  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      const savedSiteId = localStorage.getItem(SITE_STORAGE_KEY);
      if (savedSiteId) {
        const site = sites.find(s => s.id === savedSiteId);
        if (site) {
          setSelectedSiteState(site);
        } else if (sites.length > 0) {
          // If saved site not found, select first available
          setSelectedSiteState(sites[0]);
          localStorage.setItem(SITE_STORAGE_KEY, sites[0].id);
        }
      } else if (sites.length > 0) {
        // No saved selection, select first site
        setSelectedSiteState(sites[0]);
        localStorage.setItem(SITE_STORAGE_KEY, sites[0].id);
      }
    }
  }, [sites, selectedSite]);

  // Update localStorage when selection changes
  const setSelectedSite = useCallback((site: Site | null) => {
    setSelectedSiteState(site);
    if (site) {
      localStorage.setItem(SITE_STORAGE_KEY, site.id);
    } else {
      localStorage.removeItem(SITE_STORAGE_KEY);
    }
    
    // Clear hierarchy selection when site changes
    localStorage.removeItem('hierarchy-selection');
    localStorage.removeItem('hierarchy-expanded');
    
    // Invalidate ALL site-dependent queries
    queryClient.invalidateQueries({ queryKey: ['site-domains'] });
    queryClient.invalidateQueries({ queryKey: ['site-profile-ids'] });
    queryClient.invalidateQueries({ queryKey: ['domains'] });
    queryClient.invalidateQueries({ queryKey: ['datacenters'] });
    queryClient.invalidateQueries({ queryKey: ['clusters'] });
    queryClient.invalidateQueries({ queryKey: ['cluster_nodes'] });
    queryClient.invalidateQueries({ queryKey: ['vms'] });
    queryClient.invalidateQueries({ queryKey: ['servers'] });
    queryClient.invalidateQueries({ queryKey: ['networks'] });
    queryClient.invalidateQueries({ queryKey: ['licenses'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['vacations'] });
    queryClient.invalidateQueries({ queryKey: ['website_applications'] });
    queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
    queryClient.invalidateQueries({ queryKey: ['employee_reports'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({ queryKey: ['file-shares'] });
    queryClient.invalidateQueries({ queryKey: ['visible-employees'] });
    queryClient.invalidateQueries({ queryKey: ['vault-items'] });
  }, [queryClient]);

  const clearSelection = useCallback(() => {
    setSelectedSite(null);
  }, [setSelectedSite]);

  const refetchSites = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <SiteContext.Provider value={{
      selectedSite,
      setSelectedSite,
      sites,
      isLoading,
      error: error as Error | null,
      clearSelection,
      refetchSites,
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};
