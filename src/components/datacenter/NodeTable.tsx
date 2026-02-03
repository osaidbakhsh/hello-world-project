import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClusterNodes, useClusters, useCreateNode, useUpdateNode, useDeleteNode } from '@/hooks/useDatacenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Cpu, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { NodeStatus, NodeRole, ClusterNode } from '@/types/datacenter';

interface Props {
  domainId: string;
}

const defaultFormData = {
  name: '',
  cluster_id: '',
  node_role: 'hybrid' as NodeRole,
  vendor: '',
  model: '',
  serial_number: '',
  cpu_sockets: 2,
  cpu_cores: 32,
  ram_gb: 256,
  storage_total_tb: 10,
  mgmt_ip: '',
  status: 'active' as NodeStatus,
};

const NodeTable: React.FC<Props> = ({ domainId }) => {
  const { t, language } = useLanguage();
  const { data: nodes, isLoading } = useClusterNodes(domainId);
  const { data: clusters } = useClusters(domainId);
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const deleteNode = useDeleteNode();

  const [search, setSearch] = useState('');
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingNode, setEditingNode] = useState<ClusterNode | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<ClusterNode | null>(null);

  const [formData, setFormData] = useState(defaultFormData);

  const filteredNodes = nodes?.filter((node) => {
    const matchesSearch = node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      node.mgmt_ip?.toLowerCase().includes(search.toLowerCase());
    const matchesCluster = filterCluster === 'all' || node.cluster_id === filterCluster;
    const matchesStatus = filterStatus === 'all' || node.status === filterStatus;
    return matchesSearch && matchesCluster && matchesStatus;
  });

  const statusColors: Record<NodeStatus, string> = {
    active: 'bg-green-500/10 text-green-700 border-green-500/30',
    maintenance: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
    decommissioned: 'bg-red-500/10 text-red-700 border-red-500/30',
  };

  const openEditForm = (node: ClusterNode) => {
    setEditingNode(node);
    setFormData({
      name: node.name,
      cluster_id: node.cluster_id,
      node_role: node.node_role,
      vendor: node.vendor || '',
      model: node.model || '',
      serial_number: node.serial_number || '',
      cpu_sockets: node.cpu_sockets || 2,
      cpu_cores: node.cpu_cores || 32,
      ram_gb: node.ram_gb || 256,
      storage_total_tb: node.storage_total_tb || 10,
      mgmt_ip: node.mgmt_ip || '',
      status: node.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (editingNode) {
      await updateNode.mutateAsync({
        id: editingNode.id,
        ...formData,
      });
    } else {
      await createNode.mutateAsync({
        ...formData,
        domain_id: domainId,
      });
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (nodeToDelete) {
      await deleteNode.mutateAsync(nodeToDelete.id);
      setNodeToDelete(null);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingNode(null);
    setFormData(defaultFormData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          {t('datacenter.nodes')} ({filteredNodes?.length || 0})
        </CardTitle>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t('datacenter.addNode')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={filterCluster} onValueChange={setFilterCluster}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('datacenter.clusters')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {clusters?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('datacenter.active')}</SelectItem>
              <SelectItem value="maintenance">{t('datacenter.maintenance')}</SelectItem>
              <SelectItem value="decommissioned">{t('datacenter.decommissioned')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('datacenter.clusters')}</TableHead>
                <TableHead>{t('datacenter.nodeRole')}</TableHead>
                <TableHead>{t('datacenter.cpuCores')}</TableHead>
                <TableHead>{t('datacenter.ramGb')}</TableHead>
                <TableHead>{t('datacenter.storageTb')}</TableHead>
                <TableHead>{t('datacenter.mgmtIp')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[70px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('datacenter.noNodes')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredNodes?.map((node) => (
                  <TableRow key={node.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell>{node.clusters?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{node.node_role}</Badge>
                    </TableCell>
                    <TableCell>{node.cpu_cores || '-'}c / {node.cpu_sockets || '-'}s</TableCell>
                    <TableCell>{node.ram_gb || '-'} GB</TableCell>
                    <TableCell>{node.storage_total_tb || '-'} TB</TableCell>
                    <TableCell className="font-mono text-sm">{node.mgmt_ip || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[node.status]}>
                        {t(`datacenter.${node.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                          <DropdownMenuItem onClick={() => openEditForm(node)}>
                            <Pencil className="w-4 h-4 me-2" />
                            {t('datacenter.editNode')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setNodeToDelete(node)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 me-2" />
                            {t('datacenter.deleteNode')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit Node Dialog */}
<Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editingNode ? t('datacenter.editNode') : t('datacenter.addNode')}
            </DialogTitle>
            <DialogDescription>
              {editingNode 
                ? (language === 'ar' ? 'تعديل بيانات النود' : 'Edit node details')
                : (language === 'ar' ? 'إضافة نود جديد للكلستر' : 'Add a new node to the cluster')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t('common.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ESXi-01"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.clusters')} *</Label>
              <Select value={formData.cluster_id} onValueChange={(v) => setFormData({ ...formData, cluster_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('datacenter.selectCluster')} />
                </SelectTrigger>
                <SelectContent>
                  {clusters?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.vendor')}</Label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Dell / HPE"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.model')}</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="PowerEdge R740"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.cpuCores')}</Label>
              <Input
                type="number"
                value={formData.cpu_cores}
                onChange={(e) => setFormData({ ...formData, cpu_cores: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.ramGb')}</Label>
              <Input
                type="number"
                value={formData.ram_gb}
                onChange={(e) => setFormData({ ...formData, ram_gb: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.storageTb')}</Label>
              <Input
                type="number"
                value={formData.storage_total_tb}
                onChange={(e) => setFormData({ ...formData, storage_total_tb: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.mgmtIp')}</Label>
              <Input
                value={formData.mgmt_ip}
                onChange={(e) => setFormData({ ...formData, mgmt_ip: e.target.value })}
                placeholder="192.168.1.10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.serialNumber')}</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.nodeRole')}</Label>
              <Select value={formData.node_role} onValueChange={(v: NodeRole) => setFormData({ ...formData, node_role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compute">{t('datacenter.compute')}</SelectItem>
                  <SelectItem value="storage">{t('datacenter.storage')}</SelectItem>
                  <SelectItem value="hybrid">{t('datacenter.hybrid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingNode && (
              <div className="space-y-2">
                <Label>{t('common.status')}</Label>
                <Select value={formData.status} onValueChange={(v: NodeStatus) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('datacenter.active')}</SelectItem>
                    <SelectItem value="maintenance">{t('datacenter.maintenance')}</SelectItem>
                    <SelectItem value="decommissioned">{t('datacenter.decommissioned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || !formData.cluster_id || createNode.isPending || updateNode.isPending}
            >
              {(createNode.isPending || updateNode.isPending) 
                ? t('common.saving') 
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
<AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.deleteConfirmMessage')}
              <br />
              <strong>{nodeToDelete?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default NodeTable;
