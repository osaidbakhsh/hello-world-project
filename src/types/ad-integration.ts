/**
 * AD Integration Types
 */

export type IntegrationType = 'active_directory' | 'azure_ad' | 'ldap';
export type IntegrationMode = 'push' | 'pull';
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
export type IntegrationStatus = 'enabled' | 'disabled';

export interface DomainIntegration {
  id: string;
  site_id: string;
  domain_id: string;
  integration_type: IntegrationType;
  mode: IntegrationMode;
  agent_id: string | null;
  status: IntegrationStatus;
  health_status: HealthStatus;
  last_seen_at: string | null;
  last_sync_at: string | null;
  config_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationRun {
  id: string;
  integration_id: string;
  run_type: 'push' | 'pull' | 'manual';
  started_at: string;
  finished_at: string | null;
  success: boolean | null;
  error_summary: string | null;
  metrics_json: Record<string, unknown>;
  created_by: string;
}

export interface ADSnapshot {
  id: string;
  site_id: string;
  domain_id: string;
  captured_at: string;
  
  // User metrics
  users_total: number;
  users_enabled: number;
  users_disabled: number;
  users_locked: number;
  
  // Password metrics
  pwd_expired: number;
  pwd_expiring_7d: number;
  pwd_expiring_14d: number;
  pwd_expiring_30d: number;
  pwd_never_expires: number;
  
  // Computer metrics
  computers_total: number;
  computers_enabled: number;
  computers_stale_30d: number;
  computers_stale_60d: number;
  computers_stale_90d: number;
  
  // Group metrics
  groups_total: number;
  privileged_groups_total: number;
  
  // DC metrics
  dcs_total: number;
  dcs_down: number;
  
  last_successful_sync_at: string | null;
}

export interface ADUser {
  id: string;
  site_id: string;
  domain_id: string;
  captured_at: string;
  sid: string;
  sam_account_name: string;
  display_name: string | null;
  user_principal_name: string | null;
  email: string | null;
  enabled: boolean;
  locked: boolean;
  account_expires_at: string | null;
  pwd_last_set: string | null;
  pwd_expires_at: string | null;
  pwd_never_expires: boolean;
  last_logon: string | null;
  logon_count: number;
  department: string | null;
  title: string | null;
  manager_dn: string | null;
  ou_dn: string | null;
  created_at: string;
}

export interface ADComputer {
  id: string;
  site_id: string;
  domain_id: string;
  captured_at: string;
  name: string;
  dns_hostname: string | null;
  enabled: boolean;
  last_logon: string | null;
  operating_system: string | null;
  os_version: string | null;
  os_service_pack: string | null;
  ou_dn: string | null;
  ad_site_name: string | null;
  created_at: string;
}

export interface ADGroup {
  id: string;
  site_id: string;
  domain_id: string;
  captured_at: string;
  name: string;
  dn: string;
  sam_account_name: string | null;
  group_scope: string | null;
  group_type: string | null;
  is_privileged: boolean;
  member_count: number;
  description: string | null;
  created_at: string;
}

export interface ADDomainController {
  id: string;
  site_id: string;
  domain_id: string;
  captured_at: string;
  name: string;
  hostname: string | null;
  ip_address: string | null;
  is_up: boolean;
  is_global_catalog: boolean;
  is_read_only: boolean;
  ad_site_name: string | null;
  last_seen_at: string | null;
  operating_system: string | null;
  created_at: string;
}

export interface ScanAgent {
  id: string;
  site_id: string | null;
  domain_id: string;
  name: string;
  site_tag: string | null;
  agent_type: string;
  status: string;
  last_seen_at: string | null;
  version: string | null;
  capabilities_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}
