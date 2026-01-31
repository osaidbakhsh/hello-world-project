import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useNetworks, useDomains, useServerMutations, useProfiles } from '@/hooks/useSupabaseData';
import type { Server } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Upload, Download, Edit, Trash2, HardDrive, Server as ServerIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ServerFormData {
  name: string;
  ip_address: string;
  operating_system: string;
  environment: string;
  owner: string;
  responsible_user: string;
  notes: string;
  network_id: string;
  status: string;
  cpu: string;
  ram: string;
  disk_space: string;
}

const initialFormData: ServerFormData = {
  name: '',
  ip_address: '',
  operating_system: 'Windows Server 2022',
  environment: 'production',
  owner: '',
  responsible_user: '',
  notes: '',
  network_id: '',
  status: 'active',
  cpu: '',
  ram: '',
  disk_space: '',
};

const Servers: React.FC = () => {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  
  // Supabase data
  const { data: domains } = useDomains();
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const { data: allNetworks, isLoading: networksLoading } = useNetworks();
  const { data: profiles } = useProfiles();
  const { createServer, updateServer, deleteServer } = useServerMutations();
  
  // Filter networks based on selected domain
  const networks = useMemo(() => {
    if (selectedDomainId === 'all') return allNetworks;
    return allNetworks.filter(n => n.domain_id === selectedDomainId);
  }, [allNetworks, selectedDomainId]);

  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('all');
  const { data: servers, isLoading: serversLoading, refetch: refetchServers } = useServers(
    selectedNetworkId !== 'all' ? selectedNetworkId : undefined
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ServerFormData>(initialFormData);

  // Filter servers based on domain if network is 'all'
  const filteredServers = useMemo(() => {
    let filtered = servers;
    
    // If domain selected but network is 'all', filter by domain's networks
    if (selectedDomainId !== 'all' && selectedNetworkId === 'all') {
      const domainNetworkIds = networks.map(n => n.id);
      filtered = servers.filter(s => s.network_id && domainNetworkIds.includes(s.network_id));
    }
    
    return filtered.filter((server) => {
      const matchesSearch =
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (server.ip_address || '').includes(searchQuery) ||
        (server.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEnv = envFilter === 'all' || server.environment === envFilter;
      const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
      return matchesSearch && matchesEnv && matchesStatus;
    });
  }, [servers, networks, selectedDomainId, selectedNetworkId, searchQuery, envFilter, statusFilter]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.ip_address) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingServer) {
        const { error } = await updateServer(editingServer.id, {
          name: formData.name,
          ip_address: formData.ip_address,
          operating_system: formData.operating_system,
          environment: formData.environment,
          owner: formData.owner,
          responsible_user: formData.responsible_user,
          notes: formData.notes,
          network_id: formData.network_id || null,
          status: formData.status,
          cpu: formData.cpu,
          ram: formData.ram,
          disk_space: formData.disk_space,
        });
        if (error) throw error;
        toast({ title: t('common.success'), description: 'Server updated' });
      } else {
        const { error } = await createServer({
          name: formData.name,
          ip_address: formData.ip_address,
          operating_system: formData.operating_system,
          environment: formData.environment,
          owner: formData.owner,
          responsible_user: formData.responsible_user,
          notes: formData.notes,
          network_id: formData.network_id || null,
          status: formData.status,
          cpu: formData.cpu,
          ram: formData.ram,
          disk_space: formData.disk_space,
        });
        if (error) throw error;
        toast({ title: t('common.success'), description: 'Server added' });
      }

      resetForm();
      setIsDialogOpen(false);
      refetchServers();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to save server',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      ip_address: server.ip_address || '',
      operating_system: server.operating_system || 'Windows Server 2022',
      environment: server.environment,
      owner: server.owner || '',
      responsible_user: server.responsible_user || '',
      notes: server.notes || '',
      network_id: server.network_id || '',
      status: server.status,
      cpu: server.cpu || '',
      ram: server.ram || '',
      disk_space: server.disk_space || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteServer(id);
    if (error) {
      toast({ title: t('common.error'), description: 'Failed to delete server', variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: 'Server deleted' });
      refetchServers();
    }
  };

  const resetForm = () => {
    setEditingServer(null);
    setFormData(initialFormData);
  };

  const handleExport = () => {
    const exportData = filteredServers.map((s) => ({
      Name: s.name,
      IP: s.ip_address,
      OS: s.operating_system,
      Environment: s.environment,
      Owner: s.owner,
      Responsible: s.responsible_user,
      Notes: s.notes,
      Status: s.status,
      Network: allNetworks.find((n) => n.id === s.network_id)?.name || '',
      CPU: s.cpu,
      RAM: s.ram,
      'Disk Space': s.disk_space,
      'Created At': s.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servers');
    XLSX.writeFile(wb, 'servers-export.xlsx');
    toast({ title: t('common.success'), description: 'Exported successfully' });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let imported = 0;
        for (const row of jsonData as any[]) {
          const { error } = await createServer({
            name: row.Name || row.name || '',
            ip_address: row.IP || row.ipAddress || row['IP Address'] || '',
            operating_system: row.OS || row.os || 'Windows Server',
            environment: (row.Environment || row.environment || 'production').toLowerCase(),
            owner: row.Owner || row.owner || '',
            responsible_user: row.Responsible || row.responsible || '',
            notes: row.Notes || row.notes || '',
            network_id: null,
            status: (row.Status || row.status || 'active').toLowerCase(),
            cpu: row.CPU || '',
            ram: row.RAM || '',
            disk_space: row['Disk Space'] || '',
          });
          if (!error) imported++;
        }

        toast({
          title: t('common.success'),
          description: `Imported ${imported} servers`,
        });
        refetchServers();
      } catch (error) {
        toast({
          title: t('common.error'),
          description: 'Failed to import file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const getEnvBadgeClass = (env: string) => {
    return {
      production: 'badge-production',
      testing: 'badge-testing',
      development: 'badge-development',
      staging: 'badge-staging',
    }[env] || 'badge-development';
  };

  const getStatusColor = (status: string) => {
    return {
      active: 'bg-success',
      inactive: 'bg-destructive',
      maintenance: 'bg-warning',
    }[status] || 'bg-muted';
  };

  const isLoading = serversLoading || networksLoading;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('servers.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            id="import-excel"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <Button variant="outline" onClick={() => document.getElementById('import-excel')?.click()}>
            <Upload className="w-4 h-4 me-2" />
            {t('servers.import')}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 me-2" />
            {t('servers.export')}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                {t('servers.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingServer ? t('common.edit') : t('servers.add')}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>{t('servers.name')} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Server-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.ip')} *</Label>
                  <Input
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.os')}</Label>
                  <Select
                    value={formData.operating_system}
                    onValueChange={(value) => setFormData({ ...formData, operating_system: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows Server 2022">Windows Server 2022</SelectItem>
                      <SelectItem value="Windows Server 2019">Windows Server 2019</SelectItem>
                      <SelectItem value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</SelectItem>
                      <SelectItem value="Ubuntu 20.04 LTS">Ubuntu 20.04 LTS</SelectItem>
                      <SelectItem value="CentOS">CentOS</SelectItem>
                      <SelectItem value="Red Hat Enterprise">Red Hat Enterprise</SelectItem>
                      <SelectItem value="Debian">Debian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.environment')}</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(value) => setFormData({ ...formData, environment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">{t('env.production')}</SelectItem>
                      <SelectItem value="testing">{t('env.testing')}</SelectItem>
                      <SelectItem value="development">{t('env.development')}</SelectItem>
                      <SelectItem value="staging">{t('env.staging')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('common.active')}</SelectItem>
                      <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.owner')}</Label>
                  <Input
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    placeholder="IT Department"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.responsible')}</Label>
                  <Input
                    value={formData.responsible_user}
                    onChange={(e) => setFormData({ ...formData, responsible_user: e.target.value })}
                    placeholder="Admin Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.network')}</Label>
                  <Select
                    value={formData.network_id}
                    onValueChange={(value) => setFormData({ ...formData, network_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {allNetworks.map((net) => (
                        <SelectItem key={net.id} value={net.id}>{net.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CPU</Label>
                  <Input
                    value={formData.cpu}
                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                    placeholder="4 vCPU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RAM</Label>
                  <Input
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    placeholder="16 GB"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disk Space</Label>
                  <Input
                    value={formData.disk_space}
                    onChange={(e) => setFormData({ ...formData, disk_space: e.target.value })}
                    placeholder="500 GB"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('servers.description')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Server description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t('common.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Domain Filter */}
            <Select value={selectedDomainId} onValueChange={(v) => {
              setSelectedDomainId(v);
              setSelectedNetworkId('all');
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Network Filter */}
            <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Networks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {networks.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search')}
                className="ps-10"
              />
            </div>
            <Select value={envFilter} onValueChange={setEnvFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} - {t('servers.environment')}</SelectItem>
                <SelectItem value="production">{t('env.production')}</SelectItem>
                <SelectItem value="testing">{t('env.testing')}</SelectItem>
                <SelectItem value="development">{t('env.development')}</SelectItem>
                <SelectItem value="staging">{t('env.staging')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} - Status</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Servers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('servers.name')}</TableHead>
                  <TableHead>{t('servers.ip')}</TableHead>
                  <TableHead>{t('servers.os')}</TableHead>
                  <TableHead>{t('servers.environment')}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{t('servers.network')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredServers.length > 0 ? (
                  filteredServers.map((server) => (
                    <TableRow key={server.id} className="stagger-item">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ServerIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{server.name}</p>
                            <p className="text-xs text-muted-foreground">{server.owner}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{server.ip_address}</TableCell>
                      <TableCell>{server.operating_system}</TableCell>
                      <TableCell>
                        <Badge className={getEnvBadgeClass(server.environment)}>
                          {t(`env.${server.environment}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', getStatusColor(server.status))} />
                          <span className="capitalize">{server.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {allNetworks.find((n) => n.id === server.network_id)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(server)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(server.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <HardDrive className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No servers found</p>
                        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                          <Plus className="w-4 h-4 me-2" />
                          Add your first server
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Servers;