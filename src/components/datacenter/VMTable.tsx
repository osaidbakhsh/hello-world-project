import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVMs, useClusters, useCreateVM, useUpdateVM, useDeleteVM } from '@/hooks/useDatacenter';
import { useServers, useServerMutations } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Monitor, MoreHorizontal, Pencil, Trash2, Link } from 'lucide-react';
import type { VMStatus, VMEnvironment, VM } from '@/types/datacenter';

interface Props {
  domainId: string;
}

const defaultFormData = {
  name: '',
  cluster_id: '',
  ip_address: '',
  os: '',
  environment: 'production' as VMEnvironment,
  status: 'running' as VMStatus,
  vcpu: 4,
  ram_gb: 16,
  disk_total_gb: 100,
  owner_department: '',
  beneficiary: '',
  server_ref_id: '',
  createAsServer: false,
};

const VMTable: React.FC<Props> = ({ domainId }) => {
  const { t, language } = useLanguage();
  const { data: vms, isLoading } = useVMs(domainId);
  const { data: clusters } = useClusters(domainId);
  const { data: servers } = useServers();
  const createVM = useCreateVM();
  const updateVM = useUpdateVM();
  const deleteVM = useDeleteVM();
  const { createServer } = useServerMutations();

  const [search, setSearch] = useState('');
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVM, setEditingVM] = useState<VM | null>(null);
  const [vmToDelete, setVmToDelete] = useState<VM | null>(null);

  const [formData, setFormData] = useState(defaultFormData);

  // Filter servers - get all servers since servers don't have direct domain_id
  const domainServers = servers || [];

  const filteredVMs = vms?.filter((vm) => {
    const matchesSearch = vm.name.toLowerCase().includes(search.toLowerCase()) ||
      vm.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
      vm.os?.toLowerCase().includes(search.toLowerCase());
    const matchesCluster = filterCluster === 'all' || vm.cluster_id === filterCluster;
    const matchesEnv = filterEnv === 'all' || vm.environment === filterEnv;
    const matchesStatus = filterStatus === 'all' || vm.status === filterStatus;
    return matchesSearch && matchesCluster && matchesEnv && matchesStatus;
  });

  const statusColors: Record<VMStatus, string> = {
    running: 'bg-green-500/10 text-green-700 border-green-500/30',
    stopped: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
    suspended: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
    template: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  };

  const envLabels: Record<VMEnvironment, string> = {
    production: language === 'ar' ? 'إنتاج' : 'Production',
    development: language === 'ar' ? 'تطوير' : 'Development',
    testing: language === 'ar' ? 'اختبار' : 'Testing',
    staging: language === 'ar' ? 'مرحلي' : 'Staging',
    dr: language === 'ar' ? 'DR' : 'DR',
  };

  const openEditForm = (vm: VM) => {
    setEditingVM(vm);
    setFormData({
      name: vm.name,
      cluster_id: vm.cluster_id,
      ip_address: vm.ip_address || '',
      os: vm.os || '',
      environment: vm.environment,
      status: vm.status,
      vcpu: vm.vcpu || 4,
      ram_gb: vm.ram_gb || 16,
      disk_total_gb: vm.disk_total_gb || 100,
      owner_department: vm.owner_department || '',
      beneficiary: vm.beneficiary || '',
      server_ref_id: vm.server_ref_id || '',
      createAsServer: false,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    let serverRefId = formData.server_ref_id || null;

    // If createAsServer is checked, create a server first
    if (!editingVM && formData.createAsServer) {
      try {
        const result = await createServer({
          name: formData.name,
          ip_address: formData.ip_address || null,
          operating_system: formData.os || 'Unknown',
          environment: formData.environment,
          status: formData.status === 'running' ? 'active' : 'inactive',
          source: 'import',
          notes: language === 'ar' 
            ? 'تم الإنشاء تلقائياً من VM في مركز البيانات'
            : 'Auto-created from VM in Datacenter module',
        });
        if (result.data) {
          serverRefId = result.data.id || null;
        }
      } catch (error) {
        console.error('Failed to create server:', error);
      }
    }

    if (editingVM) {
      await updateVM.mutateAsync({
        id: editingVM.id,
        name: formData.name,
        cluster_id: formData.cluster_id,
        ip_address: formData.ip_address || null,
        os: formData.os || null,
        environment: formData.environment,
        status: formData.status,
        vcpu: formData.vcpu,
        ram_gb: formData.ram_gb,
        disk_total_gb: formData.disk_total_gb,
        owner_department: formData.owner_department || null,
        beneficiary: formData.beneficiary || null,
        server_ref_id: formData.server_ref_id || null,
      });
    } else {
      await createVM.mutateAsync({
        name: formData.name,
        cluster_id: formData.cluster_id,
        domain_id: domainId,
        ip_address: formData.ip_address || null,
        os: formData.os || null,
        environment: formData.environment,
        status: formData.status,
        vcpu: formData.vcpu,
        ram_gb: formData.ram_gb,
        disk_total_gb: formData.disk_total_gb,
        owner_department: formData.owner_department || null,
        beneficiary: formData.beneficiary || null,
        server_ref_id: serverRefId,
        tags: [],
      });
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (vmToDelete) {
      await deleteVM.mutateAsync(vmToDelete.id);
      setVmToDelete(null);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingVM(null);
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
          <Monitor className="w-5 h-5" />
          {t('datacenter.vms')} ({filteredVMs?.length || 0})
        </CardTitle>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t('datacenter.addVM')}
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
          <Select value={filterEnv} onValueChange={setFilterEnv}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('datacenter.environment')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="production">{t('datacenter.production')}</SelectItem>
              <SelectItem value="development">{t('datacenter.development')}</SelectItem>
              <SelectItem value="testing">{t('datacenter.testing')}</SelectItem>
              <SelectItem value="dr">{t('datacenter.dr')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="running">{t('datacenter.running')}</SelectItem>
              <SelectItem value="stopped">{t('datacenter.stopped')}</SelectItem>
              <SelectItem value="suspended">{t('datacenter.suspended')}</SelectItem>
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
                <TableHead>{t('datacenter.vcpu')}</TableHead>
                <TableHead>{t('datacenter.ramGb')}</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>{t('datacenter.environment')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[70px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVMs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('datacenter.noVMs')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVMs?.map((vm) => (
                  <TableRow key={vm.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {vm.name}
                        {vm.server_ref_id && (
                          <Link className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vm.clusters?.name || '-'}</TableCell>
                    <TableCell>{vm.vcpu || '-'}</TableCell>
                    <TableCell>{vm.ram_gb || '-'} GB</TableCell>
                    <TableCell>{vm.disk_total_gb || '-'} GB</TableCell>
                    <TableCell className="font-mono text-sm">{vm.ip_address || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{envLabels[vm.environment]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[vm.status]}>
                        {t(`datacenter.${vm.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditForm(vm)}>
                            <Pencil className="w-4 h-4 me-2" />
                            {t('datacenter.editVM')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setVmToDelete(vm)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 me-2" />
                            {t('datacenter.deleteVM')}
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

      {/* Add/Edit VM Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVM ? t('datacenter.editVM') : t('datacenter.addVM')}
            </DialogTitle>
            <DialogDescription>
              {editingVM 
                ? (language === 'ar' ? 'تعديل بيانات الجهاز الافتراضي' : 'Edit virtual machine details')
                : (language === 'ar' ? 'إضافة جهاز افتراضي جديد' : 'Add a new virtual machine')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t('common.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="DC01"
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
              <Label>IP</Label>
              <Input
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label>OS</Label>
              <Input
                value={formData.os}
                onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                placeholder="Windows Server 2022"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.vcpu')}</Label>
              <Input
                type="number"
                value={formData.vcpu}
                onChange={(e) => setFormData({ ...formData, vcpu: parseInt(e.target.value) || 0 })}
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
              <Label>Disk (GB)</Label>
              <Input
                type="number"
                value={formData.disk_total_gb}
                onChange={(e) => setFormData({ ...formData, disk_total_gb: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.environment')}</Label>
              <Select value={formData.environment} onValueChange={(v: VMEnvironment) => setFormData({ ...formData, environment: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">{t('datacenter.production')}</SelectItem>
                  <SelectItem value="development">{t('datacenter.development')}</SelectItem>
                  <SelectItem value="testing">{t('datacenter.testing')}</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="dr">{t('datacenter.dr')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.ownerDepartment')}</Label>
              <Input
                value={formData.owner_department}
                onChange={(e) => setFormData({ ...formData, owner_department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.beneficiary')}</Label>
              <Input
                value={formData.beneficiary}
                onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
              />
            </div>

            {/* Server Linking */}
            <div className="space-y-2">
              <Label>{t('datacenter.linkToServer')}</Label>
              <Select 
                value={formData.server_ref_id || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, server_ref_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {domainServers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingVM && (
              <div className="space-y-2">
                <Label>{t('common.status')}</Label>
                <Select value={formData.status} onValueChange={(v: VMStatus) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">{t('datacenter.running')}</SelectItem>
                    <SelectItem value="stopped">{t('datacenter.stopped')}</SelectItem>
                    <SelectItem value="suspended">{t('datacenter.suspended')}</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Create as Server Checkbox - only for new VMs */}
            {!editingVM && !formData.server_ref_id && (
              <div className="col-span-2 flex items-center space-x-2 rtl:space-x-reverse p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="createAsServer"
                  checked={formData.createAsServer}
                  onCheckedChange={(checked) => setFormData({ ...formData, createAsServer: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="createAsServer"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t('datacenter.createAsServer')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('datacenter.createAsServerHint')}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || !formData.cluster_id || createVM.isPending || updateVM.isPending}
            >
              {(createVM.isPending || updateVM.isPending) 
                ? t('common.saving') 
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!vmToDelete} onOpenChange={(open) => !open && setVmToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.deleteConfirmMessage')}
              <br />
              <strong>{vmToDelete?.name}</strong>
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

export default VMTable;
