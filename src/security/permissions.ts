/**
 * Permission Engine - TypeScript permission checking
 * UI gating (UX only) - Database RLS is the enforcement layer
 */

import { ROLE_NAMES, CAPABILITIES, roleHasCapability } from './roles';
import type { RoleName, ScopeType, Capability } from './roles';
import type { MyRoleAssignment } from '@/services/rbacService';

export interface PermissionContext {
  isSuperAdmin: boolean;
  assignments: MyRoleAssignment[];
}

/**
 * Create a permission context from role assignments
 */
export function createPermissionContext(
  assignments: MyRoleAssignment[],
  legacyIsSuperAdmin = false
): PermissionContext {
  // Check if any assignment is SuperAdmin
  const hasSuperAdminAssignment = assignments.some(
    a => a.role_name === ROLE_NAMES.SUPER_ADMIN && a.status === 'active'
  );

  return {
    isSuperAdmin: legacyIsSuperAdmin || hasSuperAdminAssignment,
    assignments: assignments.filter(a => a.status === 'active'),
  };
}

// ============================================================
// SITE-LEVEL PERMISSIONS
// ============================================================

/**
 * Check if user can view a specific site
 */
export function canViewSite(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    // Direct site assignment
    if (a.scope_type === 'site' && a.scope_id === siteId) return true;
    // Domain/Cluster under this site
    if (a.owning_site_id === siteId) return true;
    return false;
  });
}

/**
 * Check if user can manage a specific site
 */
export function canManageSite(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    if (a.scope_type !== 'site' || a.scope_id !== siteId) return false;
    const roleName = a.role_name as RoleName;
    return roleName === ROLE_NAMES.SITE_ADMIN || roleName === ROLE_NAMES.INFRA_OPERATOR;
  });
}

// ============================================================
// DOMAIN-LEVEL PERMISSIONS
// ============================================================

/**
 * Check if user can view a specific domain
 */
export function canViewDomain(ctx: PermissionContext, domainId: string, owningSiteId?: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    // Direct domain assignment
    if (a.scope_type === 'domain' && a.scope_id === domainId) return true;
    // Site-level assignment on owning site
    if (a.scope_type === 'site' && owningSiteId && a.scope_id === owningSiteId) return true;
    return false;
  });
}

/**
 * Check if user can manage a specific domain
 */
export function canManageDomain(ctx: PermissionContext, domainId: string, owningSiteId?: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    const roleName = a.role_name as RoleName;
    
    // Direct domain assignment with manage capability
    if (a.scope_type === 'domain' && a.scope_id === domainId) {
      return roleName === ROLE_NAMES.DOMAIN_ADMIN || roleName === ROLE_NAMES.INFRA_OPERATOR;
    }
    
    // Site-level assignment on owning site
    if (a.scope_type === 'site' && owningSiteId && a.scope_id === owningSiteId) {
      return roleName === ROLE_NAMES.SITE_ADMIN || roleName === ROLE_NAMES.INFRA_OPERATOR;
    }
    
    return false;
  });
}

// ============================================================
// CLUSTER-LEVEL PERMISSIONS
// ============================================================

/**
 * Check if user can view a specific cluster
 */
export function canViewCluster(ctx: PermissionContext, clusterId: string, owningSiteId?: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    // Direct cluster assignment
    if (a.scope_type === 'cluster' && a.scope_id === clusterId) return true;
    // Site-level assignment on owning site
    if (a.scope_type === 'site' && owningSiteId && a.scope_id === owningSiteId) return true;
    return false;
  });
}

/**
 * Check if user can manage a specific cluster
 */
export function canManageCluster(ctx: PermissionContext, clusterId: string, owningSiteId?: string): boolean {
  if (ctx.isSuperAdmin) return true;

  const manageRoles: RoleName[] = [ROLE_NAMES.SITE_ADMIN, ROLE_NAMES.DOMAIN_ADMIN, ROLE_NAMES.INFRA_OPERATOR];
  
  return ctx.assignments.some(a => {
    const roleName = a.role_name as RoleName;
    
    // Direct cluster assignment with manage capability
    if (a.scope_type === 'cluster' && a.scope_id === clusterId) {
      return manageRoles.includes(roleName);
    }
    
    // Site-level assignment on owning site
    if (a.scope_type === 'site' && owningSiteId && a.scope_id === owningSiteId) {
      return roleName === ROLE_NAMES.SITE_ADMIN || roleName === ROLE_NAMES.INFRA_OPERATOR;
    }
    
    return false;
  });
}

// ============================================================
// RESOURCE PERMISSIONS
// ============================================================

/**
 * Check if user can view resources in a site
 */
export function canViewResources(ctx: PermissionContext, siteId: string): boolean {
  return canViewSite(ctx, siteId);
}

/**
 * Check if user can manage resources in a site
 */
export function canManageResources(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    const roleName = a.role_name as RoleName;
    const hasManageCapability = roleHasCapability(roleName, CAPABILITIES.RESOURCE_MANAGE);
    
    // Check if assignment covers this site
    if (a.scope_type === 'site' && a.scope_id === siteId) {
      return hasManageCapability;
    }
    
    // Check if assignment's owning site matches
    if (a.owning_site_id === siteId) {
      return hasManageCapability;
    }
    
    return false;
  });
}

// ============================================================
// RBAC MANAGEMENT PERMISSIONS
// ============================================================

/**
 * Check if user can manage RBAC (role assignments) for a site
 */
export function canManageRBAC(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    if (a.scope_type !== 'site' || a.scope_id !== siteId) return false;
    return a.role_name === ROLE_NAMES.SITE_ADMIN;
  });
}

/**
 * Check if user can access RBAC admin pages globally
 */
export function canAccessRBACAdmin(ctx: PermissionContext): boolean {
  if (ctx.isSuperAdmin) return true;

  // Any SiteAdmin can access RBAC admin (scoped to their sites)
  return ctx.assignments.some(a => 
    a.scope_type === 'site' && a.role_name === ROLE_NAMES.SITE_ADMIN
  );
}

// ============================================================
// AUDIT PERMISSIONS
// ============================================================

/**
 * Check if user can view audit logs for a site
 */
export function canViewAudit(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    const roleName = a.role_name as RoleName;
    const hasAuditCapability = roleHasCapability(roleName, CAPABILITIES.AUDIT_VIEW);
    
    // Check if assignment covers this site
    if (a.scope_type === 'site' && a.scope_id === siteId) {
      return hasAuditCapability;
    }
    
    return false;
  });
}

/**
 * Check if user can export audit logs
 */
export function canExportAudit(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return true;

  return ctx.assignments.some(a => {
    const roleName = a.role_name as RoleName;
    const hasExportCapability = roleHasCapability(roleName, CAPABILITIES.AUDIT_EXPORT);
    
    if (a.scope_type === 'site' && a.scope_id === siteId) {
      return hasExportCapability;
    }
    
    return false;
  });
}

// ============================================================
// CAPABILITY AGGREGATION
// ============================================================

export interface SiteCapabilities {
  canView: boolean;
  canManage: boolean;
  canManageResources: boolean;
  canManageRBAC: boolean;
  canViewAudit: boolean;
  canExportAudit: boolean;
  highestRole: RoleName | null;
}

/**
 * Get aggregated capabilities for a specific site
 */
export function getSiteCapabilities(ctx: PermissionContext, siteId: string): SiteCapabilities {
  if (ctx.isSuperAdmin) {
    return {
      canView: true,
      canManage: true,
      canManageResources: true,
      canManageRBAC: true,
      canViewAudit: true,
      canExportAudit: true,
      highestRole: ROLE_NAMES.SUPER_ADMIN,
    };
  }

  // Find highest role for this site
  let highestRole: RoleName | null = null;
  const roleHierarchy: RoleName[] = [
    ROLE_NAMES.VIEWER,
    ROLE_NAMES.AUDITOR,
    ROLE_NAMES.INFRA_OPERATOR,
    ROLE_NAMES.DOMAIN_ADMIN,
    ROLE_NAMES.SITE_ADMIN,
    ROLE_NAMES.SUPER_ADMIN,
  ];

  for (const assignment of ctx.assignments) {
    if (assignment.scope_type === 'site' && assignment.scope_id === siteId) {
      const roleName = assignment.role_name as RoleName;
      const currentIndex = highestRole ? roleHierarchy.indexOf(highestRole) : -1;
      const newIndex = roleHierarchy.indexOf(roleName);
      if (newIndex > currentIndex) {
        highestRole = roleName;
      }
    }
  }

  return {
    canView: canViewSite(ctx, siteId),
    canManage: canManageSite(ctx, siteId),
    canManageResources: canManageResources(ctx, siteId),
    canManageRBAC: canManageRBAC(ctx, siteId),
    canViewAudit: canViewAudit(ctx, siteId),
    canExportAudit: canExportAudit(ctx, siteId),
    highestRole,
  };
}

/**
 * Get all accessible site IDs for the user
 */
export function getAccessibleSiteIds(ctx: PermissionContext): string[] {
  if (ctx.isSuperAdmin) {
    // SuperAdmin has access to all - return empty to signal "all"
    return [];
  }

  const siteIds = new Set<string>();
  
  for (const assignment of ctx.assignments) {
    if (assignment.scope_type === 'site') {
      siteIds.add(assignment.scope_id);
    } else if (assignment.owning_site_id) {
      siteIds.add(assignment.owning_site_id);
    }
  }

  return Array.from(siteIds);
}

/**
 * Check if user has any admin role (for navigation gating)
 */
export function hasAnyAdminRole(ctx: PermissionContext): boolean {
  if (ctx.isSuperAdmin) return true;

  const adminRoles: RoleName[] = [ROLE_NAMES.SITE_ADMIN, ROLE_NAMES.DOMAIN_ADMIN, ROLE_NAMES.INFRA_OPERATOR];
  
  return ctx.assignments.some(a => 
    adminRoles.includes(a.role_name as RoleName)
  );
}

/**
 * Check if user is viewer only (read-only access)
 */
export function isViewerOnly(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return false;

  // Check if they have any manage capability for this site
  return !canManageSite(ctx, siteId) && !canManageResources(ctx, siteId);
}
