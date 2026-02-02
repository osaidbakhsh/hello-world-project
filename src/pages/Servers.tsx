import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Search, Upload, Download, Edit, Trash2, HardDrive, Server as ServerIcon, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTableHeader, serverSortOptions, applySortToData } from '@/components/DataTableHeader';
import { useSmartImport } from '@/hooks/useSmartImport';

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
  // New fields - Beneficiary
  beneficiary_department: string;
  primary_application: string;
  business_owner: string;
  // New fields - Veeam Backup
  is_backed_up_by_veeam: boolean;
  backup_frequency: string;
  backup_job_name: string;
  // New fields - Asset Lifecycle (EPIC D)
  purchase_date: string;
  vendor: string;
  model: string;
  serial_number: string;
  warranty_end: string;
  contract_id: string;
  support_level: string;
  eol_date: string;
  eos_date: string;
  server_role: string[];
  rpo_hours: string;
  rto_hours: string;
  last_restore_test: string;
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
  // New fields - Beneficiary
  beneficiary_department: '',
  primary_application: '',
  business_owner: '',
  // New fields - Veeam Backup
  is_backed_up_by_veeam: false,
  backup_frequency: 'none',
  backup_job_name: '',
  // New fields - Asset Lifecycle (EPIC D)
  purchase_date: '',
  vendor: '',
  model: '',
  serial_number: '',
  warranty_end: '',
  contract_id: '',
  support_level: 'standard',
  eol_date: '',
  eos_date: '',
  server_role: [],
  rpo_hours: '',
  rto_hours: '',
  last_restore_test: '',
};

const Servers: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Supabase data
  const { data: domains } = useDomains();
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const { data: allNetworks, isLoading: networksLoading } = useNetworks();
  const { data: profiles } = useProfiles();
  const { createServer, updateServer, deleteServer } = useServerMutations(profile?.id);
  
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
  const [backupFilter, setBackupFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortValue, setSortValue] = useState<string>('name-asc');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{ toCreate: number; toUpdate: number; unchanged: number } | null>(null);
  
  // Form domain state (for domain-first selection in form)
  const [formDomainId, setFormDomainId] = useState<string>('');
  
  // Filter networks in the form based on selected form domain
  const formNetworks = useMemo(() => {
    if (!formDomainId) return [];
    return allNetworks.filter(n => n.domain_id === formDomainId);
  }, [allNetworks, formDomainId]);
  
  const [formData, setFormData] = useState<ServerFormData>(initialFormData);
  const { importServers, analyzeServerImport } = useSmartImport();

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
        (server.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((server as any).beneficiary_department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((server as any).primary_application || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEnv = envFilter === 'all' || server.environment === envFilter;
      const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
      const matchesBackup = backupFilter === 'all' || 
        (backupFilter === 'yes' && (server as any).is_backed_up_by_veeam === true) ||
        (backupFilter === 'no' && (!(server as any).is_backed_up_by_veeam));
      return matchesSearch && matchesEnv && matchesStatus && matchesBackup;
    });
  }, [servers, networks, selectedDomainId, selectedNetworkId, searchQuery, envFilter, statusFilter, backupFilter]);

  // Apply sorting
  const sortedServers = useMemo(() => {
    return applySortToData(filteredServers, sortValue);
  }, [filteredServers, sortValue]);

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
      const serverData = {
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
        // Beneficiary fields
        beneficiary_department: formData.beneficiary_department || null,
        primary_application: formData.primary_application || null,
        business_owner: formData.business_owner || null,
        // Veeam Backup fields
        is_backed_up_by_veeam: formData.is_backed_up_by_veeam,
        backup_frequency: formData.backup_frequency,
        backup_job_name: formData.backup_job_name || null,
        // Asset Lifecycle fields (EPIC D)
        purchase_date: formData.purchase_date || null,
        vendor: formData.vendor || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        warranty_end: formData.warranty_end || null,
        contract_id: formData.contract_id || null,
        support_level: formData.support_level,
        eol_date: formData.eol_date || null,
        eos_date: formData.eos_date || null,
        server_role: formData.server_role.length > 0 ? formData.server_role : null,
        rpo_hours: formData.rpo_hours ? parseInt(formData.rpo_hours) : null,
        rto_hours: formData.rto_hours ? parseInt(formData.rto_hours) : null,
        last_restore_test: formData.last_restore_test || null,
      };

      if (editingServer) {
        const { error } = await updateServer(editingServer.id, serverData);
        if (error) throw error;
        toast({ title: t('common.success'), description: 'Server updated' });
      } else {
        const { error } = await createServer(serverData);
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
    const serverAny = server as any;
    setFormData({
      name: server.name,
      ip_address: server.ip_address || '',
      operating_system: server.operating_system || 'Windows Server 2022',
      environment: server.environment || 'production',
      owner: server.owner || '',
      responsible_user: server.responsible_user || '',
      notes: server.notes || '',
      network_id: server.network_id || '',
      status: server.status || 'active',
      cpu: server.cpu || '',
      ram: server.ram || '',
      disk_space: server.disk_space || '',
      // Beneficiary fields
      beneficiary_department: serverAny.beneficiary_department || '',
      primary_application: serverAny.primary_application || '',
      business_owner: serverAny.business_owner || '',
      // Veeam fields
      is_backed_up_by_veeam: serverAny.is_backed_up_by_veeam || false,
      backup_frequency: serverAny.backup_frequency || 'none',
      backup_job_name: serverAny.backup_job_name || '',
      // Asset Lifecycle fields (EPIC D)
      purchase_date: serverAny.purchase_date || '',
      vendor: serverAny.vendor || '',
      model: serverAny.model || '',
      serial_number: serverAny.serial_number || '',
      warranty_end: serverAny.warranty_end || '',
      contract_id: serverAny.contract_id || '',
      support_level: serverAny.support_level || 'standard',
      eol_date: serverAny.eol_date || '',
      eos_date: serverAny.eos_date || '',
      server_role: serverAny.server_role || [],
      rpo_hours: serverAny.rpo_hours?.toString() || '',
      rto_hours: serverAny.rto_hours?.toString() || '',
      last_restore_test: serverAny.last_restore_test ? serverAny.last_restore_test.split('T')[0] : '',
    });
    // Set formDomainId based on the server's network
    const serverNetwork = allNetworks.find(n => n.id === server.network_id);
    setFormDomainId(serverNetwork?.domain_id || '');
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
    setFormDomainId('');
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

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Analyze first
        const preview = await analyzeServerImport(jsonData);
        setImportPreview(preview);

        // Show confirmation
        const confirmMessage = `ملخص الاستيراد:\n\n✅ سجلات جديدة: ${preview.toCreate}\n✏️ سجلات للتحديث: ${preview.toUpdate}\n⏭️ بدون تغيير: ${preview.unchanged}\n⚠️ أخطاء: ${preview.errors.length}\n\nهل تريد المتابعة؟`;
        
        if (confirm(confirmMessage)) {
          const results = await importServers(jsonData);

          toast({
            title: t('common.success'),
            description: `تم الاستيراد: إضافة ${results.created} | تحديث ${results.updated} | أخطاء ${results.errors.length}`,
          });
          refetchServers();
        }
      } catch (error) {
        toast({
          title: t('common.error'),
          description: 'Failed to import file',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
        setImportPreview(null);
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
          <Button variant="outline" onClick={() => document.getElementById('import-excel')?.click()} disabled={isImporting}>
            {isImporting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Upload className="w-4 h-4 me-2" />}
            {isImporting ? 'جاري الاستيراد...' : t('servers.import')}
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
                  <Label>{t('common.domain')} *</Label>
                  <Select
                    value={formDomainId}
                    onValueChange={(value) => {
                      setFormDomainId(value);
                      // Reset network when domain changes
                      setFormData({ ...formData, network_id: '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={dir === 'rtl' ? 'اختر الدومين أولاً' : 'Select domain first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((dom) => (
                        <SelectItem key={dom.id} value={dom.id}>{dom.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.network')}</Label>
                  <Select
                    value={formData.network_id}
                    onValueChange={(value) => setFormData({ ...formData, network_id: value })}
                    disabled={!formDomainId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formDomainId ? (dir === 'rtl' ? 'اختر الشبكة' : 'Select network') : (dir === 'rtl' ? 'اختر الدومين أولاً' : 'Select domain first')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formNetworks.map((net) => (
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

                {/* Beneficiary Section */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-medium mb-3">{t('servers.beneficiary')}</h4>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.beneficiary')}</Label>
                  <Input
                    value={formData.beneficiary_department}
                    onChange={(e) => setFormData({ ...formData, beneficiary_department: e.target.value })}
                    placeholder="e.g., Mechanical Department"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.primaryApp')}</Label>
                  <Input
                    value={formData.primary_application}
                    onChange={(e) => setFormData({ ...formData, primary_application: e.target.value })}
                    placeholder="e.g., SolidWorks, SAP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.businessOwner')}</Label>
                  <Input
                    value={formData.business_owner}
                    onChange={(e) => setFormData({ ...formData, business_owner: e.target.value })}
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Veeam Backup Section */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-medium mb-3">{t('servers.veeamBackup')}</h4>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.isBackedUp')}</Label>
                  <Select
                    value={formData.is_backed_up_by_veeam ? 'yes' : 'no'}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      is_backed_up_by_veeam: value === 'yes',
                      backup_frequency: value === 'no' ? 'none' : formData.backup_frequency === 'none' ? 'daily' : formData.backup_frequency
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t('common.yes')}</SelectItem>
                      <SelectItem value="no">{t('common.no')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.backupFrequency')}</Label>
                  <Select
                    value={formData.backup_frequency}
                    onValueChange={(value) => setFormData({ ...formData, backup_frequency: value })}
                    disabled={!formData.is_backed_up_by_veeam}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('servers.backupNone')}</SelectItem>
                      <SelectItem value="daily">{t('servers.backupDaily')}</SelectItem>
                      <SelectItem value="weekly">{t('servers.backupWeekly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.backupJobName')}</Label>
                  <Input
                    value={formData.backup_job_name}
                    onChange={(e) => setFormData({ ...formData, backup_job_name: e.target.value })}
                    placeholder="e.g., Daily-Backup-Job-01"
                    disabled={!formData.is_backed_up_by_veeam}
                  />
                </div>

                {/* Asset Lifecycle Section (EPIC D) */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-medium mb-3">{t('servers.assetLifecycle')}</h4>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.purchaseDate')}</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.vendor')}</Label>
                  <Select
                    value={formData.vendor}
                    onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dell">Dell</SelectItem>
                      <SelectItem value="HP">HP / HPE</SelectItem>
                      <SelectItem value="Lenovo">Lenovo</SelectItem>
                      <SelectItem value="Cisco">Cisco</SelectItem>
                      <SelectItem value="IBM">IBM</SelectItem>
                      <SelectItem value="Supermicro">Supermicro</SelectItem>
                      <SelectItem value="VMware">VMware (Virtual)</SelectItem>
                      <SelectItem value="Microsoft">Microsoft (Hyper-V)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.model')}</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., PowerEdge R740"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.serialNumber')}</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g., ABC123XYZ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.warrantyEnd')}</Label>
                  <Input
                    type="date"
                    value={formData.warranty_end}
                    onChange={(e) => setFormData({ ...formData, warranty_end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.contractId')}</Label>
                  <Input
                    value={formData.contract_id}
                    onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                    placeholder="e.g., SUP-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.supportLevel')}</Label>
                  <Select
                    value={formData.support_level}
                    onValueChange={(value) => setFormData({ ...formData, support_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('servers.supportNone')}</SelectItem>
                      <SelectItem value="standard">{t('servers.supportStandard')}</SelectItem>
                      <SelectItem value="premium">{t('servers.supportPremium')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.eolDate')}</Label>
                  <Input
                    type="date"
                    value={formData.eol_date}
                    onChange={(e) => setFormData({ ...formData, eol_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.eosDate')}</Label>
                  <Input
                    type="date"
                    value={formData.eos_date}
                    onChange={(e) => setFormData({ ...formData, eos_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.serverRole')}</Label>
                  <Select
                    value={formData.server_role.join(',')}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      server_role: value ? value.split(',').filter(Boolean) : [] 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DC">Domain Controller (DC)</SelectItem>
                      <SelectItem value="CA">Certificate Authority (CA)</SelectItem>
                      <SelectItem value="DNS">DNS Server</SelectItem>
                      <SelectItem value="DHCP">DHCP Server</SelectItem>
                      <SelectItem value="File">File Server</SelectItem>
                      <SelectItem value="Print">Print Server</SelectItem>
                      <SelectItem value="Exchange">Exchange Server</SelectItem>
                      <SelectItem value="SQL">SQL Server</SelectItem>
                      <SelectItem value="IIS">Web Server (IIS)</SelectItem>
                      <SelectItem value="App">Application Server</SelectItem>
                      <SelectItem value="Backup">Backup Server</SelectItem>
                      <SelectItem value="Monitoring">Monitoring Server</SelectItem>
                      <SelectItem value="Testing">Testing Server</SelectItem>
                      <SelectItem value="Development">Under Development</SelectItem>
                      <SelectItem value="Staging">Staging Server</SelectItem>
                      <SelectItem value="WSUS">WSUS Server</SelectItem>
                      <SelectItem value="SCCM">SCCM Server</SelectItem>
                      <SelectItem value="NPS">NPS/RADIUS Server</SelectItem>
                      <SelectItem value="WDS">WDS Server</SelectItem>
                      <SelectItem value="ADFS">ADFS Server</SelectItem>
                      <SelectItem value="NLB">NLB Server</SelectItem>
                      <SelectItem value="DFS">DFS Server</SelectItem>
                      <SelectItem value="Cluster">Failover Cluster</SelectItem>
                      <SelectItem value="Hyper-V">Hyper-V Host</SelectItem>
                      <SelectItem value="RDS">RDS Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Disaster Recovery Section */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-medium mb-3">{t('servers.disasterRecovery')}</h4>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.rpoHours')}</Label>
                  <Input
                    type="number"
                    value={formData.rpo_hours}
                    onChange={(e) => setFormData({ ...formData, rpo_hours: e.target.value })}
                    placeholder="e.g., 4"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.rtoHours')}</Label>
                  <Input
                    type="number"
                    value={formData.rto_hours}
                    onChange={(e) => setFormData({ ...formData, rto_hours: e.target.value })}
                    placeholder="e.g., 8"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.lastRestoreTest')}</Label>
                  <Input
                    type="date"
                    value={formData.last_restore_test}
                    onChange={(e) => setFormData({ ...formData, last_restore_test: e.target.value })}
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
                <SelectValue placeholder={t('servers.selectDomain')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allDomains')}</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Network Filter */}
            <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('servers.selectNetwork')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allNetworks')}</SelectItem>
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
            
            {/* Backup Filter */}
            <Select value={backupFilter} onValueChange={setBackupFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} - Backup</SelectItem>
                <SelectItem value="yes">{t('servers.backedUp')}</SelectItem>
                <SelectItem value="no">{t('servers.notBackedUp')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort Controls */}
          <div className="mt-4">
            <DataTableHeader
              sortOptions={serverSortOptions}
              currentSort={sortValue}
              onSortChange={setSortValue}
            />
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
                  <TableHead className="text-center">{t('servers.name')}</TableHead>
                  <TableHead className="text-center">{t('servers.ip')}</TableHead>
                  <TableHead className="text-center">{t('servers.os')}</TableHead>
                  <TableHead className="text-center">{t('servers.environment')}</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">{t('common.domain')}</TableHead>
                  <TableHead className="text-center">{t('servers.network')}</TableHead>
                  <TableHead className="text-center">{t('common.actions')}</TableHead>
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
                ) : sortedServers.length > 0 ? (
                  sortedServers.map((server) => {
                    const network = allNetworks.find((n) => n.id === server.network_id);
                    const domain = domains.find((d) => d.id === network?.domain_id);
                    return (
                      <TableRow key={server.id} className="stagger-item">
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <ServerIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="text-start">
                              <p className="font-medium">{server.name}</p>
                              <p className="text-xs text-muted-foreground">{server.owner}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{server.ip_address}</TableCell>
                        <TableCell className="text-center">{server.operating_system}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getEnvBadgeClass(server.environment)}>
                            {t(`env.${server.environment}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', getStatusColor(server.status))} />
                            <span className="capitalize">{server.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {domain?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {network?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
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
                    <TableCell colSpan={8} className="text-center py-12">
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