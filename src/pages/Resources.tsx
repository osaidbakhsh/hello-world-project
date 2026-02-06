import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useResources, useCreateResource, useUpdateResource, useDeleteResource, useResourceStats, useResourceSearch } from '@/hooks/useResources';
import { useNetworksV2 } from '@/hooks/useNetworksV2';
import type { Resource, ResourceCreateInput, ResourceUpdateInput, ResourceType, ResourceStatus, CriticalityLevel } from '@/types/resources';
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
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DataPagination, usePagination } from '@/components/ui/data-pagination';
import NoSiteSelected from '@/components/common/NoSiteSelected';

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

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(initialFormData);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Queries & Mutations
  const { data: resources = [], isLoading } = useResources({
    resource_type: filterType === 'all' ? undefined : filterType,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const { data: stats } = useResourceStats();
  const { data: searchResults = [], isLoading: isSearching } = useResourceSearch(
    searchQuery,
    searchQuery.length >= 2
  );

  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();

  // Pagination
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-sm text-muted-foreground">Unified inventory of VMs, physical servers, and appliances</p>
        </div>
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
              <div className="text-2xl font-bold text-green-600">{stats.by_status.online || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.by_status.offline || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.by_criticality.critical || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Backed Up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.backed_up}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
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

      {/* Table */}
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
                              className="text-red-600 hover:text-red-700"
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
    </div>
  );
};

export default Resources;
