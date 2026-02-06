/**
 * RBAC Permissions Hook
 * Provides reactive permission checking for UI components using permission keys
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { fetchMyRoleAssignments } from '@/services/rbacService';
import { PERMISSION_KEYS, type PermissionKey } from '@/security/permissionKeys';
import {
  createPermissionContext,
  hasPermission,
  getEffectivePermissions,
  getNavVisibility,
  canViewSite,
  canManageSite,
  canViewResources,
  canManageResources,
  canViewRBAC,
  canManageRBAC,
  canAccessRBACAdmin,
  canViewAudit,
  canExportAudit,
  getSiteCapabilities,
  hasAnyAdminRole,
  isViewerOnly,
  type PermissionContext,
  type SiteCapabilities,
  type NavVisibility,
  type ScopeContext,
} from '@/security/permissions';

export interface UsePermissionsResult {
  // Loading state
  isLoading: boolean;
  
  // Permission context (for custom checks)
  context: PermissionContext | null;
  
  // Site-specific capabilities (based on selected site)
  capabilities: SiteCapabilities | null;
  
  // Navigation visibility
  navVisibility: NavVisibility;
  
  // Quick checks for selected site
  canView: boolean;
  canManage: boolean;
  canManageResources: boolean;
  canManageRBAC: boolean;
  canViewAudit: boolean;
  canExportAudit: boolean;
  isViewerOnly: boolean;
  
  // Global checks
  isSuperAdmin: boolean;
  hasAdminRole: boolean;
  canAccessRBACAdmin: boolean;
  
  // Permission key based checks
  hasPermission: (key: PermissionKey, scope?: ScopeContext) => boolean;
  getEffectivePermissions: (scope?: ScopeContext) => PermissionKey[];
  
  // Helpers for specific scopes
  checkSiteAccess: (siteId: string) => boolean;
  checkSiteManage: (siteId: string) => boolean;
  checkResourceManage: (siteId: string) => boolean;
  checkRBACView: (siteId: string) => boolean;
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

  // Navigation visibility
  const navVisibility = useMemo(() => {
    if (!context) {
      // Default visibility based on legacy
      return getNavVisibility(
        { isSuperAdmin: legacyIsSuperAdmin, assignments: [] },
        selectedSite?.id,
        legacyIsAdmin
      );
    }
    return getNavVisibility(context, selectedSite?.id, legacyIsAdmin);
  }, [context, selectedSite, legacyIsAdmin, legacyIsSuperAdmin]);

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

  const canExportAuditValue = useMemo(() => {
    if (!context || !selectedSite) return legacyIsSuperAdmin;
    return canExportAudit(context, selectedSite.id);
  }, [context, selectedSite, legacyIsSuperAdmin]);

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

  // Permission key based check
  const checkPermission = useCallback((key: PermissionKey, scope?: ScopeContext): boolean => {
    if (!context) return false;
    const effectiveScope = scope || { siteId: selectedSite?.id };
    return hasPermission(context, key, effectiveScope);
  }, [context, selectedSite]);

  // Get effective permissions for scope
  const getEffectivePerms = useCallback((scope?: ScopeContext): PermissionKey[] => {
    if (!context) return [];
    const effectiveScope = scope || { siteId: selectedSite?.id };
    return getEffectivePermissions(context, effectiveScope);
  }, [context, selectedSite]);

  // Helper functions for specific scope checks
  const checkSiteAccess = useCallback((siteId: string): boolean => {
    if (!context) return legacyIsAdmin;
    return canViewSite(context, siteId);
  }, [context, legacyIsAdmin]);

  const checkSiteManage = useCallback((siteId: string): boolean => {
    if (!context) return legacyIsSuperAdmin;
    return canManageSite(context, siteId);
  }, [context, legacyIsSuperAdmin]);

  const checkResourceManage = useCallback((siteId: string): boolean => {
    if (!context) return legacyIsAdmin;
    return canManageResources(context, siteId);
  }, [context, legacyIsAdmin]);

  const checkRBACView = useCallback((siteId: string): boolean => {
    if (!context) return legacyIsSuperAdmin;
    return canViewRBAC(context, siteId);
  }, [context, legacyIsSuperAdmin]);

  const checkRBACManage = useCallback((siteId: string): boolean => {
    if (!context) return legacyIsSuperAdmin;
    return canManageRBAC(context, siteId);
  }, [context, legacyIsSuperAdmin]);

  const handleRefetch = useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
  }, [refetch, queryClient]);

  return {
    isLoading,
    context,
    capabilities,
    navVisibility,
    canView,
    canManage,
    canManageResources: canManageResourcesValue,
    canManageRBAC: canManageRBACValue,
    canViewAudit: canViewAuditValue,
    canExportAudit: canExportAuditValue,
    isViewerOnly: isViewerOnlyValue,
    isSuperAdmin: context?.isSuperAdmin ?? legacyIsSuperAdmin,
    hasAdminRole,
    canAccessRBACAdmin: canAccessRBACAdminValue,
    hasPermission: checkPermission,
    getEffectivePermissions: getEffectivePerms,
    checkSiteAccess,
    checkSiteManage,
    checkResourceManage,
    checkRBACView,
    checkRBACManage,
    refetch: handleRefetch,
  };
}

// Re-export permission keys for convenience
export { PERMISSION_KEYS } from '@/security/permissionKeys';
export type { PermissionKey } from '@/security/permissionKeys';
