import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/contexts/SiteContext';

// New 6-level hierarchy: Site → Datacenter → Cluster → Node → Domain → VM
export type HierarchyLevel = 'site' | 'datacenter' | 'cluster' | 'node' | 'domain' | 'vm';

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
  datacenterId?: string;
  clusterId?: string;
  nodeId?: string;
  domainId?: string;
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
  const { selectedSite } = useSite();
  
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

  // Fetch children based on new hierarchy: Site → Datacenter → Cluster → Node → Domain → VM
  const fetchChildren = useCallback(async (parentId: string | null, level: HierarchyLevel): Promise<HierarchyNode[]> => {
    try {
      switch (level) {
        case 'site': {
          // If we have a selected site, only show that one
          if (selectedSite) {
            return [{
              id: selectedSite.id,
              name: selectedSite.name,
              level: 'site' as HierarchyLevel,
              parentId: null,
              metadata: { code: selectedSite.code }
            }];
          }
          const { data } = await supabase.from('sites').select('id, name, code').order('name');
          return (data || []).map(s => ({
            id: s.id,
            name: s.name,
            level: 'site' as HierarchyLevel,
            parentId: null,
            metadata: { code: s.code }
          }));
        }
        case 'datacenter': {
          // Datacenters are now directly under Site
          const siteId = parentId || selectedSite?.id;
          if (!siteId) return [];
          const { data } = await supabase
            .from('datacenters')
            .select('id, name, site_id, hierarchy_path')
            .eq('site_id', siteId)
            .order('name');
          return (data || []).map(dc => ({
            id: dc.id,
            name: dc.name,
            level: 'datacenter' as HierarchyLevel,
            parentId: dc.site_id,
            hierarchyPath: dc.hierarchy_path as string
          }));
        }
        case 'cluster': {
          if (!parentId) return [];
          const { data } = await supabase
            .from('clusters')
            .select('id, name, datacenter_id, hierarchy_path')
            .eq('datacenter_id', parentId)
            .order('name');
          return (data || []).map(c => ({
            id: c.id,
            name: c.name,
            level: 'cluster' as HierarchyLevel,
            parentId: c.datacenter_id,
            hierarchyPath: c.hierarchy_path as string
          }));
        }
        case 'node': {
          if (!parentId) return [];
          const { data } = await supabase
            .from('cluster_nodes')
            .select('id, name, cluster_id, status')
            .eq('cluster_id', parentId)
            .order('name');
          return (data || []).map(n => ({
            id: n.id,
            name: n.name,
            level: 'node' as HierarchyLevel,
            parentId: n.cluster_id,
            metadata: { status: n.status }
          }));
        }
        case 'domain': {
          // Domains are now under Nodes
          if (!parentId) return [];
          const { data } = await supabase
            .from('domains')
            .select('id, name, node_id, hierarchy_path')
            .eq('node_id', parentId)
            .order('name');
          return (data || []).map(d => ({
            id: d.id,
            name: d.name,
            level: 'domain' as HierarchyLevel,
            parentId: d.node_id,
            hierarchyPath: d.hierarchy_path as string
          }));
        }
        case 'vm': {
          // VMs are now directly under Domains
          if (!parentId) return [];
          const { data } = await supabase
            .from('servers')
            .select('id, name, domain_id, status')
            .eq('domain_id', parentId)
            .order('name');
          return (data || []).map(v => ({
            id: v.id,
            name: v.name,
            level: 'vm' as HierarchyLevel,
            parentId: v.domain_id,
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
  }, [selectedSite]);

  // Fetch path to a specific node (new hierarchy: Site → DC → Cluster → Node → Domain → VM)
  const fetchPathToNode = useCallback(async (nodeId: string, level: HierarchyLevel): Promise<HierarchyNode[]> => {
    const path: HierarchyNode[] = [];
    
    try {
      switch (level) {
        case 'vm': {
          // VM → Domain → Node → Cluster → Datacenter → Site
          const { data: vm } = await supabase
            .from('servers')
            .select('id, name, status, domain_id')
            .eq('id', nodeId)
            .single();
          
          if (vm && vm.domain_id) {
            const { data: domain } = await supabase
              .from('domains')
              .select('id, name, node_id')
              .eq('id', vm.domain_id)
              .single();
            
            if (domain && domain.node_id) {
              const { data: node } = await supabase
                .from('cluster_nodes')
                .select('id, name, cluster_id, status')
                .eq('id', domain.node_id)
                .single();
              
              if (node && node.cluster_id) {
                const { data: cluster } = await supabase
                  .from('clusters')
                  .select('id, name, datacenter_id')
                  .eq('id', node.cluster_id)
                  .single();
                
                if (cluster && cluster.datacenter_id) {
                  const { data: datacenter } = await supabase
                    .from('datacenters')
                    .select('id, name, site_id')
                    .eq('id', cluster.datacenter_id)
                    .single();
                  
                  if (datacenter && datacenter.site_id) {
                    const { data: site } = await supabase
                      .from('sites')
                      .select('id, name')
                      .eq('id', datacenter.site_id)
                      .single();
                    
                    if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
                    path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: site?.id || null });
                  }
                  path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
                }
                path.push({ id: node.id, name: node.name, level: 'node', parentId: cluster?.id || null, metadata: { status: node.status } });
              }
              path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: node?.id || null });
            }
            path.push({ id: vm.id, name: vm.name, level: 'vm', parentId: domain?.id || null, metadata: { status: vm.status } });
          }
          break;
        }
        case 'domain': {
          const { data: domain } = await supabase
            .from('domains')
            .select('id, name, node_id')
            .eq('id', nodeId)
            .single();
          
          if (domain && domain.node_id) {
            const { data: node } = await supabase
              .from('cluster_nodes')
              .select('id, name, cluster_id, status')
              .eq('id', domain.node_id)
              .single();
            
            if (node && node.cluster_id) {
              const { data: cluster } = await supabase
                .from('clusters')
                .select('id, name, datacenter_id')
                .eq('id', node.cluster_id)
                .single();
              
              if (cluster && cluster.datacenter_id) {
                const { data: datacenter } = await supabase
                  .from('datacenters')
                  .select('id, name, site_id')
                  .eq('id', cluster.datacenter_id)
                  .single();
                
                if (datacenter && datacenter.site_id) {
                  const { data: site } = await supabase
                    .from('sites')
                    .select('id, name')
                    .eq('id', datacenter.site_id)
                    .single();
                  
                  if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
                  path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: site?.id || null });
                }
                path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
              }
              path.push({ id: node.id, name: node.name, level: 'node', parentId: cluster?.id || null, metadata: { status: node.status } });
            }
            path.push({ id: domain.id, name: domain.name, level: 'domain', parentId: node?.id || null });
          }
          break;
        }
        case 'node': {
          const { data: node } = await supabase
            .from('cluster_nodes')
            .select('id, name, cluster_id, status')
            .eq('id', nodeId)
            .single();
          
          if (node && node.cluster_id) {
            const { data: cluster } = await supabase
              .from('clusters')
              .select('id, name, datacenter_id')
              .eq('id', node.cluster_id)
              .single();
            
            if (cluster && cluster.datacenter_id) {
              const { data: datacenter } = await supabase
                .from('datacenters')
                .select('id, name, site_id')
                .eq('id', cluster.datacenter_id)
                .single();
              
              if (datacenter && datacenter.site_id) {
                const { data: site } = await supabase
                  .from('sites')
                  .select('id, name')
                  .eq('id', datacenter.site_id)
                  .single();
                
                if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
                path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: site?.id || null });
              }
              path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
            }
            path.push({ id: node.id, name: node.name, level: 'node', parentId: cluster?.id || null, metadata: { status: node.status } });
          }
          break;
        }
        case 'cluster': {
          const { data: cluster } = await supabase
            .from('clusters')
            .select('id, name, datacenter_id')
            .eq('id', nodeId)
            .single();
          
          if (cluster && cluster.datacenter_id) {
            const { data: datacenter } = await supabase
              .from('datacenters')
              .select('id, name, site_id')
              .eq('id', cluster.datacenter_id)
              .single();
            
            if (datacenter && datacenter.site_id) {
              const { data: site } = await supabase
                .from('sites')
                .select('id, name')
                .eq('id', datacenter.site_id)
                .single();
              
              if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
              path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: site?.id || null });
            }
            path.push({ id: cluster.id, name: cluster.name, level: 'cluster', parentId: datacenter?.id || null });
          }
          break;
        }
        case 'datacenter': {
          const { data: datacenter } = await supabase
            .from('datacenters')
            .select('id, name, site_id')
            .eq('id', nodeId)
            .single();
          
          if (datacenter && datacenter.site_id) {
            const { data: site } = await supabase
              .from('sites')
              .select('id, name')
              .eq('id', datacenter.site_id)
              .single();
            
            if (site) path.push({ id: site.id, name: site.name, level: 'site', parentId: null });
            path.push({ id: datacenter.id, name: datacenter.name, level: 'datacenter', parentId: site?.id || null });
          }
          break;
        }
        case 'site': {
          const { data: site } = await supabase
            .from('sites')
            .select('id, name')
            .eq('id', nodeId)
            .single();
          
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

  // Global search (updated for new hierarchy)
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
      
      // Search all levels in parallel (excluding network from tree)
      const [sites, datacenters, clusters, nodes, domains, vms] = await Promise.all([
        supabase.from('sites').select('id, name').ilike('name', searchPattern).limit(5),
        supabase.from('datacenters').select('id, name, site_id').ilike('name', searchPattern).limit(5),
        supabase.from('clusters').select('id, name, datacenter_id').ilike('name', searchPattern).limit(5),
        supabase.from('cluster_nodes').select('id, name, cluster_id').ilike('name', searchPattern).limit(5),
        supabase.from('domains').select('id, name, node_id').ilike('name', searchPattern).limit(5),
        supabase.from('servers').select('id, name, domain_id').ilike('name', searchPattern).limit(5),
      ]);
      
      if (sites.data) {
        results.push(...sites.data.map(s => ({ id: s.id, name: s.name, level: 'site' as HierarchyLevel, parentId: null })));
      }
      if (datacenters.data) {
        results.push(...datacenters.data.map(dc => ({ id: dc.id, name: dc.name, level: 'datacenter' as HierarchyLevel, parentId: dc.site_id })));
      }
      if (clusters.data) {
        results.push(...clusters.data.map(c => ({ id: c.id, name: c.name, level: 'cluster' as HierarchyLevel, parentId: c.datacenter_id })));
      }
      if (nodes.data) {
        results.push(...nodes.data.map(n => ({ id: n.id, name: n.name, level: 'node' as HierarchyLevel, parentId: n.cluster_id })));
      }
      if (domains.data) {
        results.push(...domains.data.map(d => ({ id: d.id, name: d.name, level: 'domain' as HierarchyLevel, parentId: d.node_id })));
      }
      if (vms.data) {
        results.push(...vms.data.map(v => ({ id: v.id, name: v.name, level: 'vm' as HierarchyLevel, parentId: v.domain_id })));
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
