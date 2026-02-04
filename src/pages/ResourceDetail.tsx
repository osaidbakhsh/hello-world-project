import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHierarchy, HierarchyLevel } from '@/contexts/HierarchyContext';
import { supabase } from '@/integrations/supabase/client';
import HierarchyBreadcrumb from '@/components/hierarchy/HierarchyBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import InfraVaultTab from '@/components/vault/InfraVaultTab';
import { 
  MapPin,
  Globe,
  Building2,
  Server,
  Network,
  Cpu,
  Monitor,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  HardDrive,
  MemoryStick,
  Lock,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap
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

const levelLabels: Record<HierarchyLevel, { en: string; ar: string }> = {
  site: { en: 'Site', ar: 'الموقع' },
  domain: { en: 'Domain', ar: 'النطاق' },
  datacenter: { en: 'Datacenter', ar: 'مركز البيانات' },
  cluster: { en: 'Cluster', ar: 'الكلستر' },
  network: { en: 'Network', ar: 'الشبكة' },
  node: { en: 'Node', ar: 'العقدة' },
  vm: { en: 'VM', ar: 'الجهاز الافتراضي' },
};

interface ResourceData {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface HealthStats {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  healthPercent: number;
}

const ResourceDetail: React.FC = () => {
  const { level, id } = useParams<{ level: HierarchyLevel; id: string }>();
  const navigate = useNavigate();
  const { t, dir, language } = useLanguage();
  const { setCurrentPath, fetchPathToNode } = useHierarchy();
  
  const [resource, setResource] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);

  useEffect(() => {
    if (!level || !id) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch path for breadcrumbs
      const path = await fetchPathToNode(id, level);
      setCurrentPath(path);
      
      // Fetch resource data based on level
      try {
        let data: ResourceData | null = null;
        let statsData: Record<string, number> = {};
        let healthData: HealthStats | null = null;
        
        switch (level) {
          case 'site': {
            const { data: site } = await supabase.from('sites').select('*').eq('id', id).single();
            data = site;
            
            // Get aggregate stats through domains
            const { data: domains } = await supabase.from('domains').select('id').eq('site_id', id);
            const domainIds = domains?.map(d => d.id) || [];
            statsData.domains = domainIds.length;
            
            if (domainIds.length > 0) {
              // Get datacenters count - use separate queries for each domain
              let dcTotal = 0;
              for (const domainId of domainIds.slice(0, 10)) { // Limit to prevent deep nesting
                const { count } = await supabase.from('datacenters').select('*', { count: 'exact', head: true }).eq('domain_id', domainId);
                dcTotal += count || 0;
              }
              statsData.datacenters = dcTotal;
              
              // Get VM health stats for site - use separate queries
              const allVmStatuses: string[] = [];
              for (const domainId of domainIds.slice(0, 10)) {
                const query = supabase.from('servers').select('status');
                const result = await (query as any).eq('domain_id', domainId);
                const vms = result.data as Array<{ status: string | null }> | null;
                if (vms) {
                  allVmStatuses.push(...vms.map(v => v.status || 'unknown'));
                }
              }
              
              if (allVmStatuses.length > 0) {
                const total = allVmStatuses.length;
                const healthy = allVmStatuses.filter(s => s === 'production' || s === 'active' || s === 'online').length;
                const warning = allVmStatuses.filter(s => s === 'maintenance' || s === 'warning' || s === 'degraded').length;
                const critical = allVmStatuses.filter(s => s === 'offline' || s === 'stopped' || s === 'error').length;
                healthData = {
                  total,
                  healthy,
                  warning,
                  critical,
                  healthPercent: total > 0 ? Math.round((healthy / total) * 100) : 100
                };
                statsData.vms = total;
              }
            }
            break;
          }
          case 'domain': {
            const { data: domain } = await supabase.from('domains').select('*').eq('id', id).single();
            data = domain;
            
            const { count: dcCount } = await supabase.from('datacenters').select('*', { count: 'exact', head: true }).eq('domain_id', id);
            statsData.datacenters = dcCount || 0;
            
            const { count: clusterCount } = await supabase.from('clusters').select('*', { count: 'exact', head: true }).eq('domain_id', id);
            statsData.clusters = clusterCount || 0;
            
            // Get VM health stats for domain
            const vmQuery = supabase.from('servers').select('status');
            const vmResult = await (vmQuery as any).eq('domain_id', id);
            const vms = vmResult.data as Array<{ status: string | null }> | null;
            if (vms) {
              const total = vms.length;
              const healthy = vms.filter(v => v.status === 'production' || v.status === 'active' || v.status === 'online').length;
              const warning = vms.filter(v => v.status === 'maintenance' || v.status === 'warning' || v.status === 'degraded').length;
              const critical = vms.filter(v => v.status === 'offline' || v.status === 'stopped' || v.status === 'error').length;
              healthData = {
                total,
                healthy,
                warning,
                critical,
                healthPercent: total > 0 ? Math.round((healthy / total) * 100) : 100
              };
              statsData.vms = total;
            }
            break;
          }
          case 'datacenter': {
            const { data: dc } = await supabase.from('datacenters').select('*').eq('id', id).single();
            data = dc;
            
            const { count: clusterCount } = await supabase.from('clusters').select('*', { count: 'exact', head: true }).eq('datacenter_id', id);
            statsData.clusters = clusterCount || 0;
            break;
          }
          case 'cluster': {
            const { data: cluster } = await supabase.from('clusters').select('*').eq('id', id).single();
            data = cluster;
            
            const { count: nodeCount } = await supabase.from('cluster_nodes').select('*', { count: 'exact', head: true }).eq('cluster_id', id);
            const { count: networkCount } = await supabase.from('networks').select('*', { count: 'exact', head: true }).eq('cluster_id', id);
            statsData.nodes = nodeCount || 0;
            statsData.networks = networkCount || 0;
            
            // Get node health
            const nodeQuery = supabase.from('cluster_nodes').select('status');
            const nodeResult = await (nodeQuery as any).eq('cluster_id', id);
            const nodes = nodeResult.data as Array<{ status: string | null }> | null;
            if (nodes) {
              const total = nodes.length;
              const healthy = nodes.filter(n => n.status === 'online' || n.status === 'active').length;
              const warning = nodes.filter(n => n.status === 'maintenance' || n.status === 'warning').length;
              const critical = nodes.filter(n => n.status === 'offline' || n.status === 'error').length;
              healthData = {
                total,
                healthy,
                warning,
                critical,
                healthPercent: total > 0 ? Math.round((healthy / total) * 100) : 100
              };
            }
            break;
          }
          case 'network': {
            const { data: network } = await supabase.from('networks').select('*').eq('id', id).single();
            data = network;
            
            const netVmQuery = supabase.from('servers').select('id, status');
            const netVmResult = await (netVmQuery as any).eq('network_id', id);
            const netVms = netVmResult.data as Array<{ id: string; status: string | null }> | null;
            if (netVms) {
              statsData.vms = netVms.length;
              const total = netVms.length;
              const healthy = netVms.filter(v => v.status === 'production' || v.status === 'active' || v.status === 'online').length;
              const warning = netVms.filter(v => v.status === 'maintenance' || v.status === 'warning').length;
              const critical = netVms.filter(v => v.status === 'offline' || v.status === 'stopped').length;
              healthData = {
                total,
                healthy,
                warning,
                critical,
                healthPercent: total > 0 ? Math.round((healthy / total) * 100) : 100
              };
            }
            break;
          }
          case 'node': {
            const { data: node } = await supabase.from('cluster_nodes').select('*').eq('id', id).single();
            data = node;
            break;
          }
          case 'vm': {
            const { data: vm } = await supabase.from('servers').select('*').eq('id', id).single();
            data = vm;
            break;
          }
        }
        
        setResource(data);
        setStats(statsData);
        setHealthStats(healthData);
      } catch (error) {
        console.error('Error fetching resource:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [level, id, fetchPathToNode, setCurrentPath]);

  if (!level || !id) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Invalid resource
      </div>
    );
  }

  const Icon = levelIcons[level];
  const showVaultTab = level === 'node' || level === 'vm';
  const levelLabel = levelLabels[level];

  if (loading) {
    return (
      <div className="space-y-4" dir={dir}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="space-y-4" dir={dir}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 me-2" />
          {language === 'ar' ? 'رجوع' : 'Back'}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Resource not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Compact Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{resource.name}</h1>
            <Badge variant="outline" className="text-xs shrink-0">
              {language === 'ar' ? levelLabel.ar : levelLabel.en}
            </Badge>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <HierarchyBreadcrumb />

      {/* Health Overview for aggregate levels */}
      {healthStats && (level === 'site' || level === 'domain' || level === 'cluster' || level === 'network') && (
        <HealthOverviewWidget health={healthStats} language={language} level={level} />
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          {showVaultTab && (
            <TabsTrigger value="vault" className="gap-1.5 text-xs">
              <Lock className="w-3.5 h-3.5" />
              {language === 'ar' ? 'الخزنة' : 'Vault'}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Stats Cards - Dense Grid */}
          {Object.keys(stats).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats).map(([key, value]) => (
                <Card key={key} className="bg-card/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-2xl font-bold text-primary">{value}</div>
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Resource-specific content */}
          {level === 'node' && (
            <NodeOverview resource={resource} language={language} />
          )}
          
          {level === 'vm' && (
            <VMOverview resource={resource} language={language} />
          )}
          
          {level === 'datacenter' && (
            <DatacenterOverview resource={resource} language={language} />
          )}

          {/* Generic details */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'التفاصيل' : 'Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(resource).filter(([key]) => 
                  !['id', 'created_at', 'updated_at', 'hierarchy_path', 'created_by'].includes(key)
                ).map(([key, value]) => (
                  <div key={key} className="space-y-0.5">
                    <dt className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-sm font-medium truncate">
                      {value === null ? '-' : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {showVaultTab && (
          <TabsContent value="vault" className="mt-4">
            <InfraVaultTab resourceType={level} resourceId={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Health Overview Widget for Sites/Domains
const HealthOverviewWidget: React.FC<{ 
  health: HealthStats; 
  language: string;
  level: HierarchyLevel;
}> = ({ health, language, level }) => {
  const healthColor = health.healthPercent >= 90 
    ? 'text-success' 
    : health.healthPercent >= 70 
    ? 'text-warning' 
    : 'text-destructive';

  const resourceLabel = level === 'cluster' ? 'Nodes' : 'VMs';
  const resourceLabelAr = level === 'cluster' ? 'العقد' : 'الأجهزة الافتراضية';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Health Score */}
      <Card className="col-span-2 md:col-span-1 bg-card/50 border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Activity className={cn('w-5 h-5', healthColor)} />
            <div>
              <div className={cn('text-2xl font-bold', healthColor)}>
                {health.healthPercent}%
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'صحة النظام' : 'Health Score'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xl font-bold">{health.total}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? `إجمالي ${resourceLabelAr}` : `Total ${resourceLabel}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Healthy */}
      <Card className="bg-card/50 border-success/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <div>
              <div className="text-xl font-bold text-success">{health.healthy}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'سليم' : 'Healthy'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="bg-card/50 border-warning/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <div>
              <div className="text-xl font-bold text-warning">{health.warning}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'تحذير' : 'Warning'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical */}
      <Card className="bg-card/50 border-destructive/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <div>
              <div className="text-xl font-bold text-destructive">{health.critical}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'حرج' : 'Critical'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Node-specific overview
const NodeOverview: React.FC<{ resource: ResourceData; language: string }> = ({ resource, language }) => {
  const cpuCores = (resource.cpu_cores as number) || 0;
  const ramGb = (resource.ram_gb as number) || 0;
  const storageTotal = (resource.storage_total_tb as number) || 0;
  const storageUsed = (resource.storage_used_tb as number) || 0;
  const status = (resource.status as string) || 'unknown';

  const storagePercent = storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            {status === 'online' ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : status === 'offline' ? (
              <XCircle className="w-5 h-5 text-destructive" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الحالة' : 'Status'}
              </p>
              <p className="text-sm font-semibold capitalize">{status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'المعالج' : 'CPU'}
              </p>
              <p className="text-sm font-semibold">{cpuCores} Cores</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <MemoryStick className="w-5 h-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الذاكرة' : 'RAM'}
              </p>
              <p className="text-sm font-semibold">{ramGb} GB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? 'التخزين' : 'Storage'}
              </span>
            </div>
            <span className="text-xs font-medium">{storageUsed}/{storageTotal} TB</span>
          </div>
          <Progress value={storagePercent} className="h-1.5" />
        </CardContent>
      </Card>
    </div>
  );
};

// VM-specific overview with realtime status
const VMOverview: React.FC<{ resource: ResourceData; language: string }> = ({ resource, language }) => {
  const [status, setStatus] = useState((resource.status as string) || 'unknown');

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel(`vm-${resource.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'servers',
          filter: `id=eq.${resource.id}`
        },
        (payload) => {
          if (payload.new && typeof payload.new.status === 'string') {
            setStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resource.id]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              {status === 'production' || status === 'active' ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : status === 'stopped' || status === 'offline' ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : (
                <Activity className="w-5 h-5 text-warning" />
              )}
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الحالة المباشرة' : 'Live Status'}
              </p>
              <p className="text-sm font-semibold capitalize">{status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'نظام التشغيل' : 'OS'}
              </p>
              <p className="text-sm font-semibold truncate">{(resource.operating_system as string) || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'عنوان IP' : 'IP Address'}
              </p>
              <p className="text-sm font-semibold font-mono">{(resource.ip_address as string) || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'البيئة' : 'Environment'}
              </p>
              <p className="text-sm font-semibold capitalize">{(resource.environment as string) || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Datacenter overview
const DatacenterOverview: React.FC<{ resource: ResourceData; language: string }> = ({ resource, language }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">
            {language === 'ar' ? 'مستوى المركز' : 'Tier Level'}
          </p>
          <Badge variant="outline" className="text-sm">
            {(resource.tier_level as string) || 'N/A'}
          </Badge>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'سعة الطاقة' : 'Power'}
              </p>
              <p className="text-lg font-bold">{(resource.power_capacity_kw as number) || 0} kW</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">
            {language === 'ar' ? 'عدد الخزائن' : 'Racks'}
          </p>
          <p className="text-lg font-bold">{(resource.rack_count as number) || 0}</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-0.5">
            {language === 'ar' ? 'المساحة' : 'Floor Space'}
          </p>
          <p className="text-lg font-bold">{(resource.floor_space_sqm as number) || 0} m²</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceDetail;
