import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClusters, useDatacenters, useUpdateCluster, useDeleteCluster, useClusterNodes, useVMs } from '@/hooks/useDatacenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Server, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Cluster, ClusterType, StorageType, RFLevel } from '@/types/datacenter';

interface Props {
  domainId: string;
}

const ClusterTable: React.FC<Props> = ({ domainId }) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: clusters, isLoading } = useClusters(domainId);
  const { data: datacenters } = useDatacenters(domainId);
  const { data: nodes } = useClusterNodes(domainId);
  const { data: vms } = useVMs(domainId);
  const updateCluster = useUpdateCluster();
  const deleteCluster = useDeleteCluster();

  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<Cluster | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    datacenter_id: '',
    cluster_type: 'vmware' as ClusterType,
    vendor: '',
    platform_version: '',
    hypervisor_version: '',
    storage_type: 'all-flash' as StorageType,
    rf_level: 'RF2' as RFLevel,
    notes: '',
  });

  const openEditDialog = (cluster: Cluster) => {
    setFormData({
      name: cluster.name,
      datacenter_id: cluster.datacenter_id || '',
      cluster_type: (cluster.cluster_type as ClusterType) || 'vmware',
      vendor: cluster.vendor || '',
      platform_version: cluster.platform_version || '',
      hypervisor_version: cluster.hypervisor_version || '',
      storage_type: (cluster.storage_type as StorageType) || 'all-flash',
      rf_level: (cluster.rf_level as RFLevel) || 'RF2',
      notes: cluster.notes || '',
    });
    setEditingCluster(cluster);
  };

  const handleUpdate = async () => {
    if (!editingCluster) return;
    await updateCluster.mutateAsync({
      id: editingCluster.id,
      ...formData,
      datacenter_id: formData.datacenter_id || null,
    });
    setEditingCluster(null);
  };

  const getClusterStats = (clusterId: string) => {
    const clusterNodes = nodes?.filter(n => n.cluster_id === clusterId) || [];
    const clusterVMs = vms?.filter(v => v.cluster_id === clusterId) || [];
    return { nodesCount: clusterNodes.length, vmsCount: clusterVMs.length };
  };

  const attemptDelete = (cluster: Cluster) => {
    const stats = getClusterStats(cluster.id);
    if (stats.nodesCount > 0 || stats.vmsCount > 0) {
      toast({
        title: t('datacenter.cannotDeleteCluster'),
        description: language === 'ar' 
          ? `هذا الكلستر مرتبط بـ ${stats.nodesCount} نود و ${stats.vmsCount} جهاز افتراضي`
          : `This cluster has ${stats.nodesCount} nodes and ${stats.vmsCount} VMs linked`,
        variant: 'destructive',
      });
      return;
    }
    setClusterToDelete(cluster);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clusterToDelete) return;
    await deleteCluster.mutateAsync(clusterToDelete.id);
    setDeleteDialogOpen(false);
    setClusterToDelete(null);
  };

  const clusterTypeLabels: Record<string, string> = {
    vmware: 'VMware',
    nutanix: 'Nutanix',
    hyperv: 'Hyper-V',
    other: language === 'ar' ? 'أخرى' : 'Other',
  };

  const clusterTypes: { value: ClusterType; label: string }[] = [
    { value: 'vmware', label: 'VMware vSphere' },
    { value: 'nutanix', label: 'Nutanix AHV' },
    { value: 'hyperv', label: 'Microsoft Hyper-V' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
  ];

  const storageTypes: { value: StorageType; label: string }[] = [
    { value: 'all-flash', label: 'All-Flash' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'hdd', label: 'HDD' },
  ];

  const rfLevels: { value: RFLevel; label: string }[] = [
    { value: 'RF1', label: 'RF1 (1 copy)' },
    { value: 'RF2', label: 'RF2 (2 copies)' },
    { value: 'RF3', label: 'RF3 (3 copies)' },
    { value: 'N/A', label: language === 'ar' ? 'غير متاح' : 'N/A' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            {t('datacenter.clusters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!clusters?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('datacenter.noClusters')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('datacenter.clusterType')}</TableHead>
                  <TableHead>{t('datacenter.datacenter')}</TableHead>
                  <TableHead>{t('datacenter.platformVersion')}</TableHead>
                  <TableHead>{t('datacenter.nodes')}</TableHead>
                  <TableHead>{t('datacenter.vms')}</TableHead>
                  <TableHead>{t('datacenter.rfLevel')}</TableHead>
                  <TableHead>{t('datacenter.storageType')}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map(cluster => {
                  const stats = getClusterStats(cluster.id);
                  return (
                    <TableRow key={cluster.id}>
                      <TableCell className="font-medium">{cluster.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{clusterTypeLabels[cluster.cluster_type || 'other']}</Badge>
                      </TableCell>
                      <TableCell>{cluster.datacenters?.name || '-'}</TableCell>
                      <TableCell>{cluster.platform_version || '-'}</TableCell>
                      <TableCell>{stats.nodesCount}</TableCell>
                      <TableCell>{stats.vmsCount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cluster.rf_level || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cluster.storage_type || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(cluster)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => attemptDelete(cluster)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCluster} onOpenChange={() => setEditingCluster(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل الكلستر' : 'Edit Cluster'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t('common.name')} *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('datacenter.clusterType')}</Label>
              <Select
                value={formData.cluster_type}
                onValueChange={(v: ClusterType) => setFormData({ ...formData, cluster_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clusterTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {datacenters && datacenters.length > 0 && (
              <div className="space-y-2">
                <Label>{t('datacenter.datacenter')}</Label>
                <Select
                  value={formData.datacenter_id || 'none'}
                  onValueChange={v => setFormData({ ...formData, datacenter_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {datacenters.map(dc => (
                      <SelectItem key={dc.id} value={dc.id}>
                        {dc.name} {dc.location && `(${dc.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('datacenter.vendor')}</Label>
              <Input
                value={formData.vendor}
                onChange={e => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('datacenter.platformVersion')}</Label>
              <Input
                value={formData.platform_version}
                onChange={e => setFormData({ ...formData, platform_version: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('datacenter.hypervisorVersion')}</Label>
              <Input
                value={formData.hypervisor_version}
                onChange={e => setFormData({ ...formData, hypervisor_version: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('datacenter.storageType')}</Label>
              <Select
                value={formData.storage_type}
                onValueChange={(v: StorageType) => setFormData({ ...formData, storage_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {storageTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('datacenter.rfLevel')}</Label>
              <Select
                value={formData.rf_level}
                onValueChange={(v: RFLevel) => setFormData({ ...formData, rf_level: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rfLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCluster(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name || updateCluster.isPending}>
              {updateCluster.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClusterTable;