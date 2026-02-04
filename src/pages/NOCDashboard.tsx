import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeHealth } from '@/hooks/useRealtimeHealth';
import { useDomains } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HealthDonutChart from '@/components/noc/HealthDonutChart';
import AlertFeed from '@/components/noc/AlertFeed';
import ResourceHeatmap from '@/components/noc/ResourceHeatmap';
import CriticalAlertModal from '@/components/noc/CriticalAlertModal';
import {
  Radio,
  Activity,
  Server,
  Cpu,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const NOCDashboard: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { data: domains } = useDomains();
  const {
    globalHealth,
    siteHealth,
    domainHealth,
    recentAlerts,
    resources,
    isLoading,
    acknowledgeAlert,
    resolveAlert
  } = useRealtimeHealth();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [metricType, setMetricType] = useState<'cpu' | 'ram' | 'status'>('status');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'domains'>('overview');

  // Stats for header
  const stats = useMemo(() => ({
    totalVMs: resources.filter(r => r.type === 'server').length,
    totalNodes: resources.filter(r => r.type === 'node').length,
    onlineVMs: resources.filter(r => r.type === 'server' && (r.status === 'online' || r.status === 'production' || r.status === 'active')).length,
    criticalAlerts: recentAlerts.filter(a => a.alertType === 'critical' && !a.acknowledged).length
  }), [resources, recentAlerts]);

  const handleContactAdmin = () => {
    toast.info('Contacting on-call administrator...', {
      description: 'An escalation ticket has been created.'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4" dir={dir}>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Critical Alert Modal */}
      {alertsEnabled && (
        <CriticalAlertModal
          alerts={recentAlerts}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
          onContactAdmin={handleContactAdmin}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Radio className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {language === 'ar' ? 'مركز عمليات الشبكة' : 'Network Operations Center'}
              <Badge 
                variant="outline" 
                className={cn(
                  'ms-2',
                  globalHealth.status === 'healthy' && 'border-success text-success',
                  globalHealth.status === 'warning' && 'border-warning text-warning',
                  globalHealth.status === 'critical' && 'border-destructive text-destructive'
                )}
              >
                <span className="relative flex h-2 w-2 me-1.5">
                  <span className={cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                    globalHealth.status === 'healthy' && 'bg-success',
                    globalHealth.status === 'warning' && 'bg-warning',
                    globalHealth.status === 'critical' && 'bg-destructive'
                  )} />
                  <span className={cn(
                    'relative inline-flex rounded-full h-2 w-2',
                    globalHealth.status === 'healthy' && 'bg-success',
                    globalHealth.status === 'warning' && 'bg-warning',
                    globalHealth.status === 'critical' && 'bg-destructive'
                  )} />
                </span>
                LIVE
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'المراقبة الفورية للبنية التحتية' : 'Real-time infrastructure monitoring'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={cn(!alertsEnabled && 'opacity-50')}
          >
            {alertsEnabled ? (
              <Volume2 className="w-4 h-4 me-1" />
            ) : (
              <VolumeX className="w-4 h-4 me-1" />
            )}
            {alertsEnabled ? 'Alerts On' : 'Alerts Off'}
          </Button>
          <Button variant="outline" size="sm">
            <Maximize2 className="w-4 h-4 me-1" />
            Fullscreen
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalVMs}</p>
                <p className="text-xs text-muted-foreground">Total VMs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Cpu className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalNodes}</p>
                <p className="text-xs text-muted-foreground">Physical Nodes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-success/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.onlineVMs}</p>
                <p className="text-xs text-muted-foreground">VMs Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'bg-card/50',
          stats.criticalAlerts > 0 && 'border-destructive/30 pulse-alert'
        )}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  stats.criticalAlerts > 0 && 'text-destructive'
                )}>
                  {stats.criticalAlerts}
                </p>
                <p className="text-xs text-muted-foreground">Critical Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Health Overview */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="text-xs">Global Overview</TabsTrigger>
              <TabsTrigger value="sites" className="text-xs">By Site</TabsTrigger>
              <TabsTrigger value="domains" className="text-xs">By Domain</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <HealthDonutChart
                health={globalHealth}
                title="Global Infrastructure Health"
                subtitle={`Monitoring ${resources.length} resources across ${domains.length} domains`}
                size="lg"
              />
            </TabsContent>

            <TabsContent value="sites" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from(siteHealth.entries()).map(([siteId, health]) => (
                  <HealthDonutChart
                    key={siteId}
                    health={health}
                    title={`Site ${siteId.slice(0, 8)}...`}
                    size="sm"
                  />
                ))}
                {siteHealth.size === 0 && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No site data available</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="domains" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from(domainHealth.entries()).map(([domainId, health]) => {
                  const domain = domains.find(d => d.id === domainId);
                  return (
                    <HealthDonutChart
                      key={domainId}
                      health={health}
                      title={domain?.name || `Domain ${domainId.slice(0, 8)}...`}
                      size="sm"
                    />
                  );
                })}
                {domainHealth.size === 0 && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No domain data available</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Resource Heatmap */}
          <ResourceHeatmap
            resources={resources}
            domains={domains}
            selectedDomainId={selectedDomainId}
            onDomainChange={setSelectedDomainId}
            metricType={metricType}
            onMetricChange={setMetricType}
          />
        </div>

        {/* Right Column - Alert Feed */}
        <div className="lg:col-span-1">
          <AlertFeed
            alerts={recentAlerts}
            onAcknowledge={acknowledgeAlert}
            onResolve={resolveAlert}
            maxHeight="600px"
          />
        </div>
      </div>
    </div>
  );
};

export default NOCDashboard;
