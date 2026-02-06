/**
 * RBAC Role Definitions and Constants
 * Single source of truth for role names and permission mappings
 */

import { PERMISSION_KEYS, WILDCARD_PERMISSION, type PermissionKey } from './permissionKeys';

// ============================================================
// ROLE NAMES (must match database seed)
// ============================================================

export const ROLE_NAMES = {
  SUPER_ADMIN: 'SuperAdmin',
  SITE_ADMIN: 'SiteAdmin',
  DOMAIN_ADMIN: 'DomainAdmin',
  INFRA_OPERATOR: 'InfraOperator',
  VIEWER: 'Viewer',
  AUDITOR: 'Auditor',
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

// ============================================================
// SCOPE TYPES
// ============================================================

export const SCOPE_TYPES = {
  SITE: 'site',
  DOMAIN: 'domain',
  CLUSTER: 'cluster',
} as const;

export type ScopeType = typeof SCOPE_TYPES[keyof typeof SCOPE_TYPES];

// ============================================================
// ROLE → PERMISSION KEYS MAPPING
// ============================================================

/**
 * Maps each role to an array of permission keys they have.
 * SuperAdmin uses wildcard '*' for all permissions.
 */
export const ROLE_PERMISSIONS: Record<RoleName, (PermissionKey | typeof WILDCARD_PERMISSION)[]> = {
  [ROLE_NAMES.SUPER_ADMIN]: [WILDCARD_PERMISSION],
  
  [ROLE_NAMES.SITE_ADMIN]: [
    // Full site management
    PERMISSION_KEYS.SITE_VIEW,
    PERMISSION_KEYS.SITE_MANAGE,
    PERMISSION_KEYS.DOMAIN_VIEW,
    PERMISSION_KEYS.DOMAIN_MANAGE,
    PERMISSION_KEYS.CLUSTER_VIEW,
    PERMISSION_KEYS.CLUSTER_MANAGE,
    // All inventory
    PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW,
    PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE,
    PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW,
    PERMISSION_KEYS.INVENTORY_NETWORKS_MANAGE,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_MANAGE,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_MANAGE,
    // Identity
    PERMISSION_KEYS.IDENTITY_DOMAINS_VIEW,
    PERMISSION_KEYS.IDENTITY_DOMAINS_MANAGE,
    PERMISSION_KEYS.IDENTITY_AD_VIEW,
    PERMISSION_KEYS.IDENTITY_AD_SYNC,
    // Integrations
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_MANAGE,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_MANAGE,
    // Operations
    PERMISSION_KEYS.OPS_TASKS_VIEW,
    PERMISSION_KEYS.OPS_TASKS_MANAGE,
    PERMISSION_KEYS.OPS_MAINTENANCE_VIEW,
    PERMISSION_KEYS.OPS_MAINTENANCE_MANAGE,
    PERMISSION_KEYS.OPS_ONCALL_VIEW,
    PERMISSION_KEYS.OPS_ONCALL_MANAGE,
    // Governance
    PERMISSION_KEYS.GOV_AUDIT_VIEW,
    PERMISSION_KEYS.GOV_AUDIT_EXPORT,
    PERMISSION_KEYS.GOV_APPROVALS_VIEW,
    PERMISSION_KEYS.GOV_APPROVALS_MANAGE,
    PERMISSION_KEYS.GOV_NOTIFICATIONS_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_EXPORT,
    // Administration (within site scope)
    PERMISSION_KEYS.ADMIN_RBAC_VIEW,
    PERMISSION_KEYS.ADMIN_RBAC_MANAGE,
    PERMISSION_KEYS.ADMIN_SETTINGS_VIEW,
    PERMISSION_KEYS.ADMIN_SETTINGS_MANAGE,
    PERMISSION_KEYS.ADMIN_USERS_VIEW,
    // Personnel
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW,
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_MANAGE,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_VIEW,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_MANAGE,
    // Assets
    PERMISSION_KEYS.ASSETS_LICENSES_VIEW,
    PERMISSION_KEYS.ASSETS_LICENSES_MANAGE,
    PERMISSION_KEYS.ASSETS_VAULT_VIEW,
    PERMISSION_KEYS.ASSETS_VAULT_MANAGE,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_VIEW,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_MANAGE,
    // Web Apps
    PERMISSION_KEYS.WEBAPPS_VIEW,
    PERMISSION_KEYS.WEBAPPS_MANAGE,
  ],
  
  [ROLE_NAMES.DOMAIN_ADMIN]: [
    // Domain scope
    PERMISSION_KEYS.DOMAIN_VIEW,
    PERMISSION_KEYS.DOMAIN_MANAGE,
    PERMISSION_KEYS.SITE_VIEW, // Can view parent site
    // Identity (primary focus)
    PERMISSION_KEYS.IDENTITY_DOMAINS_VIEW,
    PERMISSION_KEYS.IDENTITY_DOMAINS_MANAGE,
    PERMISSION_KEYS.IDENTITY_AD_VIEW,
    PERMISSION_KEYS.IDENTITY_AD_SYNC,
    // Integrations
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_MANAGE,
    // Limited inventory
    PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW,
    PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE,
    PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW,
    // Governance
    PERMISSION_KEYS.GOV_AUDIT_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_VIEW,
    // Operations read
    PERMISSION_KEYS.OPS_TASKS_VIEW,
    PERMISSION_KEYS.OPS_MAINTENANCE_VIEW,
    // Personnel
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_VIEW,
    // Assets read
    PERMISSION_KEYS.ASSETS_LICENSES_VIEW,
    PERMISSION_KEYS.ASSETS_VAULT_VIEW,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_VIEW,
    // Web Apps
    PERMISSION_KEYS.WEBAPPS_VIEW,
    PERMISSION_KEYS.WEBAPPS_MANAGE,
  ],
  
  [ROLE_NAMES.INFRA_OPERATOR]: [
    // Cluster and site view
    PERMISSION_KEYS.SITE_VIEW,
    PERMISSION_KEYS.CLUSTER_VIEW,
    PERMISSION_KEYS.CLUSTER_MANAGE,
    PERMISSION_KEYS.DOMAIN_VIEW,
    // Full inventory management
    PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW,
    PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE,
    PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW,
    PERMISSION_KEYS.INVENTORY_NETWORKS_MANAGE,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_MANAGE,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_MANAGE,
    // Integrations (agents)
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_MANAGE,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_VIEW,
    // Operations management
    PERMISSION_KEYS.OPS_TASKS_VIEW,
    PERMISSION_KEYS.OPS_TASKS_MANAGE,
    PERMISSION_KEYS.OPS_MAINTENANCE_VIEW,
    PERMISSION_KEYS.OPS_MAINTENANCE_MANAGE,
    PERMISSION_KEYS.OPS_ONCALL_VIEW,
    // Identity read
    PERMISSION_KEYS.IDENTITY_DOMAINS_VIEW,
    PERMISSION_KEYS.IDENTITY_AD_VIEW,
    // Governance read
    PERMISSION_KEYS.GOV_AUDIT_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_VIEW,
    // Personnel read
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_VIEW,
    // Assets read
    PERMISSION_KEYS.ASSETS_LICENSES_VIEW,
    PERMISSION_KEYS.ASSETS_VAULT_VIEW,
    // Web Apps
    PERMISSION_KEYS.WEBAPPS_VIEW,
    PERMISSION_KEYS.WEBAPPS_MANAGE,
  ],
  
  [ROLE_NAMES.VIEWER]: [
    // All view permissions, no manage
    PERMISSION_KEYS.SITE_VIEW,
    PERMISSION_KEYS.DOMAIN_VIEW,
    PERMISSION_KEYS.CLUSTER_VIEW,
    PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW,
    PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW,
    PERMISSION_KEYS.IDENTITY_DOMAINS_VIEW,
    PERMISSION_KEYS.IDENTITY_AD_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_VIEW,
    PERMISSION_KEYS.OPS_TASKS_VIEW,
    PERMISSION_KEYS.OPS_MAINTENANCE_VIEW,
    PERMISSION_KEYS.OPS_ONCALL_VIEW,
    PERMISSION_KEYS.GOV_NOTIFICATIONS_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_VIEW,
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_VIEW,
    PERMISSION_KEYS.ASSETS_LICENSES_VIEW,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_VIEW,
    PERMISSION_KEYS.WEBAPPS_VIEW,
  ],
  
  [ROLE_NAMES.AUDITOR]: [
    // Site view
    PERMISSION_KEYS.SITE_VIEW,
    PERMISSION_KEYS.DOMAIN_VIEW,
    PERMISSION_KEYS.CLUSTER_VIEW,
    // Full audit access
    PERMISSION_KEYS.GOV_AUDIT_VIEW,
    PERMISSION_KEYS.GOV_AUDIT_EXPORT,
    PERMISSION_KEYS.GOV_REPORTS_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_EXPORT,
    PERMISSION_KEYS.GOV_APPROVALS_VIEW,
    // Read-only inventory
    PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW,
    PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW,
    // Read-only identity
    PERMISSION_KEYS.IDENTITY_DOMAINS_VIEW,
    PERMISSION_KEYS.IDENTITY_AD_VIEW,
    // Read-only operations
    PERMISSION_KEYS.OPS_TASKS_VIEW,
    PERMISSION_KEYS.OPS_MAINTENANCE_VIEW,
    PERMISSION_KEYS.OPS_ONCALL_VIEW,
    // Personnel read
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW,
    // Assets read
    PERMISSION_KEYS.ASSETS_LICENSES_VIEW,
    PERMISSION_KEYS.ASSETS_VAULT_VIEW,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_VIEW,
    // Web Apps read
    PERMISSION_KEYS.WEBAPPS_VIEW,
  ],
};

// ============================================================
// ROLE HIERARCHY (higher index = more permissions)
// ============================================================

export const ROLE_HIERARCHY: RoleName[] = [
  ROLE_NAMES.VIEWER,
  ROLE_NAMES.AUDITOR,
  ROLE_NAMES.INFRA_OPERATOR,
  ROLE_NAMES.DOMAIN_ADMIN,
  ROLE_NAMES.SITE_ADMIN,
  ROLE_NAMES.SUPER_ADMIN,
];

// ============================================================
// LEGACY CAPABILITIES (for backward compatibility during migration)
// ============================================================

/**
 * @deprecated Use ROLE_PERMISSIONS with permission keys instead
 * TODO: Remove after full RBAC migration is complete
 */
export const CAPABILITIES = {
  ALL: '*',
  SITE_VIEW: 'site.view',
  SITE_MANAGE: 'site.manage',
  DOMAIN_VIEW: 'domain.view',
  DOMAIN_MANAGE: 'domain.manage',
  CLUSTER_VIEW: 'cluster.view',
  CLUSTER_MANAGE: 'cluster.manage',
  RESOURCE_VIEW: 'resource.view',
  RESOURCE_MANAGE: 'resource.manage',
  RBAC_MANAGE: 'rbac.manage',
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',
} as const;

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES];

/**
 * @deprecated Use ROLE_PERMISSIONS instead
 */
export const ROLE_CAPABILITIES: Record<RoleName, Capability[]> = {
  [ROLE_NAMES.SUPER_ADMIN]: [CAPABILITIES.ALL],
  [ROLE_NAMES.SITE_ADMIN]: [
    CAPABILITIES.SITE_MANAGE,
    CAPABILITIES.DOMAIN_MANAGE,
    CAPABILITIES.CLUSTER_MANAGE,
    CAPABILITIES.RESOURCE_MANAGE,
    CAPABILITIES.RBAC_MANAGE,
    CAPABILITIES.AUDIT_VIEW,
  ],
  [ROLE_NAMES.DOMAIN_ADMIN]: [
    CAPABILITIES.DOMAIN_MANAGE,
    CAPABILITIES.RESOURCE_MANAGE,
    CAPABILITIES.AUDIT_VIEW,
  ],
  [ROLE_NAMES.INFRA_OPERATOR]: [
    CAPABILITIES.RESOURCE_MANAGE,
    CAPABILITIES.CLUSTER_VIEW,
    CAPABILITIES.DOMAIN_VIEW,
  ],
  [ROLE_NAMES.VIEWER]: [
    CAPABILITIES.SITE_VIEW,
    CAPABILITIES.DOMAIN_VIEW,
    CAPABILITIES.CLUSTER_VIEW,
    CAPABILITIES.RESOURCE_VIEW,
  ],
  [ROLE_NAMES.AUDITOR]: [
    CAPABILITIES.SITE_VIEW,
    CAPABILITIES.DOMAIN_VIEW,
    CAPABILITIES.AUDIT_VIEW,
    CAPABILITIES.AUDIT_EXPORT,
  ],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if a role has a specific permission key
 */
export function roleHasPermission(roleName: RoleName, permissionKey: PermissionKey): boolean {
  const permissions = ROLE_PERMISSIONS[roleName];
  if (!permissions) return false;
  
  // Wildcard grants all permissions
  if (permissions.includes(WILDCARD_PERMISSION)) return true;
  
  return permissions.includes(permissionKey);
}

/**
 * @deprecated Use roleHasPermission instead
 */
export function roleHasCapability(roleName: RoleName, capability: Capability): boolean {
  const capabilities = ROLE_CAPABILITIES[roleName];
  if (!capabilities) return false;
  if (capabilities.includes(CAPABILITIES.ALL)) return true;
  return capabilities.includes(capability);
}

/**
 * Check if roleA is higher than roleB in the hierarchy
 */
export function isHigherRole(roleA: RoleName, roleB: RoleName): boolean {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA > indexB;
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(roleName: RoleName): string {
  const displayNames: Record<RoleName, string> = {
    [ROLE_NAMES.SUPER_ADMIN]: 'Super Administrator',
    [ROLE_NAMES.SITE_ADMIN]: 'Site Administrator',
    [ROLE_NAMES.DOMAIN_ADMIN]: 'Domain Administrator',
    [ROLE_NAMES.INFRA_OPERATOR]: 'Infrastructure Operator',
    [ROLE_NAMES.VIEWER]: 'Viewer',
    [ROLE_NAMES.AUDITOR]: 'Auditor',
  };
  return displayNames[roleName] || roleName;
}

/**
 * Get the display name for a scope type
 */
export function getScopeTypeDisplayName(scopeType: ScopeType): string {
  const displayNames: Record<ScopeType, string> = {
    [SCOPE_TYPES.SITE]: 'Site',
    [SCOPE_TYPES.DOMAIN]: 'Domain',
    [SCOPE_TYPES.CLUSTER]: 'Cluster',
  };
  return displayNames[scopeType] || scopeType;
}

/**
 * Get all permission keys for a role
 */
export function getRolePermissionKeys(roleName: RoleName): PermissionKey[] {
  const permissions = ROLE_PERMISSIONS[roleName];
  if (!permissions) return [];
  
  // If wildcard, return all permission keys
  if (permissions.includes(WILDCARD_PERMISSION)) {
    return Object.values(PERMISSION_KEYS);
  }
  
  return permissions.filter((p): p is PermissionKey => p !== WILDCARD_PERMISSION);
}

/**
 * Get role description
 */
export function getRoleDescription(roleName: RoleName): string {
  const descriptions: Record<RoleName, string> = {
    [ROLE_NAMES.SUPER_ADMIN]: 'Full system access across all sites and features',
    [ROLE_NAMES.SITE_ADMIN]: 'Full access within assigned site(s), including RBAC management',
    [ROLE_NAMES.DOMAIN_ADMIN]: 'Domain and identity management within assigned domain(s)',
    [ROLE_NAMES.INFRA_OPERATOR]: 'Infrastructure operations and resource management',
    [ROLE_NAMES.VIEWER]: 'Read-only access to assigned scope',
    [ROLE_NAMES.AUDITOR]: 'Audit and compliance review access',
  };
  return descriptions[roleName] || '';
}
