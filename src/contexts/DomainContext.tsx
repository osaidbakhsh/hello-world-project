import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';

export interface Domain {
  id: string;
  name: string;
  fqdn: string | null;
  code: string | null;
  site_id: string;
  created_at: string | null;
}

interface DomainContextType {
  // Currently selected domain (optional)
  selectedDomain: Domain | null;
  setSelectedDomain: (domain: Domain | null) => void;
  
  // All domains for current site
  domains: Domain[];
  isLoading: boolean;
  error: Error | null;
  
  // Helpers
  clearSelection: () => void;
  refetchDomains: () => Promise<void>;
  
  // Check if user should be forced to select domain (DomainAdmin)
  isDomainSelectionRequired: boolean;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

const DOMAIN_STORAGE_KEY = 'selected-domain-id';

export const DomainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { selectedSite } = useSite();
  const queryClient = useQueryClient();
  
  const [selectedDomain, setSelectedDomainState] = useState<Domain | null>(null);
  const [isDomainSelectionRequired, setIsDomainSelectionRequired] = useState(false);

  // Fetch domains for the selected site
  const { data: domains = [], isLoading, error, refetch } = useQuery({
    queryKey: ['site-domains', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      const { data, error } = await supabase
        .from('domains')
        .select('id, name, fqdn, code, site_id, created_at')
        .eq('site_id', selectedSite.id)
        .order('name');
      
      if (error) throw error;
      return data as Domain[];
    },
    enabled: !!user && !!selectedSite,
  });

  // Restore selection from localStorage on site change
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      const savedDomainId = localStorage.getItem(DOMAIN_STORAGE_KEY);
      if (savedDomainId) {
        const domain = domains.find(d => d.id === savedDomainId);
        if (domain) {
          setSelectedDomainState(domain);
        }
      }
    }
  }, [domains, selectedDomain]);

  // Clear domain selection when site changes
  useEffect(() => {
    setSelectedDomainState(null);
    localStorage.removeItem(DOMAIN_STORAGE_KEY);
  }, [selectedSite?.id]);

  // Update localStorage when selection changes
  const setSelectedDomain = useCallback((domain: Domain | null) => {
    setSelectedDomainState(domain);
    if (domain) {
      localStorage.setItem(DOMAIN_STORAGE_KEY, domain.id);
    } else {
      localStorage.removeItem(DOMAIN_STORAGE_KEY);
    }
    
    // Invalidate domain-dependent queries
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    queryClient.invalidateQueries({ queryKey: ['ad-snapshots'] });
    queryClient.invalidateQueries({ queryKey: ['ad-users'] });
    queryClient.invalidateQueries({ queryKey: ['ad-computers'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups'] });
    queryClient.invalidateQueries({ queryKey: ['domain_integrations'] });
  }, [queryClient]);

  const clearSelection = useCallback(() => {
    setSelectedDomain(null);
  }, [setSelectedDomain]);

  const refetchDomains = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DomainContext.Provider value={{
      selectedDomain,
      setSelectedDomain,
      domains,
      isLoading,
      error: error as Error | null,
      clearSelection,
      refetchDomains,
      isDomainSelectionRequired,
    }}>
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = () => {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
  return context;
};
