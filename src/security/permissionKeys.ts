/**
 * Permission Keys - Canonical list of all permission capabilities
 * Single source of truth for permission strings used across UI and services
 * 
 * IMPORTANT: Database RLS is the enforcement layer. Permission keys are for UI gating.
 */

// ============================================================
// PERMISSION KEY CONSTANTS
// ============================================================

export const PERMISSION_KEYS = {
  // ============================================================
  // Core Scope Permissions
  // ============================================================
  SITE_VIEW: 'site.view',
  SITE_MANAGE: 'site.manage',
  
  DOMAIN_VIEW: 'domain.view',
  DOMAIN_MANAGE: 'domain.manage',
  
  CLUSTER_VIEW: 'cluster.view',
  CLUSTER_MANAGE: 'cluster.manage',

  // ============================================================
  // Inventory Module
  // ============================================================
  INVENTORY_RESOURCES_VIEW: 'inventory.resources.view',
  INVENTORY_RESOURCES_MANAGE: 'inventory.resources.manage',
  
  INVENTORY_NETWORKS_VIEW: 'inventory.networks.view',
  INVENTORY_NETWORKS_MANAGE: 'inventory.networks.manage',
  
  INVENTORY_CLUSTERS_VIEW: 'inventory.clusters.view',
  INVENTORY_CLUSTERS_MANAGE: 'inventory.clusters.manage',
  
  INVENTORY_DATACENTERS_VIEW: 'inventory.datacenters.view',
  INVENTORY_DATACENTERS_MANAGE: 'inventory.datacenters.manage',

  // ============================================================
  // Identity / AD Module (future-ready)
  // ============================================================
  IDENTITY_DOMAINS_VIEW: 'identity.domains.view',
  IDENTITY_DOMAINS_MANAGE: 'identity.domains.manage',
  
  IDENTITY_AD_VIEW: 'identity.ad.view',
  IDENTITY_AD_SYNC: 'identity.ad.sync',

  // ============================================================
  // Integrations Module
  // ============================================================
  INTEGRATIONS_AGENTS_VIEW: 'integrations.agents.view',
  INTEGRATIONS_AGENTS_MANAGE: 'integrations.agents.manage',
  
  INTEGRATIONS_VIRTUALIZATION_VIEW: 'integrations.virtualization.view',
  INTEGRATIONS_VIRTUALIZATION_MANAGE: 'integrations.virtualization.manage',
  
  INTEGRATIONS_CONFIGS_VIEW: 'integrations.configs.view',
  INTEGRATIONS_CONFIGS_MANAGE: 'integrations.configs.manage',

  // ============================================================
  // Operations Module
  // ============================================================
  OPS_TASKS_VIEW: 'ops.tasks.view',
  OPS_TASKS_MANAGE: 'ops.tasks.manage',
  
  OPS_MAINTENANCE_VIEW: 'ops.maintenance.view',
  OPS_MAINTENANCE_MANAGE: 'ops.maintenance.manage',
  
  OPS_ONCALL_VIEW: 'ops.oncall.view',
  OPS_ONCALL_MANAGE: 'ops.oncall.manage',

  // ============================================================
  // Governance Module
  // ============================================================
  GOV_AUDIT_VIEW: 'gov.audit.view',
  GOV_AUDIT_EXPORT: 'gov.audit.export',
  
  GOV_APPROVALS_VIEW: 'gov.approvals.view',
  GOV_APPROVALS_MANAGE: 'gov.approvals.manage',
  
  GOV_NOTIFICATIONS_VIEW: 'gov.notifications.view',
  
  GOV_REPORTS_VIEW: 'gov.reports.view',
  GOV_REPORTS_EXPORT: 'gov.reports.export',

  // ============================================================
  // Administration Module
  // ============================================================
  ADMIN_RBAC_VIEW: 'admin.rbac.view',
  ADMIN_RBAC_MANAGE: 'admin.rbac.manage',
  
  ADMIN_SETTINGS_VIEW: 'admin.settings.view',
  ADMIN_SETTINGS_MANAGE: 'admin.settings.manage',
  
  ADMIN_USERS_VIEW: 'admin.users.view',
  ADMIN_USERS_MANAGE: 'admin.users.manage',

  // ============================================================
  // Personnel Module
  // ============================================================
  PERSONNEL_EMPLOYEES_VIEW: 'personnel.employees.view',
  PERSONNEL_EMPLOYEES_MANAGE: 'personnel.employees.manage',
  
  PERSONNEL_VACATIONS_VIEW: 'personnel.vacations.view',
  PERSONNEL_VACATIONS_MANAGE: 'personnel.vacations.manage',

  // ============================================================
  // Assets Module
  // ============================================================
  ASSETS_LICENSES_VIEW: 'assets.licenses.view',
  ASSETS_LICENSES_MANAGE: 'assets.licenses.manage',
  
  ASSETS_VAULT_VIEW: 'assets.vault.view',
  ASSETS_VAULT_MANAGE: 'assets.vault.manage',
  
  ASSETS_PROCUREMENT_VIEW: 'assets.procurement.view',
  ASSETS_PROCUREMENT_MANAGE: 'assets.procurement.manage',

  // ============================================================
  // Web Applications Module
  // ============================================================
  WEBAPPS_VIEW: 'webapps.view',
  WEBAPPS_MANAGE: 'webapps.manage',
} as const;

export type PermissionKey = typeof PERMISSION_KEYS[keyof typeof PERMISSION_KEYS];

// ============================================================
// PERMISSION KEY GROUPS (for UI organization)
// ============================================================

export const PERMISSION_GROUPS = {
  core: [
    PERMISSION_KEYS.SITE_VIEW,
    PERMISSION_KEYS.SITE_MANAGE,
    PERMISSION_KEYS.DOMAIN_VIEW,
    PERMISSION_KEYS.DOMAIN_MANAGE,
    PERMISSION_KEYS.CLUSTER_VIEW,
    PERMISSION_KEYS.CLUSTER_MANAGE,
  ],
  inventory: [
    PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW,
    PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE,
    PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW,
    PERMISSION_KEYS.INVENTORY_NETWORKS_MANAGE,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_CLUSTERS_MANAGE,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW,
    PERMISSION_KEYS.INVENTORY_DATACENTERS_MANAGE,
  ],
  identity: [
    PERMISSION_KEYS.IDENTITY_DOMAINS_VIEW,
    PERMISSION_KEYS.IDENTITY_DOMAINS_MANAGE,
    PERMISSION_KEYS.IDENTITY_AD_VIEW,
    PERMISSION_KEYS.IDENTITY_AD_SYNC,
  ],
  integrations: [
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_AGENTS_MANAGE,
    PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_MANAGE,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_VIEW,
    PERMISSION_KEYS.INTEGRATIONS_CONFIGS_MANAGE,
  ],
  operations: [
    PERMISSION_KEYS.OPS_TASKS_VIEW,
    PERMISSION_KEYS.OPS_TASKS_MANAGE,
    PERMISSION_KEYS.OPS_MAINTENANCE_VIEW,
    PERMISSION_KEYS.OPS_MAINTENANCE_MANAGE,
    PERMISSION_KEYS.OPS_ONCALL_VIEW,
    PERMISSION_KEYS.OPS_ONCALL_MANAGE,
  ],
  governance: [
    PERMISSION_KEYS.GOV_AUDIT_VIEW,
    PERMISSION_KEYS.GOV_AUDIT_EXPORT,
    PERMISSION_KEYS.GOV_APPROVALS_VIEW,
    PERMISSION_KEYS.GOV_APPROVALS_MANAGE,
    PERMISSION_KEYS.GOV_NOTIFICATIONS_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_VIEW,
    PERMISSION_KEYS.GOV_REPORTS_EXPORT,
  ],
  admin: [
    PERMISSION_KEYS.ADMIN_RBAC_VIEW,
    PERMISSION_KEYS.ADMIN_RBAC_MANAGE,
    PERMISSION_KEYS.ADMIN_SETTINGS_VIEW,
    PERMISSION_KEYS.ADMIN_SETTINGS_MANAGE,
    PERMISSION_KEYS.ADMIN_USERS_VIEW,
    PERMISSION_KEYS.ADMIN_USERS_MANAGE,
  ],
  personnel: [
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW,
    PERMISSION_KEYS.PERSONNEL_EMPLOYEES_MANAGE,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_VIEW,
    PERMISSION_KEYS.PERSONNEL_VACATIONS_MANAGE,
  ],
  assets: [
    PERMISSION_KEYS.ASSETS_LICENSES_VIEW,
    PERMISSION_KEYS.ASSETS_LICENSES_MANAGE,
    PERMISSION_KEYS.ASSETS_VAULT_VIEW,
    PERMISSION_KEYS.ASSETS_VAULT_MANAGE,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_VIEW,
    PERMISSION_KEYS.ASSETS_PROCUREMENT_MANAGE,
  ],
  webapps: [
    PERMISSION_KEYS.WEBAPPS_VIEW,
    PERMISSION_KEYS.WEBAPPS_MANAGE,
  ],
} as const;

// ============================================================
// ALL PERMISSION KEYS (flat array for validation)
// ============================================================

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSION_KEYS);

// ============================================================
// WILDCARD PERMISSION
// ============================================================

export const WILDCARD_PERMISSION = '*' as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if a permission key represents a "manage" action
 */
export function isManagePermission(key: PermissionKey): boolean {
  return key.endsWith('.manage') || key.endsWith('.sync') || key.endsWith('.export');
}

/**
 * Get the view counterpart of a manage permission
 */
export function getViewPermission(key: PermissionKey): PermissionKey | null {
  if (key.endsWith('.manage')) {
    const viewKey = key.replace('.manage', '.view');
    if (ALL_PERMISSION_KEYS.includes(viewKey as PermissionKey)) {
      return viewKey as PermissionKey;
    }
  }
  return null;
}

/**
 * Get display name for a permission key
 */
export function getPermissionDisplayName(key: PermissionKey): string {
  const displayNames: Partial<Record<PermissionKey, string>> = {
    [PERMISSION_KEYS.SITE_VIEW]: 'View Site',
    [PERMISSION_KEYS.SITE_MANAGE]: 'Manage Site',
    [PERMISSION_KEYS.DOMAIN_VIEW]: 'View Domain',
    [PERMISSION_KEYS.DOMAIN_MANAGE]: 'Manage Domain',
    [PERMISSION_KEYS.CLUSTER_VIEW]: 'View Cluster',
    [PERMISSION_KEYS.CLUSTER_MANAGE]: 'Manage Cluster',
    [PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW]: 'View Resources',
    [PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE]: 'Manage Resources',
    [PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW]: 'View Networks',
    [PERMISSION_KEYS.INVENTORY_NETWORKS_MANAGE]: 'Manage Networks',
    [PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW]: 'View Datacenters',
    [PERMISSION_KEYS.INVENTORY_DATACENTERS_MANAGE]: 'Manage Datacenters',
    [PERMISSION_KEYS.ADMIN_RBAC_VIEW]: 'View RBAC',
    [PERMISSION_KEYS.ADMIN_RBAC_MANAGE]: 'Manage RBAC',
    [PERMISSION_KEYS.GOV_AUDIT_VIEW]: 'View Audit Logs',
    [PERMISSION_KEYS.GOV_AUDIT_EXPORT]: 'Export Audit Logs',
  };
  
  return displayNames[key] || key.replace(/\./g, ' ').replace(/_/g, ' ');
}

/**
 * Get the module/group for a permission key
 */
export function getPermissionGroup(key: PermissionKey): string {
  const prefix = key.split('.')[0];
  const groupMap: Record<string, string> = {
    site: 'core',
    domain: 'core',
    cluster: 'core',
    inventory: 'inventory',
    identity: 'identity',
    integrations: 'integrations',
    ops: 'operations',
    gov: 'governance',
    admin: 'admin',
    personnel: 'personnel',
    assets: 'assets',
    webapps: 'webapps',
  };
  return groupMap[prefix] || 'other';
}
