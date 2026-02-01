import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Server, Cpu, HardDrive, Database, Monitor, CheckCircle2 } from 'lucide-react';
import type { Cluster, DatacenterStats } from '@/types/datacenter';

interface Props {
  domainId: string;
  stats: DatacenterStats;
  clusters: Cluster[];
}

const DatacenterOverview: React.FC<Props> = ({ domainId, stats, clusters }) => {
  const { t, language } = useLanguage();

  const ramUsagePercent = stats.totalRamGb > 0 
    ? Math.round((stats.usedRamGb / stats.totalRamGb) * 100) 
    : 0;
  const storageUsagePercent = stats.totalStorageTb > 0 
    ? Math.round((stats.usedStorageTb / stats.totalStorageTb) * 100) 
    : 0;
  const cpuUsagePercent = stats.totalCpuCores > 0 
    ? Math.round((stats.usedCpuCores / stats.totalCpuCores) * 100) 
    : 0;

  const clusterTypeLabels: Record<string, string> = {
    vmware: 'VMware',
    nutanix: 'Nutanix',
    hyperv: 'Hyper-V',
    other: language === 'ar' ? 'أخرى' : 'Other',
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('datacenter.clusters')}</p>
                <p className="text-2xl font-bold">{stats.clustersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Cpu className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('datacenter.nodes')}</p>
                <p className="text-2xl font-bold">{stats.nodesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Monitor className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('datacenter.vms')}</p>
                <p className="text-2xl font-bold">{stats.vmsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('datacenter.ramGb')}</p>
                <p className="text-lg font-bold">{stats.usedRamGb}/{stats.totalRamGb} GB</p>
                <Progress value={ramUsagePercent} className="h-1 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <HardDrive className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('datacenter.storageTb')}</p>
                <p className="text-lg font-bold">{stats.usedStorageTb.toFixed(1)}/{stats.totalStorageTb.toFixed(1)} TB</p>
                <Progress value={storageUsagePercent} className="h-1 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clusters Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            {t('datacenter.clusters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('datacenter.noClusters')}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.map((cluster) => (
                <Card key={cluster.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{cluster.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cluster.vendor || clusterTypeLabels[cluster.cluster_type || 'other']}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {clusterTypeLabels[cluster.cluster_type || 'other']}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('datacenter.platformVersion')}</span>
                        <span>{cluster.platform_version || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('datacenter.hypervisorVersion')}</span>
                        <span>{cluster.hypervisor_version || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('datacenter.nodes')}</span>
                        <span>{cluster.node_count}</span>
                      </div>
                      {cluster.rf_level && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('datacenter.rfLevel')}</span>
                          <Badge variant="secondary">{cluster.rf_level}</Badge>
                        </div>
                      )}
                      {cluster.storage_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('datacenter.storageType')}</span>
                          <Badge variant="outline">{cluster.storage_type}</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completeness Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {t('datacenter.completeness')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>{t('datacenter.nodesWithSerial')}</span>
              <Badge variant="outline">-</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('datacenter.vmsLinked')}</span>
              <Badge variant="outline">-</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatacenterOverview;
