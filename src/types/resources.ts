// ============================================================
// PHASE 1: Resource Types - Unified Inventory Model
// ============================================================

export type ResourceType = 'vm' | 'physical_server' | 'appliance' | 'service' | 'container' | 'database';

export type ResourceStatus = 'online' | 'offline' | 'maintenance' | 'degraded' | 'unknown' | 'decommissioned';

export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low';

export type NetworkScopeType = 'site' | 'cluster';

// ============================================================
// Network V2 (Polymorphic Scoping)
// ============================================================
export interface NetworkV2 {
  id: string;
  site_id: string;
  scope_type: NetworkScopeType;
  scope_id: string | null;
  name: string;
  cidr: string | null;
  vlan_id: number | null;
  gateway: string | null;
  dns_servers: string[] | null;
  description: string | null;
  tags: string[] | null;
  is_management: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkV2CreateInput {
  site_id: string;
  scope_type?: NetworkScopeType;
  scope_id?: string;
  name: string;
  cidr?: string;
  vlan_id?: number;
  gateway?: string;
  dns_servers?: string[];
  description?: string;
  tags?: string[];
  is_management?: boolean;
}

export interface NetworkV2UpdateInput extends Partial<NetworkV2CreateInput> {}

// ============================================================
// Resource (Unified Inventory)
// ============================================================
export interface Resource {
  id: string;
  site_id: string;
  domain_id: string | null;
  cluster_id: string | null;
  network_id: string | null;
  
  // Core identification
  resource_type: ResourceType;
  name: string;
  hostname: string | null;
  fqdn: string | null;
  
  // Network info
  primary_ip: string | null;
  secondary_ips: string[] | null;
  mac_address: string | null;
  
  // System info
  os: string | null;
  os_version: string | null;
  cpu_cores: number | null;
  ram_gb: number | null;
  storage_gb: number | null;
  
  // Classification
  status: ResourceStatus;
  criticality: CriticalityLevel | null;
  environment: string | null;
  
  // Ownership
  owner_team: string | null;
  owner_user_id: string | null;
  responsible_user_id: string | null;
  
  // Business context
  application: string | null;
  department: string | null;
  cost_center: string | null;
  
  // Lifecycle
  commissioned_at: string | null;
  warranty_end: string | null;
  eol_date: string | null;
  eos_date: string | null;
  
  // Vendor info
  vendor: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  
  // Monitoring
  last_seen_at: string | null;
  last_health_check: string | null;
  health_score: number | null;
  
  // Backup info
  is_backed_up: boolean;
  backup_policy: string | null;
  last_backup_at: string | null;
  
  // Metadata
  tags: string[] | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  
  // Audit
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceCreateInput {
  site_id: string;
  domain_id?: string;
  cluster_id?: string;
  network_id?: string;
  resource_type: ResourceType;
  name: string;
  hostname?: string;
  fqdn?: string;
  primary_ip?: string;
  secondary_ips?: string[];
  mac_address?: string;
  os?: string;
  os_version?: string;
  cpu_cores?: number;
  ram_gb?: number;
  storage_gb?: number;
  status?: ResourceStatus;
  criticality?: CriticalityLevel;
  environment?: string;
  owner_team?: string;
  owner_user_id?: string;
  responsible_user_id?: string;
  application?: string;
  department?: string;
  cost_center?: string;
  commissioned_at?: string;
  warranty_end?: string;
  eol_date?: string;
  eos_date?: string;
  vendor?: string;
  model?: string;
  serial_number?: string;
  asset_tag?: string;
  is_backed_up?: boolean;
  backup_policy?: string;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

export interface ResourceUpdateInput extends Partial<ResourceCreateInput> {}

// ============================================================
// Resource VM Details
// ============================================================
export interface ResourceVMDetails {
  id: string;
  resource_id: string;
  hypervisor_type: string | null;
  hypervisor_host: string | null;
  vm_id: string | null;
  template_name: string | null;
  is_template: boolean;
  tools_status: string | null;
  tools_version: string | null;
  snapshot_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceVMDetailsInput {
  resource_id: string;
  hypervisor_type?: string;
  hypervisor_host?: string;
  vm_id?: string;
  template_name?: string;
  is_template?: boolean;
  tools_status?: string;
  tools_version?: string;
  snapshot_count?: number;
}

// ============================================================
// Resource Server Details
// ============================================================
export interface ResourceServerDetails {
  id: string;
  resource_id: string;
  datacenter_id: string | null;
  rack_location: string | null;
  rack_unit: number | null;
  power_supply_count: number | null;
  ilo_ip: string | null;
  ilo_type: string | null;
  bios_version: string | null;
  firmware_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceServerDetailsInput {
  resource_id: string;
  datacenter_id?: string;
  rack_location?: string;
  rack_unit?: number;
  power_supply_count?: number;
  ilo_ip?: string;
  ilo_type?: string;
  bios_version?: string;
  firmware_version?: string;
}

// ============================================================
// Resource with Details (Combined View)
// ============================================================
export interface ResourceWithDetails extends Resource {
  vm_details?: ResourceVMDetails | null;
  server_details?: ResourceServerDetails | null;
  // Joined data
  site_name?: string;
  domain_name?: string;
  cluster_name?: string;
  network_name?: string;
  owner_name?: string;
  responsible_name?: string;
}

// ============================================================
// Resource Filters
// ============================================================
export interface ResourceFilters {
  site_id?: string;
  domain_id?: string;
  cluster_id?: string;
  resource_type?: ResourceType | ResourceType[];
  status?: ResourceStatus | ResourceStatus[];
  criticality?: CriticalityLevel | CriticalityLevel[];
  environment?: string;
  owner_team?: string;
  search?: string;
  tags?: string[];
  is_backed_up?: boolean;
}

// ============================================================
// Resource Statistics
// ============================================================
export interface ResourceStats {
  total: number;
  by_type: Record<ResourceType, number>;
  by_status: Record<ResourceStatus, number>;
  by_criticality: Record<CriticalityLevel, number>;
  backed_up: number;
  not_backed_up: number;
  critical_offline: number;
}
