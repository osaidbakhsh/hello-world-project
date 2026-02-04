import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useHierarchy, HierarchyNode, HierarchyLevel } from '@/contexts/HierarchyContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronRight, 
  ChevronDown,
  MapPin,
  Globe,
  Building2,
  Server,
  Network,
  Cpu,
  Monitor,
  Loader2
} from 'lucide-react';

const levelIcons: Record<HierarchyLevel, React.ElementType> = {
  site: MapPin,
  domain: Globe,
  datacenter: Building2,
  cluster: Server,
  network: Network,
  node: Cpu,
  vm: Monitor,
};

const levelColors: Record<HierarchyLevel, string> = {
  site: 'text-rose-500',
  domain: 'text-blue-500',
  datacenter: 'text-amber-500',
  cluster: 'text-emerald-500',
  network: 'text-purple-500',
  node: 'text-cyan-500',
  vm: 'text-primary',
};

const nextLevel: Record<HierarchyLevel, HierarchyLevel | null> = {
  site: 'domain',
  domain: 'datacenter',
  datacenter: 'cluster',
  cluster: 'network',
  network: 'vm',
  node: null,
  vm: null,
};

interface TreeNodeProps {
  node: HierarchyNode;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth }) => {
  const navigate = useNavigate();
  const { expandedNodes, toggleNode, fetchChildren, setCurrentPath, fetchPathToNode } = useHierarchy();
  const [children, setChildren] = useState<HierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isExpanded = expandedNodes.has(node.id);
  const Icon = levelIcons[node.level];
  const colorClass = levelColors[node.level];
  const childLevel = nextLevel[node.level];

  // Lazy load children when expanded
  useEffect(() => {
    if (isExpanded && !hasLoaded && childLevel) {
      setIsLoading(true);
      fetchChildren(node.id, childLevel).then(data => {
        setChildren(data);
        setHasLoaded(true);
        setIsLoading(false);
      });
    }
  }, [isExpanded, hasLoaded, childLevel, node.id, fetchChildren]);

  const handleClick = useCallback(async () => {
    // Fetch and set path for breadcrumbs
    const path = await fetchPathToNode(node.id, node.level);
    setCurrentPath(path);
    
    // Navigate to resource detail
    navigate(`/resource/${node.level}/${node.id}`);
  }, [node, navigate, fetchPathToNode, setCurrentPath]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNode(node.id);
  }, [node.id, toggleNode]);

  const hasChildren = childLevel !== null;

  return (
    <div className="select-none">
      <Collapsible open={isExpanded}>
        <div
          className={cn(
            'flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'group'
          )}
          style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild onClick={handleToggle}>
              <button className="p-0.5 hover:bg-muted rounded">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <span className="w-5" />
          )}
          
          <div 
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={handleClick}
          >
            <Icon className={cn('w-4 h-4 shrink-0', colorClass)} />
            <span className="truncate text-sm text-sidebar-foreground group-hover:text-sidebar-accent-foreground">
              {node.name}
            </span>
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            {isLoading ? (
              <div className="space-y-1 py-1" style={{ paddingInlineStart: `${(depth + 1) * 12 + 8}px` }}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-6 w-3/4" />
                ))}
              </div>
            ) : children.length > 0 ? (
              children.map(child => (
                <TreeNode key={child.id} node={child} depth={depth + 1} />
              ))
            ) : hasLoaded ? (
              <div 
                className="text-xs text-muted-foreground py-1 italic"
                style={{ paddingInlineStart: `${(depth + 1) * 12 + 24}px` }}
              >
                No items
              </div>
            ) : null}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

const HierarchyTree: React.FC = () => {
  const { fetchChildren } = useHierarchy();
  const [sites, setSites] = useState<HierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChildren(null, 'site').then(data => {
      setSites(data);
      setIsLoading(false);
    });
  }, [fetchChildren]);

  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-4/5" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No sites configured</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {sites.map(site => (
          <TreeNode key={site.id} node={site} depth={0} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default HierarchyTree;
