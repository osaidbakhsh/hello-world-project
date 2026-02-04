import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HierarchyLevel = 'site' | 'domain' | 'datacenter' | 'cluster' | 'network' | 'node' | 'vm';

export interface HierarchyNode {
  id: string;
  name: string;
  level: HierarchyLevel;
  parentId: string | null;
  hierarchyPath?: string;
  metadata?: Record<string, unknown>;
  childCount?: number;
}

export interface HierarchySelection {
  siteId?: string;
  domainId?: string;
  datacenterId?: string;
  clusterId?: string;
  networkId?: string;
  nodeId?: string;
  vmId?: string;
}

interface HierarchyContextType {
  // Selection state
  selection: HierarchySelection;
  setSelection: (selection: HierarchySelection) => void;
  
  // Current path for breadcrumbs
  currentPath: HierarchyNode[];
  setCurrentPath: (path: HierarchyNode[]) => void;
  
  // Expanded nodes in tree
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  expandToNode: (nodeId: string, path: HierarchyNode[]) => void;
  
  // Data fetching
  fetchChildren: (parentId: string | null, level: HierarchyLevel) => Promise<HierarchyNode[]>;
  fetchPathToNode: (nodeId: string, level: HierarchyLevel) => Promise<HierarchyNode[]>;
  
  // Search
  searchResults: HierarchyNode[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
}

const HierarchyContext = createContext<HierarchyContextType | undefined>(undefined);

const STORAGE_KEY = 'hierarchy-selection';
const EXPANDED_KEY = 'hierarchy-expanded';

export const HierarchyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selection, setSelectionState] = useState<HierarchySelection>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentPath, setCurrentPath] = useState<HierarchyNode[]>([]);
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [searchResults, setSearchResults] = useState<HierarchyNode[]>([]);
  const [searchQuery, setSearchQueryState] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Persist selection to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  // Persist expanded nodes
  useEffect(() => {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...expandedNodes]));
  }, [expandedNodes]);

  const setSelection = useCallback((newSelection: HierarchySelection) => {
    setSelectionState(newSelection);
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandToNode = useCallback((nodeId: string, path: HierarchyNode[]) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      path.forEach(node => next.add(node.id));
      next.add(nodeId);
      return next;
    });
  }, []);

  // Fetch children based on level
  const fetchChildren = useCallback(async (parentId: string | null, level: HierarchyLevel): Promise<HierarchyNode[]> => {
    try {
      switch (level) {
        case 'site': {
          const { data } = await supabase.from('sites').select('id, name, code').order('name');
          return (data || []).map(s => ({
            id: s.id,
            name: s.name,
            level: 'site' as HierarchyLevel,
            parentId: null,
            metadata: { code: s.code }
          }));
        }
        case 'domain': {
          const { data } = await supabase.from('domains').select('id, name, site_id, hierarchy_path').eq('site_id', parentId!).order('name');
          return (data || []).map(d => ({
            id: d.id,
            name: d.name,
            level: 'domain' as HierarchyLevel,
            parentId: d.site_id,
            hierarchyPath: d.hierarchy_path as string
          }));
        }
        case 'datacenter': {
          const { data } = await supabase.from('datacenters').select('id, name, domain_id, hierarchy_path').eq('domain_id', parentId!).order('name');
          return (data || []).map(dc => ({
            id: dc.id,
            name: dc.name,
            level: 'datacenter' as HierarchyLevel,
            parentId: dc.domain_id,
            hierarchyPath: dc.hierarchy_path as string
          }));
        }
        case 'cluster': {
          const { data } = await supabase.from('clusters').select('id, name, datacenter_id, hierarchy_path').eq('datacenter_id', parentId!).order('name');
          return (data || []).map(c => ({
            id: c.id,
            name: c.name,
            level: 'cluster' as HierarchyLevel,
            parentId: c.datacenter_id,
            hierarchyPath: c.hierarchy_path as string
          }));
        }
        case 'network': {
          const { data } = await supabase.from('networks').select('id, name, cluster_id').eq('cluster_id', parentId!).order('name');
          return (data || []).map(n => ({
            id: n.id,
            name: n.name,
            level: 'network' as HierarchyLevel,
            parentId: n.cluster_id
          }));
        }
        case 'node': {
          const { data } = await supabase.from('cluster_nodes').select('id, name, cluster_id, status').eq('cluster_id', parentId!).order('name');
          return (data || []).map(n => ({
            id: n.id,
            name: n.name,
            level: 'node' as HierarchyLevel,
            parentId: n.cluster_id,
            metadata: { status: n.status }
          }));
        }
        case 'vm': {
          const { data } = await supabase.from('servers').select('id, name, network_id, status').eq('network_id', parentId!).order('name');
          return (data || []).map(v => ({
            id: v.id,
            name: v.name,
            level: 'vm' as HierarchyLevel,
            parentId: v.network_id,
            metadata: { status: v.status }
          }));
        }
        default:
          return [];
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      return [];
    }
  }, []);

  // Fetch path to a specific node
  const fetchPathToNode = useCallback(async (nodeId: string, level: HierarchyLevel): Promise<HierarchyNode[]> => {
    const path: HierarchyNode[] = [];
    
    try {
      switch (level) {
        case 'vm': {
          // Fetch VM and its network separately to avoid ambiguous relationship
          const { data: vm } = await supabase.from('servers').select('id, name, status, network_id').eq('id', nodeId).single();
          if (vm && vm.network_id) {
            const { data: network } = await supabase.from('networks').select('id, name, cluster_id').eq('id', vm.network_id).single();
            if (network && network.cluster_id) {
              const { data: cluster } = await supabase.from('clusters').select('id, name, datacenter_id').eq('id', network.cluster_id).single();
              if (cluster && cluster.datacenter_id) {
                const { data: datacenter } = await supabase.from('datacenters').select('id, name, domain_id').eq('id', cluster.datacenter_id).single();
                if (datacenter && datacenter.domain_id) {
                  const { data: domain } = await supabase.from('domains').select('id, name, site_id').eq('id', datacenter.domain_id).single();
                  if (domain && domain.site_id) {
                    const { data: site } = await supabase.from('sites').select('id, name').eq('id', domain.site_id).single();
                    if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
                    path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: site?.id || null });
                  }
                  path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: domain?.id || null });
                }
                path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
              }
              path.push({ id: network.id, name: network.name, level: 'network', parentId: cluster?.id || null });
            }
            path.push({ id: vm.id, name: vm.name, level: 'vm', parentId: network?.id || null, metadata: { status: vm.status } });
          }
          break;
        }
        case 'node': {
          const { data: node } = await supabase.from('cluster_nodes').select('*, clusters(*, datacenters(*, domains(*, sites(*))))').eq('id', nodeId).single();
          if (node) {
            const cluster = node.clusters;
            const datacenter = cluster?.datacenters;
            const domain = datacenter?.domains;
            const site = domain?.sites;
            
            if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
            if (domain) path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: site?.id || null });
            if (datacenter) path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: domain?.id || null });
            if (cluster) path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
            path.push({ id: node.id, name: node.name, level: 'node', parentId: cluster?.id || null, metadata: { status: node.status } });
          }
          break;
        }
        case 'network': {
          const { data: network } = await supabase.from('networks').select('*, clusters(*, datacenters(*, domains(*, sites(*))))').eq('id', nodeId).single();
          if (network) {
            const cluster = network.clusters;
            const datacenter = cluster?.datacenters;
            const domain = datacenter?.domains;
            const site = domain?.sites;
            
            if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
            if (domain) path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: site?.id || null });
            if (datacenter) path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: domain?.id || null });
            if (cluster) path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
            path.push({ id: network.id, name: network.name, level: 'network', parentId: cluster?.id || null });
          }
          break;
        }
        case 'cluster': {
          const { data: cluster } = await supabase.from('clusters').select('*, datacenters(*, domains(*, sites(*)))').eq('id', nodeId).single();
          if (cluster) {
            const datacenter = cluster.datacenters;
            const domain = datacenter?.domains;
            const site = domain?.sites;
            
            if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
            if (domain) path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: site?.id || null });
            if (datacenter) path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: domain?.id || null });
            path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
          }
          break;
        }
        case 'datacenter': {
          const { data: datacenter } = await supabase.from('datacenters').select('*, domains(*, sites(*))').eq('id', nodeId).single();
          if (datacenter) {
            const domain = datacenter.domains;
            const site = domain?.sites;
            
            if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
            if (domain) path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: site?.id || null });
            path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: domain?.id || null });
          }
          break;
        }
        case 'domain': {
          const { data: domain } = await supabase.from('domains').select('*, sites(*)').eq('id', nodeId).single();
          if (domain) {
            const site = domain.sites;
            if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
            path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: site?.id || null });
          }
          break;
        }
        case 'site': {
          const { data: site } = await supabase.from('sites').select('*').eq('id', nodeId).single();
          if (site) {
            path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching path:', error);
    }
    
    return path;
  }, []);

  // Global search
  const setSearchQuery = useCallback(async (query: string) => {
    setSearchQueryState(query);
    
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results: HierarchyNode[] = [];
      const searchPattern = `%${query}%`;
      
      // Search all levels in parallel
      const [sites, domains, datacenters, clusters, networks, nodes, vms] = await Promise.all([
        supabase.from('sites').select('id, name').ilike('name', searchPattern).limit(5),
        supabase.from('domains').select('id, name, site_id').ilike('name', searchPattern).limit(5),
        supabase.from('datacenters').select('id, name, domain_id').ilike('name', searchPattern).limit(5),
        supabase.from('clusters').select('id, name, datacenter_id').ilike('name', searchPattern).limit(5),
        supabase.from('networks').select('id, name, cluster_id').ilike('name', searchPattern).limit(5),
        supabase.from('cluster_nodes').select('id, name, cluster_id').ilike('name', searchPattern).limit(5),
        supabase.from('servers').select('id, name, network_id').ilike('name', searchPattern).limit(5),
      ]);
      
      if (sites.data) {
        results.push(...sites.data.map(s => ({ id: s.id, name: s.name, level: 'site' as HierarchyLevel, parentId: null })));
      }
      if (domains.data) {
        results.push(...domains.data.map(d => ({ id: d.id, name: d.name, level: 'domain' as HierarchyLevel, parentId: d.site_id })));
      }
      if (datacenters.data) {
        results.push(...datacenters.data.map(dc => ({ id: dc.id, name: dc.name, level: 'datacenter' as HierarchyLevel, parentId: dc.domain_id })));
      }
      if (clusters.data) {
        results.push(...clusters.data.map(c => ({ id: c.id, name: c.name, level: 'cluster' as HierarchyLevel, parentId: c.datacenter_id })));
      }
      if (networks.data) {
        results.push(...networks.data.map(n => ({ id: n.id, name: n.name, level: 'network' as HierarchyLevel, parentId: n.cluster_id })));
      }
      if (nodes.data) {
        results.push(...nodes.data.map(n => ({ id: n.id, name: n.name, level: 'node' as HierarchyLevel, parentId: n.cluster_id })));
      }
      if (vms.data) {
        results.push(...vms.data.map(v => ({ id: v.id, name: v.name, level: 'vm' as HierarchyLevel, parentId: v.network_id })));
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    <HierarchyContext.Provider value={{
      selection,
      setSelection,
      currentPath,
      setCurrentPath,
      expandedNodes,
      toggleNode,
      expandToNode,
      fetchChildren,
      fetchPathToNode,
      searchResults,
      searchQuery,
      setSearchQuery,
      isSearching,
    }}>
      {children}
    </HierarchyContext.Provider>
  );
};

export const useHierarchy = () => {
  const context = useContext(HierarchyContext);
  if (!context) {
    throw new Error('useHierarchy must be used within a HierarchyProvider');
  }
  return context;
};
