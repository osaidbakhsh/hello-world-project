export type ClusterType = 'nutanix' | 'vmware' | 'hyperv' | 'other';
export type StorageType = 'all-flash' | 'hybrid' | 'hdd';
export type RFLevel = 'RF2' | 'RF3';
export type NodeRole = 'compute' | 'storage' | 'hybrid';
export type NodeStatus = 'active' | 'maintenance' | 'decommissioned';
export type VMEnvironment = 'production' | 'development' | 'testing' | 'staging' | 'dr';
export type VMStatus = 'running' | 'stopped' | 'suspended' | 'template';

export interface Datacenter {
  id: string;
  domain_id: string;
  name: string;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  domains?: { name: string };
}

export interface Cluster {
  id: string;
  domain_id: string;
  datacenter_id: string | null;
  name: string;
  cluster_type: ClusterType | null;
  vendor: string | null;
  platform_version: string | null;
  hypervisor_version: string | null;
  node_count: number;
  storage_type: StorageType | null;
  rf_level: RFLevel | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  datacenters?: Datacenter;
  domains?: { name: string };
}

export interface ClusterNode {
  id: string;
  cluster_id: string;
  domain_id: string;
  name: string;
  node_role: NodeRole;
  serial_number: string | null;
  model: string | null;
  vendor: string | null;
  cpu_sockets: number | null;
  cpu_cores: number | null;
  ram_gb: number | null;
  storage_total_tb: number | null;
  storage_used_tb: number | null;
  mgmt_ip: string | null;
  ilo_idrac_ip: string | null;
  status: NodeStatus;
  server_ref_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  clusters?: Cluster;
}

export interface VM {
  id: string;
  domain_id: string;
  cluster_id: string;
  host_node_id: string | null;
  name: string;
  ip_address: string | null;
  os: string | null;
  environment: VMEnvironment;
  status: VMStatus;
  vcpu: number | null;
  ram_gb: number | null;
  disk_total_gb: number | null;
  tags: string[];
  owner_department: string | null;
  beneficiary: string | null;
  server_ref_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  clusters?: Cluster;
  cluster_nodes?: ClusterNode;
}

export interface InfraSnapshot {
  id: string;
  domain_id: string;
  cluster_id: string;
  captured_at: string;
  total_cpu_cores: number;
  used_cpu_cores: number;
  total_ram_gb: number;
  used_ram_gb: number;
  total_storage_tb: number;
  used_storage_tb: number;
  notes: string | null;
}

export interface DatacenterStats {
  clustersCount: number;
  nodesCount: number;
  vmsCount: number;
  totalRamGb: number;
  usedRamGb: number;
  totalStorageTb: number;
  usedStorageTb: number;
  totalCpuCores: number;
  usedCpuCores: number;
}
