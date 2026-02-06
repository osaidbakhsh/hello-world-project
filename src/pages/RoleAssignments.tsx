import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROLE_NAMES, SCOPE_TYPES, getRoleDisplayName, getScopeTypeDisplayName, type ScopeType, type RoleName } from '@/security/roles';
import {
  fetchRoles,
  fetchRoleAssignmentsForSite,
  fetchAllRoleAssignments,
  createRoleAssignment,
  updateRoleAssignment,
  getScopeOptions,
  type RoleAssignment,
  type Role,
  type CreateRoleAssignmentInput,
} from '@/services/rbacService';
import { useCreateApproval } from '@/hooks/useApprovals';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Shield, ShieldCheck, ShieldX, Users, Loader2, AlertTriangle, Eye, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DataPagination, usePagination } from '@/components/ui/data-pagination';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import NoSiteSelected from '@/components/common/NoSiteSelected';

interface UserOption {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

const RoleAssignments: React.FC = () => {
  const { t } = useLanguage();
  const { selectedSite } = useSite();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Permissions
  const { 
    isSuperAdmin, 
    canManageRBAC, 
    hasPermission,
    isLoading: permissionsLoading 
  } = usePermissions();
  const canApproveRBAC = hasPermission(PERMISSION_KEYS.GOV_APPROVALS_MANAGE);

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterScopeType, setFilterScopeType] = useState<string>('all');
  const [editingAssignment, setEditingAssignment] = useState<RoleAssignment | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    role_id: '',
    scope_type: 'site' as ScopeType,
    scope_id: '',
    notes: '',
  });

  // User search for form
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Scope options for form
  const [scopeOptions, setScopeOptions] = useState<{ id: string; name: string }[]>([]);

  // Queries
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['role-assignments', selectedSite?.id, isSuperAdmin],
    queryFn: () => {
      if (isSuperAdmin) {
        return fetchAllRoleAssignments();
      }
      if (selectedSite?.id) {
        return fetchRoleAssignmentsForSite(selectedSite.id);
      }
      return [];
    },
    enabled: isSuperAdmin || !!selectedSite?.id,
  });

  // Mutations
  const createApprovalMutation = useCreateApproval();

  const createMutation = useMutation({
    mutationFn: async (input: CreateRoleAssignmentInput) => {
      // If user can manage RBAC, apply directly; otherwise create approval request
      if (canManageRBAC) {
        return createRoleAssignment(input);
      }

      // Create approval request instead
      if (!selectedSite) throw new Error('No site selected');

      const approvalInput = {
        site_id: selectedSite.id,
        scope_type: input.scope_type,
        scope_id: input.scope_id,
        entity_type: 'role_assignment',
        action_type: 'create',
        request_data: input as unknown as Record<string, unknown>,
        approver_role: 'SiteAdmin',
        requester_notes: input.notes,
      };

      return createApprovalMutation.mutateAsync(approvalInput);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      
      if (canManageRBAC) {
        toast({ title: 'Success', description: 'Role assignment created successfully' });
      } else {
        toast({ 
          title: 'Approval Submitted', 
          description: 'Your role assignment request has been submitted for approval' 
        });
      }
      
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create assignment', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateRoleAssignment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      toast({ title: 'Success', description: 'Role assignment updated successfully' });
      setEditingAssignment(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update assignment', variant: 'destructive' });
    },
  });

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (filterRole !== 'all' && a.role_name !== filterRole) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterScopeType !== 'all' && a.scope_type !== filterScopeType) return false;
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesUser = a.user_email?.toLowerCase().includes(search) || 
                           a.user_full_name?.toLowerCase().includes(search);
        if (!matchesUser) return false;
      }
      return true;
    });
  }, [assignments, filterRole, filterStatus, filterScopeType, searchQuery]);

  // Pagination
  const { currentPage, pageSize, paginatedData, totalPages, handlePageChange } = usePagination(filteredAssignments, 10);

  // Helpers
  const resetForm = () => {
    setFormData({
      user_id: '',
      role_id: '',
      scope_type: 'site',
      scope_id: '',
      notes: '',
    });
    setUserSearch('');
    setUserOptions([]);
    setScopeOptions([]);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserOptions([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      setUserOptions(data || []);
    } catch (e) {
      console.error('User search error:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadScopeOptions = async (scopeType: ScopeType) => {
    try {
      const options = await getScopeOptions(scopeType, selectedSite?.id);
      setScopeOptions(options);
      // If editing for site scope and we have a selected site, pre-select it
      if (scopeType === 'site' && selectedSite && !formData.scope_id) {
        setFormData(prev => ({ ...prev, scope_id: selectedSite.id }));
      }
    } catch (e) {
      console.error('Load scope options error:', e);
    }
  };

  const handleScopeTypeChange = async (scopeType: ScopeType) => {
    setFormData(prev => ({ ...prev, scope_type: scopeType, scope_id: '' }));
    await loadScopeOptions(scopeType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.role_id || !formData.scope_id) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const input: CreateRoleAssignmentInput = {
      user_id: formData.user_id,
      role_id: formData.role_id,
      scope_type: formData.scope_type,
      scope_id: formData.scope_id,
      notes: formData.notes || undefined,
    };

    await createMutation.mutateAsync(input);
  };

  const handleToggleStatus = async (assignment: RoleAssignment) => {
    const newStatus = assignment.status === 'active' ? 'disabled' : 'active';
    await updateMutation.mutateAsync({
      id: assignment.id,
      input: { status: newStatus },
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>;
  };

  const getRoleBadge = (roleName: string) => {
    const colorMap: Record<string, string> = {
      [ROLE_NAMES.SUPER_ADMIN]: 'bg-destructive/20 text-destructive',
      [ROLE_NAMES.SITE_ADMIN]: 'bg-primary/20 text-primary',
      [ROLE_NAMES.DOMAIN_ADMIN]: 'bg-accent text-accent-foreground',
      [ROLE_NAMES.INFRA_OPERATOR]: 'bg-secondary text-secondary-foreground',
      [ROLE_NAMES.VIEWER]: 'bg-muted text-muted-foreground',
      [ROLE_NAMES.AUDITOR]: 'bg-primary/10 text-primary',
    };
    return <Badge className={cn(colorMap[roleName] || 'bg-muted')}>{getRoleDisplayName(roleName as RoleName)}</Badge>;
  };

  // Check permissions
  const canManage = isSuperAdmin || (selectedSite && canManageRBAC);

  if (!isSuperAdmin && !selectedSite) {
    return <NoSiteSelected />;
  }

  const isLoading = rolesLoading || assignmentsLoading || permissionsLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Role Assignments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user access and permissions across sites, domains, and clusters
          </p>
        </div>
        {canManage && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); loadScopeOptions('site'); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Role Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Search */}
                <div>
                  <Label>User *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        searchUsers(e.target.value);
                      }}
                    />
                    {loadingUsers && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {userOptions.length > 0 && (
                    <div className="mt-1 border rounded-md max-h-40 overflow-y-auto">
                      {userOptions.map(user => (
                        <div
                          key={user.id}
                          className={cn(
                            "px-3 py-2 cursor-pointer hover:bg-accent",
                            formData.user_id === user.user_id && "bg-accent"
                          )}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, user_id: user.user_id }));
                            setUserSearch(user.full_name || user.email);
                            setUserOptions([]);
                          }}
                        >
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  <Label>Role *</Label>
                  <Select value={formData.role_id} onValueChange={(val) => setFormData(prev => ({ ...prev, role_id: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {getRoleDisplayName(role.name as any)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Scope Type */}
                <div>
                  <Label>Scope Type *</Label>
                  <Select value={formData.scope_type} onValueChange={(val) => handleScopeTypeChange(val as ScopeType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="cluster">Cluster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scope Entity */}
                <div>
                  <Label>{getScopeTypeDisplayName(formData.scope_type)} *</Label>
                  <Select value={formData.scope_id} onValueChange={(val) => setFormData(prev => ({ ...prev, scope_id: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${formData.scope_type}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes about this assignment..."
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Assignment'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Read-only notice */}
      {!canManage && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            You have view-only access to role assignments. Contact a Site Administrator to modify permissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {assignments.filter(a => a.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {assignments.filter(a => a.status === 'disabled').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(assignments.map(a => a.user_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.values(ROLE_NAMES).map(role => (
                <SelectItem key={role} value={role}>{getRoleDisplayName(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterScopeType} onValueChange={setFilterScopeType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="site">Site</SelectItem>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="cluster">Cluster</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No role assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map(assignment => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.user_full_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{assignment.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(assignment.role_name || '')}</TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline">{getScopeTypeDisplayName(assignment.scope_type as ScopeType)}</Badge>
                            <div className="text-xs text-muted-foreground mt-1">{assignment.scope_name || assignment.scope_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(assignment.granted_at), 'MMM d, yyyy')}
                          </div>
                          {assignment.granted_by_name && (
                            <div className="text-xs text-muted-foreground">
                              by {assignment.granted_by_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/rbac/users/${assignment.user_id}`)}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(assignment)}
                                disabled={updateMutation.isPending}
                              >
                                {assignment.status === 'active' ? (
                                  <ShieldX className="h-4 w-4 text-destructive" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataPagination
                currentPage={currentPage}
                totalItems={filteredAssignments.length}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleAssignments;
