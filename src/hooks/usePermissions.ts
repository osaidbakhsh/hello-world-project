/**
 * RBAC Permissions Hook
 * Provides reactive permission checking for UI components
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { fetchMyRoleAssignments } from '@/services/rbacService';
import {
  createPermissionContext,
  canViewSite,
  canManageSite,
  canViewResources,
  canManageResources,
  canManageRBAC,
  canAccessRBACAdmin,
  canViewAudit,
  getSiteCapabilities,
  hasAnyAdminRole,
  isViewerOnly,
  type PermissionContext,
  type SiteCapabilities,
} from '@/security/permissions';

export interface UsePermissionsResult {
  // Loading state
  isLoading: boolean;
  
  // Permission context (for custom checks)
  context: PermissionContext | null;
  
  // Site-specific capabilities (based on selected site)
  capabilities: SiteCapabilities | null;
  
  // Quick checks for selected site
  canView: boolean;
  canManage: boolean;
  canManageResources: boolean;
  canManageRBAC: boolean;
  canViewAudit: boolean;
  isViewerOnly: boolean;
  
  // Global checks
  isSuperAdmin: boolean;
  hasAdminRole: boolean;
  canAccessRBACAdmin: boolean;
  
  // Helpers for specific scopes
  checkSiteAccess: (siteId: string) => boolean;
  checkSiteManage: (siteId: string) => boolean;
  checkResourceManage: (siteId: string) => boolean;
  checkRBACManage: (siteId: string) => boolean;
  
  // Refetch permissions (e.g., after role changes)
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
  const { user, isSuperAdmin: legacyIsSuperAdmin, isAdmin: legacyIsAdmin } = useAuth();
  const { selectedSite } = useSite();
  const queryClient = useQueryClient();

  // Fetch role assignments
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['my-role-assignments', user?.id],
    queryFn: fetchMyRoleAssignments,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Create permission context
  const context = useMemo(() => {
    if (!user) return null;
    return createPermissionContext(assignments, legacyIsSuperAdmin);
  }, [user, assignments, legacyIsSuperAdmin]);

  // Get capabilities for selected site
  const capabilities = useMemo(() => {
    if (!context || !selectedSite) return null;
    return getSiteCapabilities(context, selectedSite.id);
  }, [context, selectedSite]);

  // Computed values for selected site
  const canView = useMemo(() => {
    if (!context || !selectedSite) return legacyIsAdmin;
    return canViewSite(context, selectedSite.id);
  }, [context, selectedSite, legacyIsAdmin]);

  const canManage = useMemo(() => {
    if (!context || !selectedSite) return legacyIsSuperAdmin;
    return canManageSite(context, selectedSite.id);
  }, [context, selectedSite, legacyIsSuperAdmin]);

  const canManageResourcesValue = useMemo(() => {
    if (!context || !selectedSite) return legacyIsAdmin;
    return canManageResources(context, selectedSite.id);
  }, [context, selectedSite, legacyIsAdmin]);

  const canManageRBACValue = useMemo(() => {
    if (!context || !selectedSite) return legacyIsSuperAdmin;
    return canManageRBAC(context, selectedSite.id);
  }, [context, selectedSite, legacyIsSuperAdmin]);

  const canViewAuditValue = useMemo(() => {
    if (!context || !selectedSite) return legacyIsAdmin;
    return canViewAudit(context, selectedSite.id);
  }, [context, selectedSite, legacyIsAdmin]);

  const isViewerOnlyValue = useMemo(() => {
    if (!context || !selectedSite) return !legacyIsAdmin;
    return isViewerOnly(context, selectedSite.id);
  }, [context, selectedSite, legacyIsAdmin]);

  const hasAdminRole = useMemo(() => {
    if (!context) return legacyIsAdmin;
    return hasAnyAdminRole(context);
  }, [context, legacyIsAdmin]);

  const canAccessRBACAdminValue = useMemo(() => {
    if (!context) return legacyIsSuperAdmin;
    return canAccessRBACAdmin(context);
  }, [context, legacyIsSuperAdmin]);

  // Helper functions for specific scope checks
  const checkSiteAccess = (siteId: string): boolean => {
    if (!context) return legacyIsAdmin;
    return canViewSite(context, siteId);
  };

  const checkSiteManage = (siteId: string): boolean => {
    if (!context) return legacyIsSuperAdmin;
    return canManageSite(context, siteId);
  };

  const checkResourceManage = (siteId: string): boolean => {
    if (!context) return legacyIsAdmin;
    return canManageResources(context, siteId);
  };

  const checkRBACManage = (siteId: string): boolean => {
    if (!context) return legacyIsSuperAdmin;
    return canManageRBAC(context, siteId);
  };

  const handleRefetch = async () => {
    await refetch();
    // Also invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
  };

  return {
    isLoading,
    context,
    capabilities,
    canView,
    canManage,
    canManageResources: canManageResourcesValue,
    canManageRBAC: canManageRBACValue,
    canViewAudit: canViewAuditValue,
    isViewerOnly: isViewerOnlyValue,
    isSuperAdmin: context?.isSuperAdmin ?? legacyIsSuperAdmin,
    hasAdminRole,
    canAccessRBACAdmin: canAccessRBACAdminValue,
    checkSiteAccess,
    checkSiteManage,
    checkResourceManage,
    checkRBACManage,
    refetch: handleRefetch,
  };
}
