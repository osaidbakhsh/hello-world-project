import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClusterNodes, useVMs, useDeleteCluster } from '@/hooks/useDatacenter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Server, Cpu, HardDrive, Database, Monitor, CheckCircle2, Pencil, Trash2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Cluster, DatacenterStats } from '@/types/datacenter';
import ClusterForm from './ClusterForm';

interface Props {
  domainId: string;
  stats: DatacenterStats;
  clusters: Cluster[];
}

const DatacenterOverview: React.FC<Props> = ({ domainId, stats, clusters }) => {
  const { t, language } = useLanguage();
  const { isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const deleteCluster = useDeleteCluster();

  // Fetch nodes and VMs for completeness calculation
  const { data: nodes } = useClusterNodes(domainId);
  const { data: vms } = useVMs(domainId);

  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<Cluster | null>(null);

  // Calculate completeness metrics
  const nodesWithSerial = nodes?.filter(n => n.serial_number).length || 0;
  const totalNodes = nodes?.length || 0;
  const nodesSerialPercent = totalNodes > 0 ? Math.round((nodesWithSerial / totalNodes) * 100) : 0;

  const vmsLinked = vms?.filter(v => v.server_ref_id).length || 0;
  const totalVMs = vms?.length || 0;
  const vmsLinkedPercent = totalVMs > 0 ? Math.round((vmsLinked / totalVMs) * 100) : 0;

  const overallCompleteness = totalNodes + totalVMs > 0 
    ? Math.round(((nodesWithSerial + vmsLinked) / (totalNodes + totalVMs)) * 100) 
    : 0;

  // Resource usage percentages
  const ramUsagePercent = stats.totalRamGb > 0 
    ? Math.round((stats.usedRamGb / stats.totalRamGb) * 100) 
    : 0;
  const storageUsagePercent = stats.totalStorageTb > 0 
    ? Math.round((stats.usedStorageTb / stats.totalStorageTb) * 100) 
    : 0;

  const clusterTypeLabels: Record<string, string> = {
    vmware: 'VMware',
    nutanix: 'Nutanix',
    hyperv: 'Hyper-V',
    other: language === 'ar' ? 'أخرى' : 'Other',
  };

  const getClusterStats = (clusterId: string) => {
    const clusterNodes = nodes?.filter(n => n.cluster_id === clusterId) || [];
    const clusterVMs = vms?.filter(v => v.cluster_id === clusterId) || [];
    return { nodesCount: clusterNodes.length, vmsCount: clusterVMs.length };
  };

  const attemptDelete = (cluster: Cluster) => {
    const clusterStats = getClusterStats(cluster.id);
    if (clusterStats.nodesCount > 0 || clusterStats.vmsCount > 0) {
      toast({
        title: t('datacenter.cannotDeleteCluster'),
        description: language === 'ar' 
          ? `هذا الكلستر مرتبط بـ ${clusterStats.nodesCount} نود و ${clusterStats.vmsCount} جهاز افتراضي`
          : `This cluster has ${clusterStats.nodesCount} nodes and ${clusterStats.vmsCount} VMs linked`,
        variant: 'destructive',
      });
      return;
    }
    setClusterToDelete(cluster);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clusterToDelete) return;
    await deleteCluster.mutateAsync(clusterToDelete.id);
    setDeleteDialogOpen(false);
    setClusterToDelete(null);
  };

  const canManageClusters = isAdmin || isSuperAdmin;

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
              {clusters.map((cluster) => {
                const clusterStats = getClusterStats(cluster.id);
                return (
                  <Card key={cluster.id} className="hover:shadow-md transition-shadow">
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
                          <span>{clusterStats.nodesCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('datacenter.vms')}</span>
                          <span>{clusterStats.vmsCount}</span>
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

                      {/* Admin Actions */}
                      {canManageClusters && (
                        <div className="flex gap-1 mt-3 pt-3 border-t">
                          <Button size="sm" variant="ghost" onClick={() => setEditingCluster(cluster)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => attemptDelete(cluster)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completeness Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {t('datacenter.completeness')}
              </CardTitle>
              <CardDescription>{t('datacenter.completenessDesc')}</CardDescription>
            </div>
            <div className="text-3xl font-bold text-primary">{overallCompleteness}%</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Nodes with Serial */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('datacenter.nodesWithSerial')}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'ar' ? 'النودات التي تم إدخال رقمها التسلسلي' : 'Nodes with serial number entered'}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{nodesWithSerial} / {totalNodes} ({nodesSerialPercent}%)</span>
              </div>
              <Progress value={nodesSerialPercent} className="h-2" />
            </div>

            {/* VMs Linked */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('datacenter.vmsLinked')}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'ar' ? 'الأجهزة الافتراضية المرتبطة بسيرفر مرجعي' : 'VMs linked to a reference server'}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{vmsLinked} / {totalVMs} ({vmsLinkedPercent}%)</span>
              </div>
              <Progress value={vmsLinkedPercent} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Cluster Dialog */}
      {editingCluster && (
        <ClusterForm
          domainId={domainId}
          editingCluster={editingCluster}
          onClose={() => setEditingCluster(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'حذف الكلستر' : 'Delete Cluster'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف "${clusterToDelete?.name}"؟`
                : `Are you sure you want to delete "${clusterToDelete?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DatacenterOverview;