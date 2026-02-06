// ============================================================
// VIRTUALIZATION INTEGRATIONS TYPES
// Isolated, optional module for hypervisor integrations
// ============================================================

export type IntegrationType = 'nutanix_prism' | 'hyperv';
export type IntegrationStatus = 'disabled' | 'enabled' | 'degraded';
export type IntegrationMode = 'preview' | 'sync';
export type DiscoveredResourceType = 'vm' | 'host' | 'network';
export type DiffAction = 'create' | 'update' | 'delete' | 'unchanged';

// ============================================================
// Virtualization Integration
// ============================================================

export interface VirtualizationIntegration {
  id: string;
  site_id: string;
  domain_id: string | null;
  integration_type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  mode: IntegrationMode;
  config_json: IntegrationConfig;
  last_sync_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfig {
  // Common
  host?: string;
  port?: number;
  
  // Nutanix specific
  prism_url?: string;
  cluster_filters?: string[];
  
  // Hyper-V specific
  hyperv_hosts?: string[];
  auth_method?: 'winrm' | 'ssh';
  
  // Schedule
  preview_interval_minutes?: number;
  sync_interval_minutes?: number;
  
  // Thresholds
  stale_threshold_hours?: number;
}

export interface VirtualizationIntegrationCreateInput {
  site_id: string;
  domain_id?: string;
  integration_type: IntegrationType;
  name: string;
  status?: IntegrationStatus;
  mode?: IntegrationMode;
  config_json?: IntegrationConfig;
}

export interface VirtualizationIntegrationUpdateInput {
  name?: string;
  status?: IntegrationStatus;
  mode?: IntegrationMode;
  config_json?: IntegrationConfig;
  last_sync_at?: string;
  last_error?: string | null;
}

// ============================================================
// Sync Runs
// ============================================================

export interface VirtualizationSyncRun {
  id: string;
  integration_id: string;
  started_at: string;
  finished_at: string | null;
  success: boolean | null;
  mode: IntegrationMode;
  stats_json: SyncStats;
  error_summary: string | null;
  created_by: string | null;
}

export interface SyncStats {
  vms_discovered?: number;
  hosts_discovered?: number;
  networks_discovered?: number;
  resources_created?: number;
  resources_updated?: number;
  resources_deleted?: number;
  errors?: number;
}

// ============================================================
// Discovered Resources (Staging)
// ============================================================

export interface DiscoveredResource {
  id: string;
  integration_id: string;
  run_id: string | null;
  site_id: string;
  discovered_at: string;
  resource_type: DiscoveredResourceType;
  external_id: string;
  name: string;
  ip_address: string | null;
  domain_id: string | null;
  cluster_id: string | null;
  network_id: string | null;
  attributes_json: DiscoveredResourceAttributes;
  diff_action: DiffAction | null;
}

export interface DiscoveredResourceAttributes {
  // VM attributes
  power_state?: string;
  vcpu?: number;
  memory_mb?: number;
  disk_size_gb?: number;
  host_uuid?: string;
  cluster_uuid?: string;
  network_uuids?: string[];
  os_type?: string;
  
  // Host attributes
  cpu_cores?: number;
  ram_gb?: number;
  storage_total_tb?: number;
  storage_used_tb?: number;
  hypervisor_version?: string;
  
  // Network attributes
  vlan_id?: number;
  cidr?: string;
  gateway?: string;
  subnet_type?: string;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface TestConnectionRequest {
  integration_type: IntegrationType;
  config: IntegrationConfig;
  credential: {
    username?: string;
    password?: string;
    token?: string;
  };
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: {
    cluster_name?: string;
    host_count?: number;
    vm_count?: number;
    version?: string;
  };
}

export interface RunPreviewRequest {
  integration_id: string;
}

export interface RunPreviewResponse {
  success: boolean;
  run_id: string;
  stats: SyncStats;
  error?: string;
}

export interface RunSyncRequest {
  integration_id: string;
}

export interface RunSyncResponse {
  success: boolean;
  run_id: string;
  stats: SyncStats;
  error?: string;
}

// ============================================================
// Integration with Details (for list views)
// ============================================================

export interface VirtualizationIntegrationWithDetails extends VirtualizationIntegration {
  site_name?: string;
  domain_name?: string;
  last_run?: VirtualizationSyncRun | null;
  discovered_count?: number;
}

// ============================================================
// Filters
// ============================================================

export interface VirtualizationIntegrationFilters {
  site_id?: string;
  integration_type?: IntegrationType;
  status?: IntegrationStatus;
  mode?: IntegrationMode;
}

export interface DiscoveredResourceFilters {
  integration_id: string;
  run_id?: string;
  resource_type?: DiscoveredResourceType;
  diff_action?: DiffAction;
  search?: string;
}
