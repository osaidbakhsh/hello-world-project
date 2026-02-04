import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AuthClaims {
  app_role: string;
  profile_id: string | null;
  domain_ids: string[];
  site_ids: string[];
  is_super_admin: boolean;
}

interface UseAuthClaimsResult {
  claims: AuthClaims | null;
  canAccessDomain: (domainId: string) => boolean;
  canAccessSite: (siteId: string) => boolean;
  fetchServerClaims: () => Promise<AuthClaims | null>;
}

/**
 * Hook to work with JWT claims and authorization checks
 * Claims are injected by custom_access_token_hook in the database
 */
export const useAuthClaims = (): UseAuthClaimsResult => {
  const { session, isSuperAdmin, userRole, profile } = useAuth();

  // Build claims from client-side state (mirrors what's in JWT)
  const claims = useMemo((): AuthClaims | null => {
    if (!session?.user) return null;

    return {
      app_role: userRole || 'employee',
      profile_id: profile?.id || null,
      domain_ids: [], // Will be populated from server for actual checks
      site_ids: [],
      is_super_admin: isSuperAdmin,
    };
  }, [session, userRole, profile, isSuperAdmin]);

  // Check if user can access a specific domain (client-side quick check)
  // For security-critical operations, use fetchServerClaims instead
  const canAccessDomain = (domainId: string): boolean => {
    if (isSuperAdmin) return true;
    // For full domain_ids check, call get_my_claims() RPC
    return false; // Conservative: require server check for non-super-admin
  };

  // Check if user can access a specific site (client-side quick check)
  const canAccessSite = (siteId: string): boolean => {
    if (isSuperAdmin) return true;
    return false; // Conservative: require server check for non-super-admin
  };

  // Fetch full claims from server (includes domain_ids and site_ids)
  const fetchServerClaims = async (): Promise<AuthClaims | null> => {
    if (!session?.user) return null;

    try {
      const { data, error } = await supabase.rpc('get_my_claims');
      
      if (error) {
        console.error('Failed to fetch claims:', error);
        return null;
      }

      // Type assertion for the JSONB response
      const claimsData = data as Record<string, unknown> | null;
      
      return {
        app_role: (claimsData?.app_role as string) || 'employee',
        profile_id: (claimsData?.profile_id as string) || null,
        domain_ids: (claimsData?.domain_ids as string[]) || [],
        site_ids: (claimsData?.site_ids as string[]) || [],
        is_super_admin: (claimsData?.is_super_admin as boolean) || false,
      };
    } catch (err) {
      console.error('Error fetching server claims:', err);
      return null;
    }
  };

  return {
    claims,
    canAccessDomain,
    canAccessSite,
    fetchServerClaims,
  };
};
