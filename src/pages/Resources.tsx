import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useResources, useCreateResource, useUpdateResource, useDeleteResource, useResourceStats, useResourceSearch } from '@/hooks/useResources';
import { useNetworksV2 } from '@/hooks/useNetworksV2';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import type { Resource, ResourceCreateInput, ResourceUpdateInput, ResourceType, ResourceStatus, CriticalityLevel, PhysicalServerInput, VMInput, NetworkV2 } from '@/types/resources';
import { upsertPhysicalServer, upsertVM, deletePhysicalServer, deleteVM } from '@/services/resourceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle, ShieldAlert, Eye, Lock, Server, Monitor, Box, Database, Container, Settings2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DataPagination, usePagination } from '@/components/ui/data-pagination';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import { ROLE_NAMES } from '@/security/roles';
import { ResourceTypeStep } from '@/components/resources/ResourceTypeStep';
import { SharedFieldsSection } from '@/components/resources/SharedFieldsSection';
import { ServerDetailsSection } from '@/components/resources/ServerDetailsSection';
import { VMDetailsSection } from '@/components/resources/VMDetailsSection';

const RESOURCE_TYPES: ResourceType[] = ['vm', 'physical_server', 'appliance', 'service', 'container', 'database'];
const STATUS_OPTIONS: ResourceStatus[] = ['online', 'offline', 'maintenance', 'degraded', 'unknown', 'decommissioned'];
const CRITICALITY_LEVELS: CriticalityLevel[] = ['critical', 'high', 'medium', 'low'];

// Extended form data to support both generic and type-specific fields
interface ExtendedResourceFormData {
  // Shared fields
  resource_type: ResourceType;
  name: string;
  hostname?: string;
  primary_ip?: string;
  os?: string;
  status: ResourceStatus;
  criticality?: CriticalityLevel;
  environment?: string;
  owner_team?: string;
  tags?: string[];
  notes?: string;
  
  // Physical Server specific
  network_id?: string;
  cpu?: string;
  ram?: string;
  disk_space?: string;
  vendor?: string;
  model?: string;
  serial_number?: string;
  warranty_end?: string;
  eol_date?: string;
  eos_date?: string;
  purchase_date?: string;
  beneficiary_department?: string;
  primary_application?: string;
  business_owner?: string;
  is_backed_up_by_veeam?: boolean;
  backup_frequency?: string;
  backup_job_name?: string;
  contract_id?: string;
  support_level?: string;
  server_role?: string[];
  rpo_hours?: string;
  rto_hours?: string;
  last_restore_test?: string;
  responsible_user?: string;
  
  // VM specific
  cpu_cores?: number;
  ram_gb?: number;
  storage_gb?: number;
  cluster_id?: string;
  hypervisor_type?: string;
  hypervisor_host?: string;
  vm_id?: string;
  template_name?: string;
  is_template?: boolean;
  tools_status?: string;
  tools_version?: string;
  snapshot_count?: number;
}

const initialFormData: ExtendedResourceFormData = {
  resource_type: 'physical_server',
  name: '',
  status: 'unknown',
};

const Resources: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { selectedSite } = useSite();
  const { toast } = useToast();
  
  // RBAC permissions
  const { canView, canManageResources, isViewerOnly, context, isLoading: permissionsLoading } = usePermissions();

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<'type' | 'details'>('type'); // Step 1 or Step 2
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'physical_server' | 'vm' | 'appliance' | 'other'>('all');
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | 'all'>('all');
  const [formData, setFormData] = useState<ExtendedResourceFormData>(initialFormData);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [domains, setDomains] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);
  
  // Load networks
  const { data: networks = [] } = useNetworksV2();

  // ============================================================
  // DomainAdmin Option A: Detect scope and auto-filter
  // ============================================================
  
  // Check if user has DomainAdmin role assigned at domain scope
  const isDomainAdmin = useMemo(() => {
    if (!context) return false;
    return context.assignments.some(
      a => a.role_name === ROLE_NAMES.DOMAIN_ADMIN && a.scope_type === 'domain' && a.status === 'active'
    );
  }, [context]);

  // Get the domain(s) this DomainAdmin is assigned to
  const domainAdminScopes = useMemo(() => {
    if (!isDomainAdmin || !context) return [];
    return context.assignments.filter(
      a => a.role_name === ROLE_NAMES.DOMAIN_ADMIN && a.scope_type === 'domain' && a.status === 'active'
    );
  }, [isDomainAdmin, context]);

  // Check if user has site.manage permission (SiteAdmin or InfraOperator at site scope)
  const hasSiteManagePermission = useMemo(() => {
    if (!context || !selectedSite) return false;
    return context.assignments.some(
      a => (a.role_name === ROLE_NAMES.SITE_ADMIN || a.role_name === ROLE_NAMES.INFRA_OPERATOR) 
          && a.scope_type === 'site' 
          && a.scope_id === selectedSite.id 
          && a.status === 'active'
    );
  }, [context, selectedSite]);

  // Load domains for site (for DomainAdmin dropdown or SiteAdmin optional filter)
  React.useEffect(() => {
    if (!selectedSite) return;
    
    const loadDomains = async () => {
      setDomainsLoading(true);
      try {
        const { data, error } = await supabase
          .from('domains')
          .select('id, name')
          .eq('site_id', selectedSite.id)
          .order('name');
        
        if (error) throw error;
        setDomains(data || []);
        
        // For DomainAdmin: auto-select their domain if only one
        if (isDomainAdmin && domainAdminScopes.length === 1 && !selectedDomainId) {
          setSelectedDomainId(domainAdminScopes[0].scope_id);
        }
      } catch (err) {
        console.error('Failed to load domains:', err);
        toast({ title: 'Error', description: 'Failed to load domains', variant: 'destructive' });
      } finally {
        setDomainsLoading(false);
      }
    };

    loadDomains();
  }, [selectedSite, isDomainAdmin, domainAdminScopes]);

  // ============================================================
  // Queries & Mutations (with domain filtering)
  // ============================================================

  // Build filter object: Tab-based filtering + domain filtering for RBAC
  const resourceFilters = useMemo(() => {
    const filters: any = {
      status: filterStatus === 'all' ? undefined : filterStatus,
    };

    // Tab-based resource_type filtering (overrides dropdown if a tab is selected)
    if (activeTab === 'physical_server') {
      filters.resource_type = 'physical_server';
    } else if (activeTab === 'vm') {
      filters.resource_type = 'vm';
    } else if (activeTab === 'appliance') {
      filters.resource_type = 'appliance';
    } else if (activeTab === 'other') {
      // Other = service, container, database
      filters.resource_type = ['service', 'container', 'database'];
    } else if (filterType !== 'all') {
      // If "All" tab and dropdown is selected
      filters.resource_type = filterType;
    }

    // DomainAdmin Option A: Filter to domain_id only (exclude site-level resources)
    if (isDomainAdmin && !hasSiteManagePermission && selectedDomainId) {
      filters.domain_id = selectedDomainId;
      filters.exclude_null_domain = true; // Custom flag to exclude domain_id IS NULL
    }

    return filters;
  }, [activeTab, filterType, filterStatus, isDomainAdmin, hasSiteManagePermission, selectedDomainId]);

  const { data: resources = [], isLoading } = useResources(resourceFilters);

  const { data: stats } = useResourceStats();
  const { data: searchResults = [], isLoading: isSearching } = useResourceSearch(
    searchQuery,
    searchQuery.length >= 2
  );

  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();

  // Tab counts from resources
  const tabCounts = useMemo(() => {
    // Need to count from all resources (not filtered data)
    const allData = searchQuery.length >= 2 ? searchResults : resources;
    return {
      all: allData.length,
      physical_server: allData.filter(r => r.resource_type === 'physical_server').length,
      vm: allData.filter(r => r.resource_type === 'vm').length,
      appliance: allData.filter(r => r.resource_type === 'appliance').length,
      other: allData.filter(r => ['service', 'container', 'database'].includes(r.resource_type)).length,
    };
  }, [resources, searchResults, searchQuery]);

  // Pagination - apply after tab filtering
  const displayData = searchQuery.length >= 2 ? searchResults : resources;
  const { currentPage, pageSize, paginatedData, totalPages, handlePageChange } = usePagination(displayData, 10);

  // Handlers
  const handleOpenForm = (resource?: Resource) => {
    if (resource) {
      setEditingId(resource.id);
      setFormData({
        ...initialFormData,
        resource_type: resource.resource_type,
        name: resource.name,
        hostname: resource.hostname || undefined,
        primary_ip: resource.primary_ip || undefined,
        os: resource.os || undefined,
        status: resource.status,
        criticality: resource.criticality || undefined,
        environment: resource.environment || undefined,
        owner_team: resource.owner_team || undefined,
        tags: resource.tags || undefined,
        notes: resource.notes || undefined,
      });
      setFormStep('details');
    } else {
      setEditingId(null);
      setFormData(initialFormData);
      setFormStep('type');
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, resourceType: ResourceType) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Resource name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (resourceType === 'physical_server') {
        // Physical Server: must have network_id
        if (!formData.network_id) {
          toast({ title: 'Error', description: 'Network is required for physical servers', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        const physServerInput: PhysicalServerInput = {
          resource_id: editingId || undefined,
          network_id: formData.network_id,
          name: formData.name,
          hostname: formData.hostname,
          ip_address: formData.primary_ip,
          operating_system: formData.os,
          status: formData.status,
          criticality: formData.criticality,
          environment: formData.environment,
          owner: formData.owner_team,
          cpu: formData.cpu,
          ram: formData.ram,
          disk_space: formData.disk_space,
          vendor: formData.vendor,
          model: formData.model,
          serial_number: formData.serial_number,
          warranty_end: formData.warranty_end,
          eol_date: formData.eol_date,
          eos_date: formData.eos_date,
          purchase_date: formData.purchase_date,
          is_backed_up_by_veeam: formData.is_backed_up_by_veeam,
          backup_frequency: formData.backup_frequency,
          backup_job_name: formData.backup_job_name,
          beneficiary_department: formData.beneficiary_department,
          primary_application: formData.primary_application,
          business_owner: formData.business_owner,
          contract_id: formData.contract_id,
          support_level: formData.support_level,
          server_role: formData.server_role,
          rpo_hours: formData.rpo_hours ? parseInt(formData.rpo_hours) : undefined,
          rto_hours: formData.rto_hours ? parseInt(formData.rto_hours) : undefined,
          last_restore_test: formData.last_restore_test,
          responsible_user: formData.responsible_user,
          notes: formData.notes,
          tags: formData.tags,
        };

        await upsertPhysicalServer(physServerInput);
        toast({ title: 'Success', description: editingId ? 'Physical server updated' : 'Physical server created', variant: 'default' });
      } else if (resourceType === 'vm') {
        // VM: use RPC for VM upsert
        const vmInput: VMInput = {
          resource_id: editingId || undefined,
          site_id: selectedSite?.id,
          domain_id: selectedDomainId || undefined,
          name: formData.name,
          hostname: formData.hostname,
          primary_ip: formData.primary_ip,
          os: formData.os,
          cpu_cores: formData.cpu_cores,
          ram_gb: formData.ram_gb,
          storage_gb: formData.storage_gb,
          status: formData.status,
          criticality: formData.criticality,
          environment: formData.environment,
          owner_team: formData.owner_team,
          hypervisor_type: formData.hypervisor_type,
          hypervisor_host: formData.hypervisor_host,
          vm_id: formData.vm_id,
          template_name: formData.template_name,
          is_template: formData.is_template,
          tools_status: formData.tools_status,
          tools_version: formData.tools_version,
          snapshot_count: formData.snapshot_count,
          notes: formData.notes,
          tags: formData.tags,
        };

        await upsertVM(vmInput);
        toast({ title: 'Success', description: editingId ? 'VM updated' : 'VM created', variant: 'default' });
      } else {
        // Other types: use generic resource mutation (legacy path for now)
        const input: ResourceCreateInput | ResourceUpdateInput = {
          site_id: selectedSite?.id,
          domain_id: selectedDomainId || undefined,
          resource_type: resourceType,
          name: formData.name,
          hostname: formData.hostname,
          primary_ip: formData.primary_ip,
          os: formData.os,
          status: formData.status,
          criticality: formData.criticality,
          environment: formData.environment,
          owner_team: formData.owner_team,
          notes: formData.notes,
          tags: formData.tags,
        };

        if (editingId) {
          await updateMutation.mutateAsync({ id: editingId, input });
        } else {
          await createMutation.mutateAsync(input as Omit<ResourceCreateInput, 'site_id'>);
        }
        toast({ title: 'Success', description: editingId ? 'Resource updated' : 'Resource created', variant: 'default' });
      }

      setIsFormOpen(false);
      setEditingId(null);
      setFormData(initialFormData);
      setFormStep('type');
      setSelectedDomainId(null);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save resource', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('resources.deleteConfirm') || 'Are you sure you want to delete this resource?')) return;

    setIsDeleting(id);
    try {
      const resource = resources.find(r => r.id === id);
      if (resource?.resource_type === 'physical_server') {
        await deletePhysicalServer(id);
      } else if (resource?.resource_type === 'vm') {
        await deleteVM(id);
      } else {
        await deleteMutation.mutateAsync(id);
      }
      toast({ title: t('common.success'), description: t('resources.deleteSuccess'), variant: 'default' });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete resource', variant: 'destructive' });
    } finally {
      setIsDeleting(null);
    }
  };

  // Status badge color
  const getStatusColor = (status: ResourceStatus): string => {
    const colors: Record<ResourceStatus, string> = {
      'online': 'bg-emerald-100 text-emerald-900',
      'offline': 'bg-destructive/20 text-destructive',
      'maintenance': 'bg-amber-100 text-amber-900',
      'degraded': 'bg-orange-100 text-orange-900',
      'unknown': 'bg-muted text-muted-foreground',
      'decommissioned': 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getCriticalityColor = (criticality?: CriticalityLevel): string => {
    const colors: Record<CriticalityLevel, string> = {
      'critical': 'bg-destructive/20 text-destructive',
      'high': 'bg-orange-100 text-orange-900',
      'medium': 'bg-amber-100 text-amber-900',
      'low': 'bg-emerald-100 text-emerald-900',
    };
    return criticality ? colors[criticality] : 'bg-muted text-muted-foreground';
  };

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Read-only banner for viewers */}
      {isViewerOnly && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            {t('resources.viewerHint')}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('resources.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('resources.subtitle')}</p>
        </div>
        {canManageResources ? (
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingId(null);
            setFormData(initialFormData);
            setFormStep('type');
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingId(null);
              setFormData(initialFormData);
              setFormStep('type');
              setSelectedDomainId(null);
            }}>
              <Plus className="me-2 h-4 w-4" />
              {t('resources.addResource')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? t('resources.edit') : t('resources.addResource')}
                {!editingId && formStep === 'details' && (
                  <Badge className="ms-2 text-xs">
                    {formData.resource_type === 'physical_server' && t('resources.physicalServer')}
                    {formData.resource_type === 'vm' && t('resources.vm')}
                    {formData.resource_type === 'appliance' && t('resources.appliance')}
                    {formData.resource_type === 'database' && t('resources.database')}
                    {formData.resource_type === 'container' && t('resources.container')}
                    {formData.resource_type === 'service' && t('resources.service')}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Step 1: Type Selection (Create only) */}
              {!editingId && formStep === 'type' && (
                <>
                  <ResourceTypeStep
                    selectedType={formData.resource_type}
                    onTypeSelect={(type) => {
                      setFormData({ ...formData, resource_type: type });
                      setFormStep('details');
                    }}
                  />
                </>
              )}

              {/* Step 2: Details Form */}
              {formStep === 'details' && (
                <form onSubmit={(e) => handleSubmit(e, formData.resource_type)} className="space-y-6">
                  {/* Domain Selection for DomainAdmin */}
                  {isDomainAdmin && !hasSiteManagePermission && domains.length > 0 && (
                    <div>
                      <Label htmlFor="domain">{t('common.domain')} *</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('resources.domainAdminHint')}
                      </p>
                      <Select value={selectedDomainId || ''} onValueChange={setSelectedDomainId}>
                        <SelectTrigger id="domain" className="mt-2">
                          <SelectValue placeholder={t('dashboard.selectNetwork')} />
                        </SelectTrigger>
                        <SelectContent>
                          {domainAdminScopes.map((scope) => {
                            const domain = domains.find(d => d.id === scope.scope_id);
                            return (
                              <SelectItem key={scope.scope_id} value={scope.scope_id}>
                                {domain?.name || 'Unknown Domain'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Shared Fields */}
                  <SharedFieldsSection
                    resourceType={formData.resource_type}
                    name={formData.name}
                    hostname={formData.hostname}
                    primaryIp={formData.primary_ip}
                    os={formData.os}
                    status={formData.status}
                    criticality={formData.criticality}
                    environment={formData.environment}
                    ownerTeam={formData.owner_team}
                    notes={formData.notes}
                    onNameChange={(v) => setFormData({ ...formData, name: v })}
                    onHostnameChange={(v) => setFormData({ ...formData, hostname: v })}
                    onPrimaryIpChange={(v) => setFormData({ ...formData, primary_ip: v })}
                    onOsChange={(v) => setFormData({ ...formData, os: v })}
                    onStatusChange={(v) => setFormData({ ...formData, status: v })}
                    onCriticalityChange={(v) => setFormData({ ...formData, criticality: v })}
                    onEnvironmentChange={(v) => setFormData({ ...formData, environment: v })}
                    onOwnerTeamChange={(v) => setFormData({ ...formData, owner_team: v })}
                    onNotesChange={(v) => setFormData({ ...formData, notes: v })}
                    onTagsChange={(v) => setFormData({ ...formData, tags: v })}
                  />

                  {/* Type-Specific Sections */}
                  {formData.resource_type === 'physical_server' && networks.length > 0 && (
                    <ServerDetailsSection
                      networkId={formData.network_id}
                      networks={networks}
                      cpu={formData.cpu}
                      ram={formData.ram}
                      diskSpace={formData.disk_space}
                      vendor={formData.vendor}
                      model={formData.model}
                      serialNumber={formData.serial_number}
                      warrantyEnd={formData.warranty_end}
                      eoDate={formData.eol_date}
                      eosDate={formData.eos_date}
                      purchaseDate={formData.purchase_date}
                      beneficiaryDepartment={formData.beneficiary_department}
                      primaryApplication={formData.primary_application}
                      businessOwner={formData.business_owner}
                      isBackedUpByVeeam={formData.is_backed_up_by_veeam}
                      backupFrequency={formData.backup_frequency}
                      backupJobName={formData.backup_job_name}
                      contractId={formData.contract_id}
                      supportLevel={formData.support_level}
                      serverRole={formData.server_role}
                      rpoHours={formData.rpo_hours}
                      rtoHours={formData.rto_hours}
                      lastRestoreTest={formData.last_restore_test}
                      responsibleUser={formData.responsible_user}
                      onNetworkIdChange={(v) => setFormData({ ...formData, network_id: v })}
                      onCpuChange={(v) => setFormData({ ...formData, cpu: v })}
                      onRamChange={(v) => setFormData({ ...formData, ram: v })}
                      onDiskSpaceChange={(v) => setFormData({ ...formData, disk_space: v })}
                      onVendorChange={(v) => setFormData({ ...formData, vendor: v })}
                      onModelChange={(v) => setFormData({ ...formData, model: v })}
                      onSerialNumberChange={(v) => setFormData({ ...formData, serial_number: v })}
                      onWarrantyEndChange={(v) => setFormData({ ...formData, warranty_end: v })}
                      onEoDateChange={(v) => setFormData({ ...formData, eol_date: v })}
                      onEosDateChange={(v) => setFormData({ ...formData, eos_date: v })}
                      onPurchaseDateChange={(v) => setFormData({ ...formData, purchase_date: v })}
                      onBeneficiaryDepartmentChange={(v) => setFormData({ ...formData, beneficiary_department: v })}
                      onPrimaryApplicationChange={(v) => setFormData({ ...formData, primary_application: v })}
                      onBusinessOwnerChange={(v) => setFormData({ ...formData, business_owner: v })}
                      onIsBackedUpByVeeamChange={(v) => setFormData({ ...formData, is_backed_up_by_veeam: v })}
                      onBackupFrequencyChange={(v) => setFormData({ ...formData, backup_frequency: v })}
                      onBackupJobNameChange={(v) => setFormData({ ...formData, backup_job_name: v })}
                      onContractIdChange={(v) => setFormData({ ...formData, contract_id: v })}
                      onSupportLevelChange={(v) => setFormData({ ...formData, support_level: v })}
                      onServerRoleChange={(v) => setFormData({ ...formData, server_role: v })}
                      onRpoHoursChange={(v) => setFormData({ ...formData, rpo_hours: v })}
                      onRtoHoursChange={(v) => setFormData({ ...formData, rto_hours: v })}
                      onLastRestoreTestChange={(v) => setFormData({ ...formData, last_restore_test: v })}
                      onResponsibleUserChange={(v) => setFormData({ ...formData, responsible_user: v })}
                    />
                  )}

                  {formData.resource_type === 'vm' && (
                    <VMDetailsSection
                      cpuCores={formData.cpu_cores}
                      ramGb={formData.ram_gb}
                      storageGb={formData.storage_gb}
                      hypervisorType={formData.hypervisor_type}
                      hypervisorHost={formData.hypervisor_host}
                      vmId={formData.vm_id}
                      templateName={formData.template_name}
                      isTemplate={formData.is_template}
                      toolsStatus={formData.tools_status}
                      toolsVersion={formData.tools_version}
                      snapshotCount={formData.snapshot_count}
                      onCpuCoresChange={(v) => setFormData({ ...formData, cpu_cores: v })}
                      onRamGbChange={(v) => setFormData({ ...formData, ram_gb: v })}
                      onStorageGbChange={(v) => setFormData({ ...formData, storage_gb: v })}
                      onHypervisorTypeChange={(v) => setFormData({ ...formData, hypervisor_type: v })}
                      onHypervisorHostChange={(v) => setFormData({ ...formData, hypervisor_host: v })}
                      onVmIdChange={(v) => setFormData({ ...formData, vm_id: v })}
                      onTemplateNameChange={(v) => setFormData({ ...formData, template_name: v })}
                      onIsTemplateChange={(v) => setFormData({ ...formData, is_template: v })}
                      onToolsStatusChange={(v) => setFormData({ ...formData, tools_status: v })}
                      onToolsVersionChange={(v) => setFormData({ ...formData, tools_version: v })}
                      onSnapshotCountChange={(v) => setFormData({ ...formData, snapshot_count: v })}
                    />
                  )}

                  {/* Form Actions */}
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    {!editingId && formStep === 'details' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormStep('type')}
                      >
                        {t('resources.back')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                    >
                      {t('resources.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || (formData.resource_type === 'physical_server' && !networks.length)}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          {t('resources.saving')}
                        </>
                      ) : editingId ? (
                        t('common.update')
                      ) : (
                        t('common.create')
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </DialogContent>
        </Dialog>
        ) : null}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('resources.totalResources')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('resources.online')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.by_status.online || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('resources.offline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.by_status.offline || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('resources.critical')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.by_criticality.critical || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('resources.backedUp')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.backed_up}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Hub Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as typeof activeTab); handlePageChange(1); }} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-xl">
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <Box className="h-4 w-4" />
            {t('resources.all')}
            <Badge variant="secondary" className="ms-1 text-xs">{stats?.total || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="physical_server" className="flex items-center gap-1.5">
            <Server className="h-4 w-4" />
            {t('nav.servers')}
            <Badge variant="secondary" className="ms-1 text-xs">{stats?.by_type.physical_server || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vm" className="flex items-center gap-1.5">
            <Monitor className="h-4 w-4" />
            {t('resources.vms')}
            <Badge variant="secondary" className="ms-1 text-xs">{stats?.by_type.vm || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="appliance" className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            {t('resources.appliances')}
            <Badge variant="secondary" className="ms-1 text-xs">{stats?.by_type.appliance || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            {t('resources.other')}
            <Badge variant="secondary" className="ms-1 text-xs">{(stats?.by_type.service || 0) + (stats?.by_type.container || 0) + (stats?.by_type.database || 0)}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* DomainAdmin Option A: Check if domain selection is required */}
      {isDomainAdmin && !hasSiteManagePermission && (
        <div className="space-y-4">
          {/* Require domain selection before showing table */}
          {!selectedDomainId ? (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {t('resources.selectDomainFirst')}
              </AlertDescription>
            </Alert>
          ) : (
            /* Domain filter hint */
            <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
              <AlertDescription className="text-sm">
                📌 {t('resources.domainAdminHint')}: <span className="font-semibold">{domains.find(d => d.id === selectedDomainId)?.name}</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('common.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            {/* Domain Selection for DomainAdmin (if not site.manage) */}
            {isDomainAdmin && !hasSiteManagePermission && (
              <Select value={selectedDomainId || ''} onValueChange={(val) => { setSelectedDomainId(val); handlePageChange(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('dashboard.selectNetwork')} />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('resources.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handlePageChange(1);
                  }}
                  className="ps-10"
                  disabled={isDomainAdmin && !hasSiteManagePermission && !selectedDomainId}
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(val) => { setFilterType(val as ResourceType | 'all'); handlePageChange(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('resources.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('resources.allTypes')}</SelectItem>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{t(`resources.${type}`) || type.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val as ResourceStatus | 'all'); handlePageChange(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('resources.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('resources.allStatuses')}</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{t(`resources.${status}`) || status.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Domain selection guard for DomainAdmin */}
      {isDomainAdmin && !hasSiteManagePermission && !selectedDomainId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('resources.selectDomainFirst')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!(isDomainAdmin && !hasSiteManagePermission && !selectedDomainId) && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('resources.title')} ({displayData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || isSearching ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('resources.noResources')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('resources.name')}</TableHead>
                      <TableHead>{t('common.type')}</TableHead>
                      <TableHead>{t('resources.hostname')}</TableHead>
                      <TableHead>{t('resources.ip')}</TableHead>
                      <TableHead>{t('resources.os')}</TableHead>
                      <TableHead>{t('resources.status')}</TableHead>
                      <TableHead>{t('resources.criticality')}</TableHead>
                      <TableHead>{t('resources.environment')}</TableHead>
                      <TableHead>{t('resources.owner')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.name}</TableCell>
                        <TableCell>{resource.resource_type.replace('_', ' ')}</TableCell>
                        <TableCell>{resource.hostname || '—'}</TableCell>
                        <TableCell>{resource.primary_ip || '—'}</TableCell>
                        <TableCell>{resource.os || '—'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(resource.status)}>
                            {resource.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {resource.criticality ? (
                            <Badge className={getCriticalityColor(resource.criticality)}>
                              {resource.criticality}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{resource.environment || '—'}</TableCell>
                        <TableCell>{resource.owner_team || '—'}</TableCell>
                        <TableCell>
                          {canManageResources ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenForm(resource)}
                                disabled={editingId === resource.id}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(resource.id)}
                                disabled={isDeleting === resource.id}
                              >
                                {isDeleting === resource.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <DataPagination
                    currentPage={currentPage}
                    totalItems={displayData.length}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default Resources;
