/**
 * RBAC Role Definitions and Constants
 * Single source of truth for role names and capabilities
 */

// Role names as constants (must match database seed)
export const ROLE_NAMES = {
  SUPER_ADMIN: 'SuperAdmin',
  SITE_ADMIN: 'SiteAdmin',
  DOMAIN_ADMIN: 'DomainAdmin',
  INFRA_OPERATOR: 'InfraOperator',
  VIEWER: 'Viewer',
  AUDITOR: 'Auditor',
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

// Scope types
export const SCOPE_TYPES = {
  SITE: 'site',
  DOMAIN: 'domain',
  CLUSTER: 'cluster',
} as const;

export type ScopeType = typeof SCOPE_TYPES[keyof typeof SCOPE_TYPES];

// Permission capabilities
export const CAPABILITIES = {
  // Wildcard (SuperAdmin)
  ALL: '*',
  
  // Site-level
  SITE_VIEW: 'site.view',
  SITE_MANAGE: 'site.manage',
  
  // Domain-level
  DOMAIN_VIEW: 'domain.view',
  DOMAIN_MANAGE: 'domain.manage',
  
  // Cluster-level
  CLUSTER_VIEW: 'cluster.view',
  CLUSTER_MANAGE: 'cluster.manage',
  
  // Resource operations
  RESOURCE_VIEW: 'resource.view',
  RESOURCE_MANAGE: 'resource.manage',
  
  // RBAC management
  RBAC_MANAGE: 'rbac.manage',
  
  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',
} as const;

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES];

// Role capability mappings (fallback if DB is unavailable)
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

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: RoleName[] = [
  ROLE_NAMES.VIEWER,
  ROLE_NAMES.AUDITOR,
  ROLE_NAMES.INFRA_OPERATOR,
  ROLE_NAMES.DOMAIN_ADMIN,
  ROLE_NAMES.SITE_ADMIN,
  ROLE_NAMES.SUPER_ADMIN,
];

/**
 * Check if a role has a specific capability
 */
export function roleHasCapability(roleName: RoleName, capability: Capability): boolean {
  const capabilities = ROLE_CAPABILITIES[roleName];
  if (!capabilities) return false;
  
  // Wildcard grants all capabilities
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
