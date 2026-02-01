import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVMs, useClusters, useCreateVM } from '@/hooks/useDatacenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Monitor } from 'lucide-react';
import type { VMStatus, VMEnvironment } from '@/types/datacenter';

interface Props {
  domainId: string;
}

const VMTable: React.FC<Props> = ({ domainId }) => {
  const { t, language } = useLanguage();
  const { data: vms, isLoading } = useVMs(domainId);
  const { data: clusters } = useClusters(domainId);
  const createVM = useCreateVM();

  const [search, setSearch] = useState('');
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
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
  });

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

  const handleSubmit = async () => {
    await createVM.mutateAsync({
      ...formData,
      domain_id: domainId,
      tags: [],
    });
    setShowForm(false);
    setFormData({
      name: '',
      cluster_id: '',
      ip_address: '',
      os: '',
      environment: 'production',
      status: 'running',
      vcpu: 4,
      ram_gb: 16,
      disk_total_gb: 100,
      owner_department: '',
      beneficiary: '',
    });
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVMs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('datacenter.noVMs')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVMs?.map((vm) => (
                  <TableRow key={vm.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{vm.name}</TableCell>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add VM Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('datacenter.addVM')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="DC01"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.clusters')}</Label>
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
                onChange={(e) => setFormData({ ...formData, vcpu: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('datacenter.ramGb')}</Label>
              <Input
                type="number"
                value={formData.ram_gb}
                onChange={(e) => setFormData({ ...formData, ram_gb: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Disk (GB)</Label>
              <Input
                type="number"
                value={formData.disk_total_gb}
                onChange={(e) => setFormData({ ...formData, disk_total_gb: parseInt(e.target.value) })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.cluster_id}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VMTable;
