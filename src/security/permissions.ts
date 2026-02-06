/**
 * Permission Engine - TypeScript permission checking
 * UI gating (UX only) - Database RLS is the enforcement layer
 * 
 * Uses permission keys from permissionKeys.ts for consistent capability checking.
 */

import { ROLE_NAMES, roleHasPermission, ROLE_PERMISSIONS } from './roles';
import { PERMISSION_KEYS, WILDCARD_PERMISSION, type PermissionKey } from './permissionKeys';
import type { RoleName, ScopeType } from './roles';
import type { MyRoleAssignment } from '@/services/rbacService';

// ============================================================
// CONFIGURATION
// ============================================================

/**
 * Legacy fallback configuration
 * TODO: Set to false and remove after full RBAC migration is complete
 * Legacy fallback is restricted to view-only permissions for security
 */
const ENABLE_LEGACY_FALLBACK = true;
const LEGACY_FALLBACK_VIEW_ONLY = true; // Legacy can only grant view permissions

// ============================================================
// TYPES
// ============================================================

export interface PermissionContext {
  isSuperAdmin: boolean;
  assignments: MyRoleAssignment[];
}

export interface ScopeContext {
  siteId?: string;
  domainId?: string;
  clusterId?: string;
}

export interface SiteCapabilities {
  canView: boolean;
  canManage: boolean;
  canManageResources: boolean;
  canManageRBAC: boolean;
  canViewAudit: boolean;
  canExportAudit: boolean;
  highestRole: RoleName | null;
}

export interface NavVisibility {
  dashboard: boolean;
  domainSummary: boolean;
  datacenter: boolean;
  noc: boolean;
  resources: boolean;
  servers: boolean;
  employees: boolean;
  employeePermissions: boolean;
  vacations: boolean;
  licenses: boolean;
  tasks: boolean;
  vault: boolean;
  privateVault: boolean;
  itTools: boolean;
  onCall: boolean;
  maintenance: boolean;
  lifecycle: boolean;
  fileShares: boolean;
  scanAgents: boolean;
  networks: boolean;
  networkScan: boolean;
  webApps: boolean;
  employeeReports: boolean;
  procurement: boolean;
  reports: boolean;
  auditLog: boolean;
  systemHealth: boolean;
  settings: boolean;
  rbacAdmin: boolean;
}

// ============================================================
// CONTEXT CREATION
// ============================================================

/**
 * Create a permission context from role assignments
 */
export function createPermissionContext(
  assignments: MyRoleAssignment[],
  legacyIsSuperAdmin = false
): PermissionContext {
  const hasSuperAdminAssignment = assignments.some(
    a => a.role_name === ROLE_NAMES.SUPER_ADMIN && a.status === 'active'
  );

  return {
    isSuperAdmin: hasSuperAdminAssignment || (ENABLE_LEGACY_FALLBACK && legacyIsSuperAdmin),
    assignments: assignments.filter(a => a.status === 'active'),
  };
}

// ============================================================
// CORE PERMISSION CHECK
// ============================================================

/**
 * Check if user has a specific permission key for a given scope
 * This is the primary permission checking function.
 */
export function hasPermission(
  ctx: PermissionContext,
  permissionKey: PermissionKey,
  scope: ScopeContext
): boolean {
  // SuperAdmin has all permissions
  if (ctx.isSuperAdmin) return true;

  // Check legacy fallback restrictions
  if (ENABLE_LEGACY_FALLBACK && LEGACY_FALLBACK_VIEW_ONLY) {
    // Legacy can only grant view permissions
    if (permissionKey.endsWith('.manage') || permissionKey.endsWith('.sync')) {
      // Must have explicit RBAC assignment for manage permissions
    }
  }

  // Find assignments that cover the requested scope
  const relevantAssignments = ctx.assignments.filter(a => {
    // Direct scope match
    if (scope.siteId && a.scope_type === 'site' && a.scope_id === scope.siteId) return true;
    if (scope.domainId && a.scope_type === 'domain' && a.scope_id === scope.domainId) return true;
    if (scope.clusterId && a.scope_type === 'cluster' && a.scope_id === scope.clusterId) return true;
    
    // Hierarchical: site assignment covers domains/clusters under it
    if (scope.siteId && a.owning_site_id === scope.siteId) return true;
    if (a.scope_type === 'site' && a.scope_id === scope.siteId) return true;
    
    return false;
  });

  // Check if any relevant assignment grants the permission
  return relevantAssignments.some(a => {
    const roleName = a.role_name as RoleName;
    return roleHasPermission(roleName, permissionKey);
  });
}

/**
 * Get all effective permissions for a scope
 */
export function getEffectivePermissions(
  ctx: PermissionContext,
  scope: ScopeContext
): PermissionKey[] {
  if (ctx.isSuperAdmin) {
    return Object.values(PERMISSION_KEYS);
  }

  const permissions = new Set<PermissionKey>();

  // Find assignments covering the scope
  const relevantAssignments = ctx.assignments.filter(a => {
    if (scope.siteId && a.scope_type === 'site' && a.scope_id === scope.siteId) return true;
    if (scope.domainId && a.scope_type === 'domain' && a.scope_id === scope.domainId) return true;
    if (scope.clusterId && a.scope_type === 'cluster' && a.scope_id === scope.clusterId) return true;
    if (scope.siteId && a.owning_site_id === scope.siteId) return true;
    return false;
  });

  // Collect permissions from all roles
  for (const a of relevantAssignments) {
    const roleName = a.role_name as RoleName;
    const rolePerms = ROLE_PERMISSIONS[roleName] || [];
    
    if (rolePerms.includes(WILDCARD_PERMISSION)) {
      return Object.values(PERMISSION_KEYS);
    }
    
    for (const perm of rolePerms) {
      if (perm !== WILDCARD_PERMISSION) {
        permissions.add(perm);
      }
    }
  }

  return Array.from(permissions);
}

// ============================================================
// NAVIGATION VISIBILITY
// ============================================================

/**
 * Get navigation visibility based on permissions for selected scope
 */
export function getNavVisibility(
  ctx: PermissionContext,
  selectedSiteId?: string,
  legacyIsAdmin = false
): NavVisibility {
  const scope: ScopeContext = { siteId: selectedSiteId };
  
  // Helper to check permission with legacy fallback
  const check = (key: PermissionKey, legacyAdminRequired = false): boolean => {
    if (ctx.isSuperAdmin) return true;
    
    // If has RBAC assignment, use it
    if (selectedSiteId && hasPermission(ctx, key, scope)) return true;
    
    // Legacy fallback (view only if restricted)
    if (ENABLE_LEGACY_FALLBACK && !LEGACY_FALLBACK_VIEW_ONLY) {
      return legacyAdminRequired ? legacyIsAdmin : true;
    }
    
    // Legacy view-only fallback
    if (ENABLE_LEGACY_FALLBACK && LEGACY_FALLBACK_VIEW_ONLY && key.endsWith('.view')) {
      return legacyAdminRequired ? legacyIsAdmin : true;
    }
    
    return false;
  };

  return {
    // Always visible
    dashboard: true,
    vacations: true,
    tasks: true,
    privateVault: true,
    itTools: true,
    procurement: true,
    reports: true,
    
    // Inventory
    domainSummary: check(PERMISSION_KEYS.SITE_VIEW, true),
    datacenter: check(PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW, true),
    noc: check(PERMISSION_KEYS.SITE_VIEW, true),
    resources: check(PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW),
    servers: check(PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW),
    networks: check(PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW, true),
    networkScan: check(PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW, true),
    
    // Personnel
    employees: check(PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW, true),
    employeePermissions: ctx.isSuperAdmin, // SuperAdmin only
    employeeReports: check(PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW, true),
    
    // Assets
    licenses: check(PERMISSION_KEYS.ASSETS_LICENSES_VIEW),
    vault: check(PERMISSION_KEYS.ASSETS_VAULT_VIEW),
    
    // Operations
    onCall: check(PERMISSION_KEYS.OPS_ONCALL_VIEW),
    maintenance: check(PERMISSION_KEYS.OPS_MAINTENANCE_VIEW),
    lifecycle: check(PERMISSION_KEYS.OPS_TASKS_VIEW, true),
    
    // Integrations
    fileShares: check(PERMISSION_KEYS.INTEGRATIONS_CONFIGS_VIEW, true),
    scanAgents: check(PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW, true),
    
    // Web Apps
    webApps: check(PERMISSION_KEYS.WEBAPPS_VIEW),
    
    // Governance
    auditLog: check(PERMISSION_KEYS.GOV_AUDIT_VIEW, true),
    
    // Administration
    systemHealth: check(PERMISSION_KEYS.ADMIN_SETTINGS_VIEW, true),
    settings: check(PERMISSION_KEYS.ADMIN_SETTINGS_VIEW, true),
    rbacAdmin: hasPermission(ctx, PERMISSION_KEYS.ADMIN_RBAC_VIEW, scope) || ctx.isSuperAdmin,
  };
}

// ============================================================
// SITE-LEVEL PERMISSION SHORTCUTS
// ============================================================

export function canViewSite(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.SITE_VIEW, { siteId });
}

export function canManageSite(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.SITE_MANAGE, { siteId });
}

// ============================================================
// DOMAIN-LEVEL PERMISSION SHORTCUTS
// ============================================================

export function canViewDomain(ctx: PermissionContext, domainId: string, owningSiteId?: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.DOMAIN_VIEW, { domainId, siteId: owningSiteId });
}

export function canManageDomain(ctx: PermissionContext, domainId: string, owningSiteId?: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.DOMAIN_MANAGE, { domainId, siteId: owningSiteId });
}

// ============================================================
// CLUSTER-LEVEL PERMISSION SHORTCUTS
// ============================================================

export function canViewCluster(ctx: PermissionContext, clusterId: string, owningSiteId?: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.CLUSTER_VIEW, { clusterId, siteId: owningSiteId });
}

export function canManageCluster(ctx: PermissionContext, clusterId: string, owningSiteId?: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.CLUSTER_MANAGE, { clusterId, siteId: owningSiteId });
}

// ============================================================
// RESOURCE PERMISSION SHORTCUTS
// ============================================================

export function canViewResources(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW, { siteId });
}

export function canManageResources(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE, { siteId });
}

// ============================================================
// RBAC PERMISSION SHORTCUTS
// ============================================================

export function canViewRBAC(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.ADMIN_RBAC_VIEW, { siteId });
}

export function canManageRBAC(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.ADMIN_RBAC_MANAGE, { siteId });
}

export function canAccessRBACAdmin(ctx: PermissionContext): boolean {
  if (ctx.isSuperAdmin) return true;
  
  // Any SiteAdmin can access RBAC admin (scoped to their sites)
  return ctx.assignments.some(a => 
    a.scope_type === 'site' && a.role_name === ROLE_NAMES.SITE_ADMIN
  );
}

// ============================================================
// AUDIT PERMISSION SHORTCUTS
// ============================================================

export function canViewAudit(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.GOV_AUDIT_VIEW, { siteId });
}

export function canExportAudit(ctx: PermissionContext, siteId: string): boolean {
  return hasPermission(ctx, PERMISSION_KEYS.GOV_AUDIT_EXPORT, { siteId });
}

// ============================================================
// CAPABILITY AGGREGATION
// ============================================================

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

  const scope = { siteId };

  return {
    canView: hasPermission(ctx, PERMISSION_KEYS.SITE_VIEW, scope),
    canManage: hasPermission(ctx, PERMISSION_KEYS.SITE_MANAGE, scope),
    canManageResources: hasPermission(ctx, PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE, scope),
    canManageRBAC: hasPermission(ctx, PERMISSION_KEYS.ADMIN_RBAC_MANAGE, scope),
    canViewAudit: hasPermission(ctx, PERMISSION_KEYS.GOV_AUDIT_VIEW, scope),
    canExportAudit: hasPermission(ctx, PERMISSION_KEYS.GOV_AUDIT_EXPORT, scope),
    highestRole,
  };
}

export function getAccessibleSiteIds(ctx: PermissionContext): string[] {
  if (ctx.isSuperAdmin) {
    return []; // Empty signals "all sites"
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

export function hasAnyAdminRole(ctx: PermissionContext): boolean {
  if (ctx.isSuperAdmin) return true;

  const adminRoles: RoleName[] = [ROLE_NAMES.SITE_ADMIN, ROLE_NAMES.DOMAIN_ADMIN, ROLE_NAMES.INFRA_OPERATOR];
  
  return ctx.assignments.some(a => 
    adminRoles.includes(a.role_name as RoleName)
  );
}

export function isViewerOnly(ctx: PermissionContext, siteId: string): boolean {
  if (ctx.isSuperAdmin) return false;
  
  const scope = { siteId };
  return !hasPermission(ctx, PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE, scope) &&
         !hasPermission(ctx, PERMISSION_KEYS.SITE_MANAGE, scope);
}
