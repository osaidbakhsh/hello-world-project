import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FolderStat } from '@/types/fileshares';

export function useFolderStats(snapshotId: string | undefined) {
  const [rootFolders, setRootFolders] = useState<FolderStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, FolderStat[]>>({});

  // Fetch root level folders (depth = 0)
  const fetchRootFolders = useCallback(async () => {
    if (!snapshotId) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('folder_stats')
        .select('*')
        .eq('snapshot_id', snapshotId)
        .is('parent_id', null)
        .order('size_bytes', { ascending: false });

      if (error) throw error;
      setRootFolders(data || []);
    } catch (e) {
      console.error('Error fetching root folders:', e);
      setRootFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, [snapshotId]);

  // Fetch children of a specific folder (lazy loading)
  const fetchChildren = useCallback(async (parentId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('folder_stats')
        .select('*')
        .eq('parent_id', parentId)
        .order('size_bytes', { ascending: false });

      if (error) throw error;
      setExpandedFolders(prev => ({ ...prev, [parentId]: data || [] }));
      return data || [];
    } catch (e) {
      console.error('Error fetching folder children:', e);
      return [];
    }
  }, []);

  // Fetch top N folders by size
  const fetchTopFolders = useCallback(async (limit = 10) => {
    if (!snapshotId) return [];
    try {
      const { data, error } = await (supabase as any)
        .from('folder_stats')
        .select('*')
        .eq('snapshot_id', snapshotId)
        .gt('depth', 0) // Exclude root
        .order('size_bytes', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error fetching top folders:', e);
      return [];
    }
  }, [snapshotId]);

  // Toggle folder expansion
  const toggleFolder = useCallback(async (folderId: string) => {
    if (expandedFolders[folderId]) {
      // Collapse
      setExpandedFolders(prev => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
    } else {
      // Expand - fetch children
      await fetchChildren(folderId);
    }
  }, [expandedFolders, fetchChildren]);

  return {
    rootFolders,
    expandedFolders,
    isLoading,
    fetchRootFolders,
    fetchChildren,
    fetchTopFolders,
    toggleFolder,
  };
}
