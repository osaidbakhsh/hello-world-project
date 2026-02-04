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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Health status type
type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

const healthColors: Record<HealthStatus, string> = {
  healthy: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
  unknown: 'bg-muted',
};

const healthLabels: Record<HealthStatus, string> = {
  healthy: 'All systems operational',
  warning: 'Some issues detected',
  critical: 'Critical issues detected',
  unknown: 'Status unknown',
};

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

interface BreadcrumbNodeWithHealth {
  id: string;
  name: string;
  level: HierarchyLevel;
  health?: HealthStatus;
}

interface HierarchyBreadcrumbProps {
  showHealth?: boolean;
}

// Health indicator component
const HealthIndicator: React.FC<{ status: HealthStatus }> = ({ status }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="relative flex h-2 w-2">
        <span className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75',
          healthColors[status],
          status === 'critical' && 'animate-ping'
        )} />
        <span className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          healthColors[status]
        )} />
      </span>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">
      {healthLabels[status]}
    </TooltipContent>
  </Tooltip>
);

const HierarchyBreadcrumb: React.FC<HierarchyBreadcrumbProps> = ({ showHealth = true }) => {
  const navigate = useNavigate();
  const { currentPath } = useHierarchy();

  if (currentPath.length === 0) {
    return null;
  }

  // Derive health from node status if available
  const getHealthFromStatus = (status?: string): HealthStatus => {
    if (!status) return 'unknown';
    if (['online', 'production', 'active'].includes(status)) return 'healthy';
    if (['maintenance', 'warning', 'degraded'].includes(status)) return 'warning';
    if (['offline', 'stopped', 'error'].includes(status)) return 'critical';
    return 'unknown';
  };

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
          const nodeWithHealth = node as BreadcrumbNodeWithHealth;
          const health = nodeWithHealth.health || getHealthFromStatus((node as any).status);
          
          return (
            <React.Fragment key={node.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    {showHealth && health !== 'unknown' && (
                      <HealthIndicator status={health} />
                    )}
                    <Icon className={cn('w-4 h-4', colorClass)} />
                    <span>{node.name}</span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => navigate(`/resource/${node.level}/${node.id}`)}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
                  >
                    {showHealth && health !== 'unknown' && (
                      <HealthIndicator status={health} />
                    )}
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
