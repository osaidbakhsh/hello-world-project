import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VisibleEmployee {
  id: string;
  full_name: string;
  email: string | null;
}

export function useVisibleEmployees() {
  return useQuery({
    queryKey: ['visible-employees'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_visible_employees');
      if (error) throw error;
      return (data || []) as VisibleEmployee[];
    },
    // Ensure fresh data for domain membership changes
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
