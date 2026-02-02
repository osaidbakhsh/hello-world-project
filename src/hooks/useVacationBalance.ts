import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VacationBalance {
  id: string;
  profile_id: string;
  year: number;
  annual_balance: number;
  sick_balance: number;
  emergency_balance: number;
  used_annual: number;
  used_sick: number;
  used_emergency: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useVacationBalance = (profileId?: string) => {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['vacation-balance', targetProfileId, currentYear],
    queryFn: async () => {
      if (!targetProfileId) return null;

      // First try to get existing balance
      const { data: existing, error: fetchError } = await supabase
        .from('vacation_balances')
        .select('*')
        .eq('profile_id', targetProfileId)
        .eq('year', currentYear)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching vacation balance:', fetchError);
        throw fetchError;
      }

      // If balance exists, return it
      if (existing) {
        return existing as VacationBalance;
      }

      // If no balance exists and we have Super Admin access, create one
      // Otherwise return a default object for display purposes
      return {
        id: '',
        profile_id: targetProfileId,
        year: currentYear,
        annual_balance: 21,
        sick_balance: 15,
        emergency_balance: 5,
        used_annual: 0,
        used_sick: 0,
        used_emergency: 0,
        notes: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as VacationBalance;
    },
    enabled: !!targetProfileId,
  });
};

export const useUpdateVacationBalance = () => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  return useMutation({
    mutationFn: async ({
      profileId,
      annual_balance,
      sick_balance,
      emergency_balance,
    }: {
      profileId: string;
      annual_balance: number;
      sick_balance: number;
      emergency_balance: number;
    }) => {
      // Try to upsert
      const { data, error } = await supabase
        .from('vacation_balances')
        .upsert(
          {
            profile_id: profileId,
            year: currentYear,
            annual_balance,
            sick_balance,
            emergency_balance,
          },
          {
            onConflict: 'profile_id,year',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vacation-balance', variables.profileId] });
    },
  });
};
