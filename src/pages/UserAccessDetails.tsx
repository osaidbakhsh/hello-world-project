import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { fetchUserRoleAssignments, fetchRoles, type RoleAssignment, type Role } from '@/services/rbacService';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_NAMES, getRoleDisplayName, getScopeTypeDisplayName, getRolePermissionKeys, type ScopeType, type RoleName } from '@/security/roles';
import { getPermissionDisplayName, getPermissionGroup } from '@/security/permissionKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Shield, Building, FolderTree, Server, Key, Mail, Calendar, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  phone: string | null;
  created_at: string;
}

const UserAccessDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isSuperAdmin, canAccessRBACAdmin } = usePermissions();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  // Fetch user's role assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['user-role-assignments', userId],
    queryFn: () => fetchUserRoleAssignments(userId!),
    enabled: !!userId,
  });

  // Fetch roles for reference
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  // Compute effective access summary
  const accessSummary = useMemo(() => {
    const sites = new Set<string>();
    const domains = new Set<string>();
    const clusters = new Set<string>();
    const allPermissions = new Set<string>();

    const activeAssignments = assignments.filter(a => a.status === 'active');

    for (const a of activeAssignments) {
      if (a.scope_type === 'site') sites.add(a.scope_id);
      if (a.scope_type === 'domain') domains.add(a.scope_id);
      if (a.scope_type === 'cluster') clusters.add(a.scope_id);

      // Get permissions from role
      const roleName = a.role_name as RoleName;
      const perms = getRolePermissionKeys(roleName);
      perms.forEach(p => allPermissions.add(p));
    }

    // Group permissions by module
    const permissionsByGroup: Record<string, string[]> = {};
    allPermissions.forEach(p => {
      const group = getPermissionGroup(p as any);
      if (!permissionsByGroup[group]) permissionsByGroup[group] = [];
      permissionsByGroup[group].push(p);
    });

    // Find highest role
    let highestRole: RoleName | null = null;
    const roleHierarchy: RoleName[] = [ROLE_NAMES.VIEWER, ROLE_NAMES.AUDITOR, ROLE_NAMES.INFRA_OPERATOR, ROLE_NAMES.DOMAIN_ADMIN, ROLE_NAMES.SITE_ADMIN, ROLE_NAMES.SUPER_ADMIN];
    
    for (const a of activeAssignments) {
      const roleName = a.role_name as RoleName;
      if (roleHierarchy.includes(roleName)) {
        const currentIdx = highestRole ? roleHierarchy.indexOf(highestRole) : -1;
        const newIdx = roleHierarchy.indexOf(roleName);
        if (newIdx > currentIdx) {
          highestRole = roleName;
        }
      }
    }

    return {
      siteCount: sites.size,
      domainCount: domains.size,
      clusterCount: clusters.size,
      totalPermissions: allPermissions.size,
      permissionsByGroup,
      highestRole,
    };
  }, [assignments]);

  const getRoleBadge = (roleName: string) => {
    const colorMap: Record<string, string> = {
      [ROLE_NAMES.SUPER_ADMIN]: 'bg-destructive/20 text-destructive',
      [ROLE_NAMES.SITE_ADMIN]: 'bg-primary/20 text-primary',
      [ROLE_NAMES.DOMAIN_ADMIN]: 'bg-accent text-accent-foreground',
      [ROLE_NAMES.INFRA_OPERATOR]: 'bg-secondary text-secondary-foreground',
      [ROLE_NAMES.VIEWER]: 'bg-muted text-muted-foreground',
      [ROLE_NAMES.AUDITOR]: 'bg-primary/10 text-primary',
    };
    return <Badge className={cn(colorMap[roleName] || 'bg-muted')}>{getRoleDisplayName(roleName as any)}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>;
  };

  if (!canAccessRBACAdmin && !isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>You don't have permission to view this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading = profileLoading || assignmentsLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/rbac')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">User Access Details</h1>
          <p className="text-sm text-muted-foreground">View and manage user permissions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : profile ? (
        <>
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{profile.full_name || 'Unknown'}</h3>
                    {accessSummary.highestRole && getRoleBadge(accessSummary.highestRole)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {profile.email}
                  </div>
                  {profile.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {profile.department}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Legacy Role</div>
                  <Badge variant="outline">{profile.role || 'None'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accessSummary.siteCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Domains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accessSummary.domainCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Clusters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accessSummary.clusterCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{accessSummary.totalPermissions}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Assignments and Permissions */}
          <Tabs defaultValue="assignments">
            <TabsList>
              <TabsTrigger value="assignments">Role Assignments</TabsTrigger>
              <TabsTrigger value="permissions">Effective Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Role Assignments ({assignments.length})</CardTitle>
                  <CardDescription>All role assignments for this user</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Granted</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No role assignments found
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignments.map(a => (
                          <TableRow key={a.id} className={a.status === 'disabled' ? 'opacity-50' : ''}>
                            <TableCell>{getRoleBadge(a.role_name || '')}</TableCell>
                            <TableCell>
                              <div>
                                <Badge variant="outline">{getScopeTypeDisplayName(a.scope_type as ScopeType)}</Badge>
                                <div className="text-xs text-muted-foreground mt-1">{a.scope_name || a.scope_id}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(a.status)}</TableCell>
                            <TableCell>
                              <div className="text-sm">{format(new Date(a.granted_at), 'MMM d, yyyy')}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground max-w-xs truncate">
                                {a.notes || '-'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Effective Permissions</CardTitle>
                  <CardDescription>Aggregated permissions from all active role assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.entries(accessSummary.permissionsByGroup).length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No active permissions
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(accessSummary.permissionsByGroup).map(([group, perms]) => (
                        <div key={group}>
                          <h4 className="font-medium capitalize mb-2">{group}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {perms.map(perm => (
                              <div key={perm} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-600" />
                                <span>{getPermissionDisplayName(perm as any)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default UserAccessDetails;
