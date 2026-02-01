import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FileShare, ScanSnapshot, FileshareScan, FileShareFormData } from '@/types/fileshares';

export function useFileShares(domainId?: string) {
  const [data, setData] = useState<FileShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = (supabase as any)
        .from('file_shares')
        .select(`
          *,
          agent:scan_agents(id, name, status),
          domain:domains(id, name)
        `)
        .order('name');

      if (domainId) {
        query = query.eq('domain_id', domainId);
      }

      const { data: shares, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Fetch latest snapshot for each share
      const sharesWithSnapshots = await Promise.all(
        (shares || []).map(async (share: FileShare) => {
          const { data: snapshot } = await (supabase as any)
            .from('scan_snapshots')
            .select('*')
            .eq('file_share_id', share.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return { ...share, latest_snapshot: snapshot };
        })
      );

      setData(sharesWithSnapshots);
      setError(null);
    } catch (e) {
      console.error('Error fetching file shares:', e);
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

export function useFileShare(id: string) {
  const [data, setData] = useState<FileShare | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: share, error } = await (supabase as any)
        .from('file_shares')
        .select(`
          *,
          agent:scan_agents(id, name, status),
          domain:domains(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get latest snapshot
      const { data: snapshot } = await (supabase as any)
        .from('scan_snapshots')
        .select('*')
        .eq('file_share_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setData({ ...share, latest_snapshot: snapshot });
    } catch (e) {
      console.error('Error fetching file share:', e);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

export function useFileShareScans(fileShareId: string) {
  const [data, setData] = useState<FileshareScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!fileShareId) return;
    setIsLoading(true);
    try {
      const { data: scans, error } = await (supabase as any)
        .from('fileshare_scans')
        .select('*')
        .eq('file_share_id', fileShareId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setData(scans || []);
    } catch (e) {
      console.error('Error fetching scans:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [fileShareId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

export function useFileShareSnapshots(fileShareId: string) {
  const [data, setData] = useState<ScanSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!fileShareId) return;
    setIsLoading(true);
    try {
      const { data: snapshots, error } = await (supabase as any)
        .from('scan_snapshots')
        .select('*')
        .eq('file_share_id', fileShareId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setData(snapshots || []);
    } catch (e) {
      console.error('Error fetching snapshots:', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [fileShareId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

export function useFileShareMutations() {
  const createFileShare = async (data: FileShareFormData) => {
    const { data: result, error } = await (supabase as any)
      .from('file_shares')
      .insert(data)
      .select()
      .single();
    return { data: result, error };
  };

  const updateFileShare = async (id: string, data: Partial<FileShareFormData>) => {
    const { data: result, error } = await (supabase as any)
      .from('file_shares')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: result, error };
  };

  const deleteFileShare = async (id: string) => {
    const { error } = await (supabase as any)
      .from('file_shares')
      .delete()
      .eq('id', id);
    return { error };
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    return updateFileShare(id, { is_enabled: enabled });
  };

  return { createFileShare, updateFileShare, deleteFileShare, toggleEnabled };
}

export function useTriggerScan() {
  const [isLoading, setIsLoading] = useState(false);

  const triggerScan = async (fileShareId: string) => {
    setIsLoading(true);
    try {
      // Get file share details
      const { data: share, error: shareError } = await (supabase as any)
        .from('file_shares')
        .select('*')
        .eq('id', fileShareId)
        .single();

      if (shareError) throw shareError;

      // Create scan job
      const { data: scan, error: scanError } = await (supabase as any)
        .from('fileshare_scans')
        .insert({
          file_share_id: fileShareId,
          domain_id: share.domain_id,
          scan_mode: share.scan_mode,
          agent_id: share.agent_id,
          status: 'QUEUED',
        })
        .select()
        .single();

      if (scanError) throw scanError;

      return { data: scan, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    } finally {
      setIsLoading(false);
    }
  };

  return { triggerScan, isLoading };
}
