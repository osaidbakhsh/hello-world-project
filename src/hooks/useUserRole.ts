import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UseUserRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch user role from the secure user_roles table
 * This avoids privilege escalation by not relying on the profiles table
 */
export const useUserRole = (userId: string | null): UseUserRoleResult => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRole = async () => {
    if (!userId) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch from user_roles table (secure, separate from profiles)
      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role', { ascending: true }) // admin comes first alphabetically
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setRole(data?.role ?? 'employee');
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err as Error);
      // Default to employee for safety
      setRole('employee');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [userId]);

  return {
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    isLoading,
    error,
    refetch: fetchRole,
  };
};
