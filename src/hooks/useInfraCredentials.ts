import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InfraCredential {
  id: string;
  resource_id: string;
  resource_type: string;
  secret_name: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CreateCredentialParams {
  resource_id: string;
  resource_type: string;
  secret_name: string;
  secret_value: string;
}

export const useInfraCredentials = (resourceId: string, resourceType: string) => {
  const queryClient = useQueryClient();
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Fetch credentials for a specific resource (metadata only, no secrets)
  const { data: credentials = [], isLoading, error } = useQuery({
    queryKey: ['infra-credentials', resourceId, resourceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('infrastructure_credentials')
        .select('id, resource_id, resource_type, secret_name, created_by, created_at, updated_at')
        .eq('resource_id', resourceId)
        .eq('resource_type', resourceType)
        .order('secret_name');

      if (error) throw error;
      return data as InfraCredential[];
    },
    enabled: !!resourceId && !!resourceType,
  });

  // Create new credential (via edge function for encryption)
  const createCredential = useMutation({
    mutationFn: async (params: CreateCredentialParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('infra-vault-encrypt', {
        body: params,
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infra-credentials', resourceId, resourceType] });
      toast.success('تم حفظ بيانات الاعتماد بنجاح');
    },
    onError: (error: Error) => {
      console.error('Create credential error:', error);
      toast.error('فشل في حفظ بيانات الاعتماد');
    },
  });

  // Reveal a secret (via edge function for decryption + audit)
  const revealSecret = useCallback(async (credentialId: string) => {
    if (revealedSecrets[credentialId]) {
      // Already revealed, just return it
      return revealedSecrets[credentialId];
    }

    setRevealingId(credentialId);
    try {
      const response = await supabase.functions.invoke('infra-vault-decrypt', {
        body: { credential_id: credentialId },
      });

      if (response.error) throw response.error;

      const { secret_value } = response.data;
      setRevealedSecrets(prev => ({ ...prev, [credentialId]: secret_value }));
      return secret_value;
    } catch (error) {
      console.error('Reveal secret error:', error);
      toast.error('فشل في كشف السر');
      return null;
    } finally {
      setRevealingId(null);
    }
  }, [revealedSecrets]);

  // Hide a revealed secret (client-side only)
  const hideSecret = useCallback((credentialId: string) => {
    setRevealedSecrets(prev => {
      const newState = { ...prev };
      delete newState[credentialId];
      return newState;
    });
  }, []);

  // Delete credential
  const deleteCredential = useMutation({
    mutationFn: async (credentialId: string) => {
      const { error } = await supabase
        .from('infrastructure_credentials')
        .delete()
        .eq('id', credentialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infra-credentials', resourceId, resourceType] });
      toast.success('تم حذف بيانات الاعتماد');
    },
    onError: () => {
      toast.error('فشل في حذف بيانات الاعتماد');
    },
  });

  return {
    credentials,
    isLoading,
    error,
    createCredential,
    revealSecret,
    hideSecret,
    deleteCredential,
    revealedSecrets,
    revealingId,
  };
};
