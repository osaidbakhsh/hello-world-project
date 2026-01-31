import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useNetworks, useEmployees } from '@/hooks/useLocalStorage';
import { Server, ServerEnvironment, ServerStatus, DiskInfo, ServerUser } from '@/types';
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
import { Plus, Search, Upload, Download, Edit, Trash2, HardDrive, Users, Server as ServerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const Servers: React.FC = () => {
  const { t, dir } = useLanguage();
  const [servers, setServers] = useServers();
  const [networks] = useNetworks();
  const [employees] = useEmployees();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Server>>({
    name: '',
    ipAddress: '',
    os: 'Windows Server',
    osVersion: '2022',
    environment: 'production',
    owner: '',
    responsible: '',
    description: '',
    disks: [{ drive: 'C:', totalGB: 100, usedGB: 50, freeGB: 50 }],
    users: [],
    networkId: '',
    status: 'active',
  });

  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.ipAddress.includes(searchQuery) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = envFilter === 'all' || server.environment === envFilter;
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
    return matchesSearch && matchesEnv && matchesStatus;
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.ipAddress) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    
    if (editingServer) {
      setServers(servers.map((s) =>
        s.id === editingServer.id
          ? { ...s, ...formData, lastUpdate: now } as Server
          : s
      ));
      toast({ title: t('common.success'), description: 'Server updated' });
    } else {
      const newServer: Server = {
        id: crypto.randomUUID(),
        name: formData.name || '',
        ipAddress: formData.ipAddress || '',
        os: formData.os || 'Windows Server',
        osVersion: formData.osVersion || '2022',
        environment: formData.environment as ServerEnvironment || 'production',
        owner: formData.owner || '',
        responsible: formData.responsible || '',
        description: formData.description || '',
        disks: formData.disks || [],
        users: formData.users || [],
        networkId: formData.networkId || '',
        status: formData.status as ServerStatus || 'active',
        lastUpdate: now,
        createdAt: now,
      };
      setServers([...servers, newServer]);
      toast({ title: t('common.success'), description: 'Server added' });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setFormData(server);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setServers(servers.filter((s) => s.id !== id));
    toast({ title: t('common.success'), description: 'Server deleted' });
  };

  const resetForm = () => {
    setEditingServer(null);
    setFormData({
      name: '',
      ipAddress: '',
      os: 'Windows Server',
      osVersion: '2022',
      environment: 'production',
      owner: '',
      responsible: '',
      description: '',
      disks: [{ drive: 'C:', totalGB: 100, usedGB: 50, freeGB: 50 }],
      users: [],
      networkId: '',
      status: 'active',
    });
  };

  const handleExport = () => {
    const exportData = servers.map((s) => ({
      Name: s.name,
      IP: s.ipAddress,
      OS: s.os,
      Version: s.osVersion,
      Environment: s.environment,
      Owner: s.owner,
      Responsible: s.responsible,
      Description: s.description,
      Status: s.status,
      Network: networks.find((n) => n.id === s.networkId)?.name || '',
      'Total Disk (GB)': s.disks.reduce((acc, d) => acc + d.totalGB, 0),
      'Used Disk (GB)': s.disks.reduce((acc, d) => acc + d.usedGB, 0),
      'Last Update': s.lastUpdate,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servers');
    XLSX.writeFile(wb, 'servers-export.xlsx');
    toast({ title: t('common.success'), description: 'Exported successfully' });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const now = new Date().toISOString();
        const importedServers: Server[] = jsonData.map((row: any) => ({
          id: crypto.randomUUID(),
          name: row.Name || row.name || '',
          ipAddress: row.IP || row.ipAddress || row['IP Address'] || '',
          os: row.OS || row.os || 'Windows Server',
          osVersion: row.Version || row.osVersion || '2022',
          environment: (row.Environment || row.environment || 'production').toLowerCase() as ServerEnvironment,
          owner: row.Owner || row.owner || '',
          responsible: row.Responsible || row.responsible || '',
          description: row.Description || row.description || '',
          disks: [],
          users: [],
          networkId: '',
          status: (row.Status || row.status || 'active').toLowerCase() as ServerStatus,
          lastUpdate: now,
          createdAt: now,
        }));

        setServers([...servers, ...importedServers]);
        toast({
          title: t('common.success'),
          description: `Imported ${importedServers.length} servers`,
        });
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

  const getEnvBadgeClass = (env: ServerEnvironment) => {
    return {
      production: 'badge-production',
      testing: 'badge-testing',
      development: 'badge-development',
      staging: 'badge-staging',
    }[env];
  };

  const getStatusColor = (status: ServerStatus) => {
    return {
      active: 'bg-success',
      inactive: 'bg-destructive',
      maintenance: 'bg-warning',
    }[status];
  };

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
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.os')}</Label>
                  <Select
                    value={formData.os}
                    onValueChange={(value) => setFormData({ ...formData, os: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows Server">Windows Server</SelectItem>
                      <SelectItem value="Ubuntu Server">Ubuntu Server</SelectItem>
                      <SelectItem value="CentOS">CentOS</SelectItem>
                      <SelectItem value="Red Hat">Red Hat Enterprise</SelectItem>
                      <SelectItem value="Debian">Debian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.osVersion')}</Label>
                  <Select
                    value={formData.osVersion}
                    onValueChange={(value) => setFormData({ ...formData, osVersion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2019">2019</SelectItem>
                      <SelectItem value="2016">2016</SelectItem>
                      <SelectItem value="2012 R2">2012 R2</SelectItem>
                      <SelectItem value="22.04 LTS">22.04 LTS</SelectItem>
                      <SelectItem value="20.04 LTS">20.04 LTS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.environment')}</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(value) => setFormData({ ...formData, environment: value as ServerEnvironment })}
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
                    onValueChange={(value) => setFormData({ ...formData, status: value as ServerStatus })}
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
                  <Select
                    value={formData.owner}
                    onValueChange={(value) => setFormData({ ...formData, owner: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.responsible')}</Label>
                  <Select
                    value={formData.responsible}
                    onValueChange={(value) => setFormData({ ...formData, responsible: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select responsible" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.network')}</Label>
                  <Select
                    value={formData.networkId}
                    onValueChange={(value) => setFormData({ ...formData, networkId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((net) => (
                        <SelectItem key={net.id} value={net.id}>{net.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('servers.description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Server description..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit}>
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
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} - {t('servers.status')}</SelectItem>
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
                  <TableHead>{t('servers.status')}</TableHead>
                  <TableHead>{t('servers.diskSpace')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServers.length > 0 ? (
                  filteredServers.map((server) => {
                    const totalDisk = server.disks.reduce((acc, d) => acc + d.totalGB, 0);
                    const usedDisk = server.disks.reduce((acc, d) => acc + d.usedGB, 0);
                    const diskPercent = totalDisk > 0 ? Math.round((usedDisk / totalDisk) * 100) : 0;

                    return (
                      <TableRow key={server.id} className="stagger-item">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <ServerIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{server.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {networks.find((n) => n.id === server.networkId)?.name || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{server.ipAddress}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{server.os}</p>
                            <p className="text-xs text-muted-foreground">{server.osVersion}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getEnvBadgeClass(server.environment)}>
                            {t(`env.${server.environment}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', getStatusColor(server.status))} />
                            <span className="text-sm capitalize">{server.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <HardDrive className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{usedDisk}/{totalDisk} GB</span>
                            </div>
                            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  diskPercent > 90 ? 'bg-destructive' : diskPercent > 70 ? 'bg-warning' : 'bg-success'
                                )}
                                style={{ width: `${diskPercent}%` }}
                              />
                            </div>
                          </div>
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
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <ServerIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-muted-foreground">{t('common.noData')}</p>
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
