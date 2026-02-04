import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHierarchy, HierarchyNode, HierarchyLevel } from '@/contexts/HierarchyContext';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Globe,
  Building2,
  Server,
  Cpu,
  Monitor,
  Search,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const levelIcons: Record<HierarchyLevel, React.ElementType> = {
  site: MapPin,
  datacenter: Building2,
  cluster: Server,
  node: Cpu,
  domain: Globe,
  vm: Monitor,
};

const levelColors: Record<HierarchyLevel, string> = {
  site: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  datacenter: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cluster: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  node: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  domain: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  vm: 'bg-primary/20 text-primary border-primary/30',
};

interface SearchResultWithPath extends HierarchyNode {
  fullPath?: string;
}

const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPath, fetchPathToNode, expandToNode } = useHierarchy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultWithPath[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search all tables when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchAll = async () => {
      setIsSearching(true);
      const searchPattern = `%${query}%`;

      try {
        const [sites, datacenters, clusters, nodes, domains, vms] = await Promise.all([
          supabase.from('sites').select('id, name').ilike('name', searchPattern).limit(5),
          supabase.from('datacenters').select('id, name, site_id').ilike('name', searchPattern).limit(5),
          supabase.from('clusters').select('id, name, datacenter_id').ilike('name', searchPattern).limit(5),
          supabase.from('cluster_nodes').select('id, name, cluster_id, status').ilike('name', searchPattern).limit(5),
          supabase.from('domains').select('id, name, node_id').ilike('name', searchPattern).limit(5),
          supabase.from('servers').select('id, name, domain_id, status').ilike('name', searchPattern).limit(5),
        ]);

        const allResults: SearchResultWithPath[] = [];

        // Sites
        if (sites.data) {
          allResults.push(...sites.data.map(s => ({
            id: s.id,
            name: s.name,
            level: 'site' as HierarchyLevel,
            parentId: null,
            fullPath: s.name,
          })));
        }

        // Datacenters (under Site)
        if (datacenters.data) {
          allResults.push(...datacenters.data.map(dc => ({
            id: dc.id,
            name: dc.name,
            level: 'datacenter' as HierarchyLevel,
            parentId: dc.site_id,
            fullPath: dc.name,
          })));
        }

        // Clusters (under Datacenter)
        if (clusters.data) {
          allResults.push(...clusters.data.map(c => ({
            id: c.id,
            name: c.name,
            level: 'cluster' as HierarchyLevel,
            parentId: c.datacenter_id,
            fullPath: c.name,
          })));
        }

        // Nodes (under Cluster)
        if (nodes.data) {
          allResults.push(...nodes.data.map(n => ({
            id: n.id,
            name: n.name,
            level: 'node' as HierarchyLevel,
            parentId: n.cluster_id,
            fullPath: n.name,
            metadata: { status: n.status },
          })));
        }

        // Domains (under Node)
        if (domains.data) {
          allResults.push(...domains.data.map(d => ({
            id: d.id,
            name: d.name,
            level: 'domain' as HierarchyLevel,
            parentId: d.node_id,
            fullPath: d.name,
          })));
        }

        // VMs (under Domain)
        if (vms.data) {
          allResults.push(...vms.data.map(v => ({
            id: v.id,
            name: v.name,
            level: 'vm' as HierarchyLevel,
            parentId: v.domain_id,
            fullPath: v.name,
            metadata: { status: v.status },
          })));
        }

        setResults(allResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = useCallback(async (result: SearchResultWithPath) => {
    setOpen(false);
    setQuery('');

    // Fetch and expand path
    const path = await fetchPathToNode(result.id, result.level);
    setCurrentPath(path);
    expandToNode(result.id, path);

    // Navigate to resource
    navigate(`/resource/${result.level}/${result.id}`);
  }, [navigate, fetchPathToNode, setCurrentPath, expandToNode]);

  // Group results by level
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.level]) {
      acc[result.level] = [];
    }
    acc[result.level].push(result);
    return acc;
  }, {} as Record<HierarchyLevel, SearchResultWithPath[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search infrastructure... (Sites, Domains, VMs...)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {isSearching ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-5/6" />
          </div>
        ) : results.length === 0 && query.length >= 2 ? (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        ) : (
          Object.entries(groupedResults).map(([level, items], idx) => {
            const Icon = levelIcons[level as HierarchyLevel];
            const colorClass = levelColors[level as HierarchyLevel];

            return (
              <React.Fragment key={level}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={level.charAt(0).toUpperCase() + level.slice(1) + 's'}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${item.level}-${item.id}`}
                      value={`${item.name}-${item.id}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className={cn('p-1.5 rounded', colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.name}</div>
                        {item.fullPath && (
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            {item.fullPath}
                          </div>
                        )}
                      </div>
                      {item.metadata?.status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            item.metadata.status === 'online' || item.metadata.status === 'production' || item.metadata.status === 'active'
                              ? 'border-success text-success'
                              : item.metadata.status === 'offline' || item.metadata.status === 'stopped'
                              ? 'border-destructive text-destructive'
                              : 'border-warning text-warning'
                          )}
                        >
                          {String(item.metadata.status)}
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            );
          })
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
