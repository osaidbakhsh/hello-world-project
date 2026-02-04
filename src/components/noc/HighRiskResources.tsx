import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  XCircle, 
  Server, 
  Cpu,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { ResourceStatus } from '@/hooks/useRealtimeHealth';
import { cn } from '@/lib/utils';

interface HighRiskResourcesProps {
  resources: ResourceStatus[];
  onRefresh?: () => void;
}

const statusConfig = {
  offline: { 
    icon: XCircle, 
    class: 'border-destructive/50 bg-destructive/10',
    badge: 'bg-destructive text-destructive-foreground',
    label: 'Offline'
  },
  stopped: { 
    icon: XCircle, 
    class: 'border-destructive/50 bg-destructive/10',
    badge: 'bg-destructive text-destructive-foreground',
    label: 'Stopped'
  },
  error: { 
    icon: XCircle, 
    class: 'border-destructive/50 bg-destructive/10',
    badge: 'bg-destructive text-destructive-foreground',
    label: 'Error'
  },
  maintenance: { 
    icon: AlertTriangle, 
    class: 'border-warning/50 bg-warning/10',
    badge: 'bg-warning text-warning-foreground',
    label: 'Maintenance'
  },
  warning: { 
    icon: AlertTriangle, 
    class: 'border-warning/50 bg-warning/10',
    badge: 'bg-warning text-warning-foreground',
    label: 'Warning'
  },
  degraded: { 
    icon: AlertTriangle, 
    class: 'border-warning/50 bg-warning/10',
    badge: 'bg-warning text-warning-foreground',
    label: 'Degraded'
  }
};

const HighRiskResources: React.FC<HighRiskResourcesProps> = ({
  resources,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Filter for critical and warning status resources
  const highRiskResources = resources.filter(r => 
    r.status && ['offline', 'stopped', 'error', 'maintenance', 'warning', 'degraded'].includes(r.status)
  );

  // Sort by severity (critical first)
  const sortedResources = [...highRiskResources].sort((a, b) => {
    const criticalStatuses = ['offline', 'stopped', 'error'];
    const aIsCritical = a.status && criticalStatuses.includes(a.status);
    const bIsCritical = b.status && criticalStatuses.includes(b.status);
    if (aIsCritical && !bIsCritical) return -1;
    if (!aIsCritical && bIsCritical) return 1;
    return 0;
  });

  const criticalCount = highRiskResources.filter(r => 
    r.status && ['offline', 'stopped', 'error'].includes(r.status)
  ).length;

  const warningCount = highRiskResources.length - criticalCount;

  const handleNavigate = (resource: ResourceStatus) => {
    const level = resource.type === 'server' ? 'vm' : resource.type;
    navigate(`/resource/${level}/${resource.id}`);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'server':
        return Server;
      case 'node':
        return Cpu;
      default:
        return Server;
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            High-Risk Resources
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-warning text-warning-foreground text-xs">
                {warningCount} Warning
              </Badge>
            )}
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={onRefresh}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 pt-0">
            {sortedResources.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No high-risk resources detected</p>
                <p className="text-xs opacity-70">All systems operational</p>
              </div>
            ) : (
              sortedResources.map((resource) => {
                const status = resource.status as keyof typeof statusConfig;
                const config = statusConfig[status] || statusConfig.warning;
                const StatusIcon = config.icon;
                const ResourceIcon = getResourceIcon(resource.type);

                return (
                  <div
                    key={resource.id}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]',
                      config.class
                    )}
                    onClick={() => handleNavigate(resource)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ResourceIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {resource.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {resource.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={cn('text-[10px] px-1.5', config.badge)}>
                          <StatusIcon className="w-3 h-3 me-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(resource);
                        }}
                      >
                        <ExternalLink className="w-3 h-3 me-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HighRiskResources;
