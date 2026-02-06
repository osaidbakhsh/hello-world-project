import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useResources, useCreateResource, useUpdateResource, useDeleteResource, useResourceStats, useResourceSearch } from '@/hooks/useResources';
import { useNetworksV2 } from '@/hooks/useNetworksV2';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import type { Resource, ResourceCreateInput, ResourceUpdateInput, ResourceType, ResourceStatus, CriticalityLevel } from '@/types/resources';
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
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle, ShieldAlert, Eye, Lock, Server, Monitor, Box, Database, Container, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DataPagination, usePagination } from '@/components/ui/data-pagination';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import { ROLE_NAMES } from '@/security/roles';

const RESOURCE_TYPES: ResourceType[] = ['vm', 'physical_server', 'appliance', 'service', 'container', 'database'];
const STATUS_OPTIONS: ResourceStatus[] = ['online', 'offline', 'maintenance', 'degraded', 'unknown', 'decommissioned'];
const CRITICALITY_LEVELS: CriticalityLevel[] = ['critical', 'high', 'medium', 'low'];

interface ResourceFormData {
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
}

const initialFormData: ResourceFormData = {
  resource_type: 'vm',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'physical_server' | 'vm' | 'appliance' | 'other'>('all');
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(initialFormData);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [domains, setDomains] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);

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
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Resource name is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          input: formData as ResourceUpdateInput,
        });
        toast({ title: 'Success', description: 'Resource updated successfully', variant: 'default' });
      } else {
        await createMutation.mutateAsync(formData as Omit<ResourceCreateInput, 'site_id'>);
        toast({ title: 'Success', description: 'Resource created successfully', variant: 'default' });
      }
      setIsFormOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
    } catch (error) {
      console.error('Form submit error:', error);
      toast({ title: 'Error', description: 'Failed to save resource', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    setIsDeleting(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Success', description: 'Resource deleted successfully', variant: 'default' });
    } catch (error) {
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
            You have read-only access to resources. Contact a Site Administrator to request edit permissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-sm text-muted-foreground">Unified inventory of VMs, physical servers, and appliances</p>
        </div>
        {canManageResources ? (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Resource' : 'Create Resource'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Resource Type */}
              <div>
                <Label htmlFor="type">Resource Type *</Label>
                <Select value={formData.resource_type} onValueChange={(val) => setFormData({ ...formData, resource_type: val as ResourceType })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., WEB-PROD-01"
                />
              </div>

              {/* Hostname */}
              <div>
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  id="hostname"
                  value={formData.hostname || ''}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  placeholder="e.g., web-prod-01.corp.local"
                />
              </div>

              {/* Primary IP */}
              <div>
                <Label htmlFor="ip">Primary IP</Label>
                <Input
                  id="ip"
                  value={formData.primary_ip || ''}
                  onChange={(e) => setFormData({ ...formData, primary_ip: e.target.value })}
                  placeholder="e.g., 192.168.1.10"
                />
              </div>

              {/* OS */}
              <div>
                <Label htmlFor="os">Operating System</Label>
                <Input
                  id="os"
                  value={formData.os || ''}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  placeholder="e.g., Windows Server 2022"
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as ResourceStatus })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Criticality */}
              <div>
                <Label htmlFor="criticality">Criticality</Label>
                <Select value={formData.criticality || ''} onValueChange={(val) => setFormData({ ...formData, criticality: val as CriticalityLevel })}>
                  <SelectTrigger id="criticality">
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITICALITY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Environment */}
              <div>
                <Label htmlFor="env">Environment</Label>
                <Input
                  id="env"
                  value={formData.environment || ''}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  placeholder="e.g., Production, Staging, Development"
                />
              </div>

              {/* Owner Team */}
              <div>
                <Label htmlFor="owner">Owner Team</Label>
                <Input
                  id="owner"
                  value={formData.owner_team || ''}
                  onChange={(e) => setFormData({ ...formData, owner_team: e.target.value })}
                  placeholder="e.g., Infrastructure Team"
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        ) : null}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.by_status.online || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.by_status.offline || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.by_criticality.critical || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Backed Up</CardTitle>
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
            All
            <Badge variant="secondary" className="ml-1 text-xs">{stats?.total || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="physical_server" className="flex items-center gap-1.5">
            <Server className="h-4 w-4" />
            Servers
            <Badge variant="secondary" className="ml-1 text-xs">{stats?.by_type.physical_server || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vm" className="flex items-center gap-1.5">
            <Monitor className="h-4 w-4" />
            VMs
            <Badge variant="secondary" className="ml-1 text-xs">{stats?.by_type.vm || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="appliance" className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            Appliances
            <Badge variant="secondary" className="ml-1 text-xs">{stats?.by_type.appliance || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            Other
            <Badge variant="secondary" className="ml-1 text-xs">{(stats?.by_type.service || 0) + (stats?.by_type.container || 0) + (stats?.by_type.database || 0)}</Badge>
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
                You have domain-scoped access. Please select a domain below to view and manage resources.
              </AlertDescription>
            </Alert>
          ) : (
            /* Domain filter hint */
            <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
              <AlertDescription className="text-sm">
                📌 Showing resources for domain: <span className="font-semibold">{domains.find(d => d.id === selectedDomainId)?.name}</span>
                (site-level resources excluded)
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            {/* Domain Selection for DomainAdmin (if not site.manage) */}
            {isDomainAdmin && !hasSiteManagePermission && (
              <Select value={selectedDomainId || ''} onValueChange={(val) => { setSelectedDomainId(val); handlePageChange(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select domain" />
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
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources by name, hostname, IP..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handlePageChange(1);
                  }}
                  className="pl-10"
                  disabled={isDomainAdmin && !hasSiteManagePermission && !selectedDomainId}
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(val) => { setFilterType(val as ResourceType | 'all'); handlePageChange(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val as ResourceStatus | 'all'); handlePageChange(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
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
              <p className="text-sm text-muted-foreground">Please select a domain in the filters to view resources</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!(isDomainAdmin && !hasSiteManagePermission && !selectedDomainId) && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Resources ({displayData.length})
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
              <p className="text-sm text-muted-foreground">No resources found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Actions</TableHead>
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
