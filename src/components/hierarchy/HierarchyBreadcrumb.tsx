import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHierarchy, HierarchyLevel } from '@/contexts/HierarchyContext';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  MapPin,
  Globe,
  Building2,
  Server,
  Network,
  Cpu,
  Monitor,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const HierarchyBreadcrumb: React.FC = () => {
  const navigate = useNavigate();
  const { currentPath } = useHierarchy();

  if (currentPath.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {currentPath.map((node, index) => {
          const Icon = levelIcons[node.level];
          const colorClass = levelColors[node.level];
          const isLast = index === currentPath.length - 1;
          
          return (
            <React.Fragment key={node.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    <Icon className={cn('w-4 h-4', colorClass)} />
                    <span>{node.name}</span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => navigate(`/resource/${node.level}/${node.id}`)}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
                  >
                    <Icon className={cn('w-4 h-4', colorClass)} />
                    <span className="max-w-[120px] truncate">{node.name}</span>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default HierarchyBreadcrumb;
