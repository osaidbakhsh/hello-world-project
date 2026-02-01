import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScanAgent } from '@/types/fileshares';

export function useScanAgents(domainId?: string) {
  const [data, setData] = useState<ScanAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = (supabase as any)
        .from('scan_agents')
        .select('*')
        .order('name');

      if (domainId) {
        query = query.eq('domain_id', domainId);
      }

      const { data: agents, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setData(agents || []);
      setError(null);
    } catch (e) {
      console.error('Error fetching scan agents:', e);
      setError(e as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [domainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

export function useScanAgentMutations() {
  const createAgent = async (data: { domain_id: string; name: string; site_tag?: string }) => {
    // Generate a secure token hash (in production, this would be done server-side)
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const tokenHash = await hashToken(token);

    const { data: result, error } = await (supabase as any)
      .from('scan_agents')
      .insert({
        ...data,
        auth_token_hash: tokenHash,
        status: 'OFFLINE',
      })
      .select()
      .single();

    return { data: result, error, token: error ? null : token };
  };

  const updateAgent = async (id: string, data: Partial<{ name: string; site_tag: string }>) => {
    const { data: result, error } = await (supabase as any)
      .from('scan_agents')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return { data: result, error };
  };

  const deleteAgent = async (id: string) => {
    const { error } = await (supabase as any)
      .from('scan_agents')
      .delete()
      .eq('id', id);
    return { error };
  };

  return { createAgent, updateAgent, deleteAgent };
}

// Simple hash function for demo (in production use proper crypto)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
