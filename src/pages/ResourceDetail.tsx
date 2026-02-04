import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHierarchy, HierarchyLevel } from '@/contexts/HierarchyContext';
import { supabase } from '@/integrations/supabase/client';
import HierarchyBreadcrumb from '@/components/hierarchy/HierarchyBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Lock
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
  site: 'text-rose-500 bg-rose-500/10',
  domain: 'text-blue-500 bg-blue-500/10',
  datacenter: 'text-amber-500 bg-amber-500/10',
  cluster: 'text-emerald-500 bg-emerald-500/10',
  network: 'text-purple-500 bg-purple-500/10',
  node: 'text-cyan-500 bg-cyan-500/10',
  vm: 'text-primary bg-primary/10',
};

interface ResourceData {
  id: string;
  name: string;
  [key: string]: unknown;
}

const ResourceDetail: React.FC = () => {
  const { level, id } = useParams<{ level: HierarchyLevel; id: string }>();
  const navigate = useNavigate();
  const { t, dir, language } = useLanguage();
  const { setCurrentPath, fetchPathToNode } = useHierarchy();
  
  const [resource, setResource] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});

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
        
        switch (level) {
          case 'site': {
            const { data: site } = await supabase.from('sites').select('*').eq('id', id).single();
            data = site;
            
            // Get aggregate stats
            const { count: domainCount } = await supabase.from('domains').select('*', { count: 'exact', head: true }).eq('site_id', id);
            statsData.domains = domainCount || 0;
            break;
          }
          case 'domain': {
            const { data: domain } = await supabase.from('domains').select('*').eq('id', id).single();
            data = domain;
            
            const { count: dcCount } = await supabase.from('datacenters').select('*', { count: 'exact', head: true }).eq('domain_id', id);
            statsData.datacenters = dcCount || 0;
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
            break;
          }
          case 'network': {
            const { data: network } = await supabase.from('networks').select('*').eq('id', id).single();
            data = network;
            
            const { count: vmCount } = await supabase.from('servers').select('*', { count: 'exact', head: true }).eq('network_id', id);
            statsData.vms = vmCount || 0;
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
  const colorClass = levelColors[level];
  const showVaultTab = level === 'node' || level === 'vm';

  if (loading) {
    return (
      <div className="space-y-6" dir={dir}>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="space-y-6" dir={dir}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
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
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{resource.name}</h1>
          <Badge variant="outline" className="mt-1">
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Breadcrumbs */}
      <HierarchyBreadcrumb />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          {showVaultTab && (
            <TabsTrigger value="vault" className="gap-2">
              <Lock className="w-4 h-4" />
              {language === 'ar' ? 'الخزنة' : 'Vault'}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Cards */}
          {Object.keys(stats).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-primary">{value}</div>
                    <p className="text-sm text-muted-foreground capitalize">{key}</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'ar' ? 'التفاصيل' : 'Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(resource).filter(([key]) => 
                  !['id', 'created_at', 'updated_at', 'hierarchy_path', 'created_by'].includes(key)
                ).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="font-medium">
                      {value === null ? '-' : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {showVaultTab && (
          <TabsContent value="vault" className="mt-6">
            <InfraVaultTab resourceType={level} resourceId={id} />
          </TabsContent>
        )}
      </Tabs>
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {status === 'online' ? (
              <CheckCircle className="w-8 h-8 text-success" />
            ) : status === 'offline' ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-warning" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الحالة' : 'Status'}
              </p>
              <p className="font-semibold capitalize">{status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'المعالج' : 'CPU Cores'}
              </p>
              <p className="font-semibold">{cpuCores}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <MemoryStick className="w-8 h-8 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الذاكرة' : 'RAM'}
              </p>
              <p className="font-semibold">{ramGb} GB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'التخزين' : 'Storage'}
              </span>
            </div>
            <span className="text-sm font-medium">{storageUsed}/{storageTotal} TB</span>
          </div>
          <Progress value={storagePercent} className="h-2" />
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              {status === 'production' || status === 'active' ? (
                <CheckCircle className="w-8 h-8 text-success" />
              ) : status === 'stopped' || status === 'offline' ? (
                <XCircle className="w-8 h-8 text-destructive" />
              ) : (
                <Activity className="w-8 h-8 text-warning" />
              )}
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الحالة المباشرة' : 'Live Status'}
              </p>
              <p className="font-semibold capitalize">{status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'نظام التشغيل' : 'OS'}
              </p>
              <p className="font-semibold">{(resource.operating_system as string) || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'عنوان IP' : 'IP Address'}
              </p>
              <p className="font-semibold font-mono">{(resource.ip_address as string) || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'البيئة' : 'Environment'}
              </p>
              <p className="font-semibold capitalize">{(resource.environment as string) || '-'}</p>
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">
            {language === 'ar' ? 'مستوى المركز' : 'Tier Level'}
          </p>
          <Badge variant="outline" className="text-lg">
            {(resource.tier_level as string) || 'N/A'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">
            {language === 'ar' ? 'سعة الطاقة' : 'Power Capacity'}
          </p>
          <p className="text-2xl font-bold">{(resource.power_capacity_kw as number) || 0} kW</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">
            {language === 'ar' ? 'عدد الخزائن' : 'Rack Count'}
          </p>
          <p className="text-2xl font-bold">{(resource.rack_count as number) || 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">
            {language === 'ar' ? 'المساحة' : 'Floor Space'}
          </p>
          <p className="text-2xl font-bold">{(resource.floor_space_sqm as number) || 0} m²</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceDetail;
