import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid, Cpu, MemoryStick, Server } from 'lucide-react';
import { ResourceStatus } from '@/hooks/useRealtimeHealth';
import { cn } from '@/lib/utils';

interface ResourceHeatmapProps {
  resources: ResourceStatus[];
  domains: { id: string; name: string }[];
  selectedDomainId: string;
  onDomainChange: (domainId: string) => void;
  metricType: 'cpu' | 'ram' | 'status';
  onMetricChange: (metric: 'cpu' | 'ram' | 'status') => void;
}

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'online':
    case 'production':
    case 'active':
      return 'bg-success';
    case 'maintenance':
    case 'warning':
    case 'degraded':
      return 'bg-warning';
    case 'offline':
    case 'stopped':
    case 'error':
      return 'bg-destructive';
    default:
      return 'bg-muted';
  }
};

const getUtilizationColor = (percent: number | undefined): string => {
  if (percent === undefined) return 'bg-muted';
  if (percent >= 90) return 'bg-destructive';
  if (percent >= 70) return 'bg-warning';
  if (percent >= 50) return 'bg-accent';
  return 'bg-success';
};

const ResourceHeatmap: React.FC<ResourceHeatmapProps> = ({
  resources,
  domains,
  selectedDomainId,
  onDomainChange,
  metricType,
  onMetricChange
}) => {
  const filteredResources = useMemo(() => {
    if (selectedDomainId === 'all') {
      return resources;
    }
    return resources.filter(r => r.domainId === selectedDomainId);
  }, [resources, selectedDomainId]);

  const nodeResources = filteredResources.filter(r => r.type === 'node');
  const serverResources = filteredResources.filter(r => r.type === 'server');

  const getCellColor = (resource: ResourceStatus): string => {
    switch (metricType) {
      case 'cpu':
        return getUtilizationColor(resource.cpuUsage);
      case 'ram':
        return getUtilizationColor(resource.ramUsage);
      case 'status':
      default:
        return getStatusColor(resource.status);
    }
  };

  const getCellValue = (resource: ResourceStatus): string => {
    switch (metricType) {
      case 'cpu':
        return resource.cpuUsage !== undefined ? `${Math.round(resource.cpuUsage)}%` : 'N/A';
      case 'ram':
        return resource.ramUsage !== undefined ? `${Math.round(resource.ramUsage)}%` : 'N/A';
      case 'status':
      default:
        return resource.status || 'unknown';
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Grid className="w-4 h-4 text-primary" />
            Resource Heatmap
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Domain Filter */}
            <Select value={selectedDomainId} onValueChange={onDomainChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Metric Type */}
            <Select value={metricType} onValueChange={(v) => onMetricChange(v as any)}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="cpu">CPU</SelectItem>
                <SelectItem value="ram">RAM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          {metricType === 'status' ? (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success" />
                <span>Online</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-warning" />
                <span>Warning</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive" />
                <span>Offline</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success" />
                <span>&lt;50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-accent" />
                <span>50-70%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-warning" />
                <span>70-90%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive" />
                <span>&gt;90%</span>
              </div>
            </>
          )}
        </div>

        {/* Nodes Section */}
        {nodeResources.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              <span className="text-xs font-medium">Physical Nodes ({nodeResources.length})</span>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1">
              {nodeResources.map(resource => (
                <Tooltip key={resource.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'aspect-square rounded transition-all cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary',
                        getCellColor(resource)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium">{resource.name}</p>
                      <p className="text-muted-foreground">{getCellValue(resource)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* VMs Section */}
        {serverResources.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">Virtual Machines ({serverResources.length})</span>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1">
              {serverResources.slice(0, 128).map(resource => (
                <Tooltip key={resource.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'aspect-square rounded transition-all cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary',
                        getCellColor(resource)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium">{resource.name}</p>
                      <p className="text-muted-foreground">{getCellValue(resource)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            {serverResources.length > 128 && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing 128 of {serverResources.length} VMs
              </p>
            )}
          </div>
        )}

        {filteredResources.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Grid className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No resources in selected scope</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResourceHeatmap;
