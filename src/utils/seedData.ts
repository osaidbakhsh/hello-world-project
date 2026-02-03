import { supabase } from '@/integrations/supabase/client';

// Database constraint mappings - these must match the CHECK constraints in the database
const ALLOWED_VALUES = {
  cluster_type: ['nutanix', 'vmware', 'hyperv', 'other'] as const,
  rf_level: ['RF2', 'RF3'] as const,
  storage_type: ['all-flash', 'hybrid', 'hdd'] as const,
  node_role: ['compute', 'storage', 'hybrid'] as const,
  node_status: ['active', 'maintenance', 'decommissioned'] as const,
  vault_item_type: ['server', 'website', 'network_device', 'application', 'api_key', 'other'] as const,
} as const;

// Validation helper for cluster data
function validateClusterData(cluster: any): string[] {
  const errors: string[] = [];
  
  if (cluster.cluster_type && !ALLOWED_VALUES.cluster_type.includes(cluster.cluster_type)) {
    errors.push(`Invalid cluster_type: '${cluster.cluster_type}'. Allowed: ${ALLOWED_VALUES.cluster_type.join(', ')}`);
  }
  
  if (cluster.rf_level && !ALLOWED_VALUES.rf_level.includes(cluster.rf_level)) {
    errors.push(`Invalid rf_level: '${cluster.rf_level}'. Allowed: ${ALLOWED_VALUES.rf_level.join(', ')}`);
  }
  
  if (cluster.storage_type && !ALLOWED_VALUES.storage_type.includes(cluster.storage_type)) {
    errors.push(`Invalid storage_type: '${cluster.storage_type}'. Allowed: ${ALLOWED_VALUES.storage_type.join(', ')}`);
  }
  
  return errors;
}

// Professional domains - 3 distinct domains
const professionalDomains = [
  { name: 'os.com', description: 'Operations & Systems Domain - Core infrastructure management' },
  { name: 'at.com', description: 'Applications & Technology Domain - Development and applications' },
  { name: 'is.com', description: 'Infrastructure & Security Domain - Security and network operations' },
];

// Professional networks - 2 per domain
const professionalNetworks = [
  // os.com
  { domainName: 'os.com', name: 'OS-PROD-NET', subnet: '10.10.1.0/24', gateway: '10.10.1.1', dns_servers: ['10.10.1.10', '10.10.1.11'] },
  { domainName: 'os.com', name: 'OS-MGMT-NET', subnet: '10.10.2.0/24', gateway: '10.10.2.1', dns_servers: ['10.10.1.10'] },
  // at.com
  { domainName: 'at.com', name: 'AT-APP-NET', subnet: '10.20.1.0/24', gateway: '10.20.1.1', dns_servers: ['10.10.1.10', '10.10.1.11'] },
  { domainName: 'at.com', name: 'AT-DEV-NET', subnet: '10.20.2.0/24', gateway: '10.20.2.1', dns_servers: ['10.10.1.10'] },
  // is.com
  { domainName: 'is.com', name: 'IS-SEC-NET', subnet: '10.30.1.0/24', gateway: '10.30.1.1', dns_servers: ['10.10.1.10'] },
  { domainName: 'is.com', name: 'IS-DMZ-NET', subnet: '10.30.100.0/24', gateway: '10.30.100.1', dns_servers: ['8.8.8.8', '8.8.4.4'] },
];

// Professional servers - 6-10 per domain with critical roles
const professionalServers = [
  // os.com servers (8)
  { 
    networkName: 'OS-PROD-NET',
    name: 'OS-DC01', 
    ip_address: '10.10.1.10', 
    server_role: ['DC', 'DNS', 'DHCP'],
    primary_application: 'Active Directory',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-OSDC01-2024A',
    purchase_date: '2023-01-15',
    warranty_end: '2028-01-15',
    eol_date: '2030-10-14',
    eos_date: '2032-10-13',
    owner: 'IT Operations',
    responsible_user: 'Admin Team',
    beneficiary_department: 'All Departments',
  },
  { 
    networkName: 'OS-PROD-NET',
    name: 'OS-DC02', 
    ip_address: '10.10.1.11', 
    server_role: ['DC', 'DNS'],
    primary_application: 'Active Directory (Replica)',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-OSDC02-2024B',
    purchase_date: '2023-01-15',
    warranty_end: '2028-01-15',
    eol_date: '2030-10-14',
    eos_date: '2032-10-13',
    owner: 'IT Operations',
    responsible_user: 'Admin Team',
  },
  { 
    networkName: 'OS-PROD-NET',
    name: 'OS-CA01', 
    ip_address: '10.10.1.20', 
    server_role: ['CA'],
    primary_application: 'Enterprise Certificate Authority',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'weekly',
    last_backup_status: 'success',
    vendor: 'HP',
    model: 'ProLiant DL380 Gen10',
    serial_number: 'HP-OSCA01-2023C',
    purchase_date: '2022-06-10',
    warranty_end: '2027-06-10',
    owner: 'Security Team',
  },
  { 
    networkName: 'OS-PROD-NET',
    name: 'OS-FILE01', 
    ip_address: '10.10.1.30', 
    server_role: ['File'],
    primary_application: 'Windows File Server (DFS)',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-FILE01-2024D',
    purchase_date: '2023-03-20',
    warranty_end: '2028-03-20',
    owner: 'IT Operations',
    beneficiary_department: 'All Departments',
  },
  { 
    networkName: 'OS-PROD-NET',
    name: 'OS-PRINT01', 
    ip_address: '10.10.1.31', 
    server_role: ['Print'],
    primary_application: 'Print Server',
    operating_system: 'Windows Server 2019',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: false,
    vendor: 'HP',
    model: 'ProLiant DL360 Gen10',
    serial_number: 'HP-PRINT01-2021E',
    purchase_date: '2021-08-15',
    warranty_end: '2024-08-15',
    eol_date: '2027-01-09',
    eos_date: '2029-01-09',
    owner: 'IT Operations',
  },
  { 
    networkName: 'OS-MGMT-NET',
    name: 'OS-BACKUP01', 
    ip_address: '10.10.2.10', 
    server_role: ['Backup'],
    primary_application: 'Veeam Backup & Replication',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R750xs',
    serial_number: 'DELL-BACKUP01-2024F',
    purchase_date: '2023-05-01',
    warranty_end: '2028-05-01',
    owner: 'IT Operations',
    rpo_hours: 24,
    rto_hours: 4,
  },
  { 
    networkName: 'OS-MGMT-NET',
    name: 'OS-WSUS01', 
    ip_address: '10.10.2.20', 
    server_role: ['IIS'],
    primary_application: 'Windows Server Update Services',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'weekly',
    vendor: 'HP',
    model: 'ProLiant DL380 Gen10',
    serial_number: 'HP-WSUS01-2023G',
    owner: 'IT Operations',
  },
  { 
    networkName: 'OS-MGMT-NET',
    name: 'OS-SCCM01', 
    ip_address: '10.10.2.30', 
    server_role: ['SQL', 'IIS'],
    primary_application: 'Microsoft SCCM/Endpoint Manager',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-SCCM01-2024H',
    owner: 'IT Operations',
  },

  // at.com servers (7)
  { 
    networkName: 'AT-APP-NET',
    name: 'AT-EXCH01', 
    ip_address: '10.20.1.10', 
    server_role: ['Exchange'],
    primary_application: 'Microsoft Exchange 2019',
    operating_system: 'Windows Server 2019',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-EXCH01-2023I',
    purchase_date: '2022-11-20',
    warranty_end: '2027-11-20',
    eol_date: '2025-10-14',
    eos_date: '2029-10-14',
    owner: 'IT Applications',
    beneficiary_department: 'All Departments',
    rpo_hours: 1,
    rto_hours: 2,
  },
  { 
    networkName: 'AT-APP-NET',
    name: 'AT-SQL01', 
    ip_address: '10.20.1.20', 
    server_role: ['SQL'],
    primary_application: 'SQL Server 2022 Enterprise',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R750xa',
    serial_number: 'DELL-SQL01-2024J',
    purchase_date: '2023-08-10',
    warranty_end: '2028-08-10',
    owner: 'DBA Team',
    rpo_hours: 1,
    rto_hours: 2,
  },
  { 
    networkName: 'AT-APP-NET',
    name: 'AT-APP01', 
    ip_address: '10.20.1.30', 
    server_role: ['IIS'],
    primary_application: 'Corporate Intranet Portal',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    vendor: 'HP',
    model: 'ProLiant DL380 Gen10',
    serial_number: 'HP-APP01-2023K',
    owner: 'Development Team',
  },
  { 
    networkName: 'AT-APP-NET',
    name: 'AT-GITLAB01', 
    ip_address: '10.20.1.40', 
    server_role: [],
    primary_application: 'GitLab CE',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    last_backup_status: 'success',
    vendor: 'Dell',
    model: 'PowerEdge R650',
    serial_number: 'DELL-GITLAB01-2024L',
    owner: 'Development Team',
  },
  { 
    networkName: 'AT-DEV-NET',
    name: 'AT-JENKINS01', 
    ip_address: '10.20.2.10', 
    server_role: [],
    primary_application: 'Jenkins CI/CD',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'development',
    status: 'active',
    is_backed_up_by_veeam: false,
    vendor: 'HP',
    model: 'ProLiant DL360 Gen10',
    serial_number: 'HP-JENKINS01-2023M',
    owner: 'DevOps Team',
  },
  { 
    networkName: 'AT-DEV-NET',
    name: 'AT-DEV01', 
    ip_address: '10.20.2.20', 
    server_role: [],
    primary_application: 'Development Docker Host',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'development',
    status: 'active',
    is_backed_up_by_veeam: false,
    vendor: 'Dell',
    model: 'PowerEdge R650',
    owner: 'Development Team',
  },
  { 
    networkName: 'AT-DEV-NET',
    name: 'AT-TEST01', 
    ip_address: '10.20.2.30', 
    server_role: ['IIS', 'SQL'],
    primary_application: 'Testing Environment',
    operating_system: 'Windows Server 2022',
    environment: 'testing',
    status: 'active',
    is_backed_up_by_veeam: false,
    vendor: 'HP',
    model: 'ProLiant DL360 Gen10',
    owner: 'QA Team',
  },

  // is.com servers (6)
  { 
    networkName: 'IS-SEC-NET',
    name: 'IS-SIEM01', 
    ip_address: '10.30.1.10', 
    server_role: [],
    primary_application: 'SIEM - Wazuh/ELK Stack',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    vendor: 'Dell',
    model: 'PowerEdge R750xs',
    serial_number: 'DELL-SIEM01-2024N',
    owner: 'Security Team',
  },
  { 
    networkName: 'IS-SEC-NET',
    name: 'IS-MONITOR01', 
    ip_address: '10.30.1.20', 
    server_role: [],
    primary_application: 'Zabbix Monitoring',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'weekly',
    vendor: 'HP',
    model: 'ProLiant DL380 Gen10',
    serial_number: 'HP-MON01-2023O',
    owner: 'Network Team',
  },
  { 
    networkName: 'IS-SEC-NET',
    name: 'IS-GRAFANA01', 
    ip_address: '10.30.1.21', 
    server_role: [],
    primary_application: 'Grafana Dashboard',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: false,
    vendor: 'Dell',
    model: 'PowerEdge R450',
    owner: 'Network Team',
  },
  { 
    networkName: 'IS-SEC-NET',
    name: 'IS-FW-MGMT01', 
    ip_address: '10.30.1.30', 
    server_role: [],
    primary_application: 'Firewall Management Console',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'weekly',
    vendor: 'HP',
    model: 'ProLiant DL360 Gen10',
    owner: 'Security Team',
  },
  { 
    networkName: 'IS-DMZ-NET',
    name: 'IS-PROXY01', 
    ip_address: '10.30.100.10', 
    server_role: [],
    primary_application: 'Squid Proxy Server',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: false,
    vendor: 'Dell',
    model: 'PowerEdge R450',
    owner: 'Network Team',
  },
  { 
    networkName: 'IS-DMZ-NET',
    name: 'IS-VPN01', 
    ip_address: '10.30.100.20', 
    server_role: [],
    primary_application: 'OpenVPN Access Server',
    operating_system: 'Ubuntu 22.04 LTS',
    environment: 'production',
    status: 'active',
    is_backed_up_by_veeam: true,
    backup_frequency: 'weekly',
    vendor: 'HP',
    model: 'ProLiant DL360 Gen10',
    owner: 'Network Team',
  },
];

// Professional Datacenters - 1 per domain
const professionalDatacenters = [
  { domainName: 'os.com', name: 'DC-RIYADH-01', location: 'Riyadh, KSA - King Fahd Business Park', notes: 'Primary datacenter for Operations domain' },
  { domainName: 'at.com', name: 'DC-JEDDAH-01', location: 'Jeddah, KSA - Red Sea Tech Hub', notes: 'Development and applications datacenter' },
  { domainName: 'is.com', name: 'DC-DAMMAM-01', location: 'Dammam, KSA - Eastern Province Data Center', notes: 'Security and DMZ infrastructure' },
];

// Professional Clusters - 1-2 per datacenter
const professionalClusters = [
  // Riyadh - Nutanix
  { 
    datacenterName: 'DC-RIYADH-01', 
    name: 'OS-NUTANIX-PROD', 
    cluster_type: 'nutanix',
    vendor: 'Nutanix',
    platform_version: 'AOS 6.5.2',
    hypervisor_version: 'AHV 20220304.242',
    rf_level: 'RF2',
    storage_type: 'hybrid',
    node_count: 4,
    notes: 'Primary production cluster for core infrastructure',
  },
  { 
    datacenterName: 'DC-RIYADH-01', 
    name: 'OS-NUTANIX-DR', 
    cluster_type: 'nutanix',
    vendor: 'Nutanix',
    platform_version: 'AOS 6.5.2',
    hypervisor_version: 'AHV 20220304.242',
    rf_level: 'RF2',
    storage_type: 'all-flash',
    node_count: 3,
    notes: 'Disaster recovery cluster',
  },
  // Jeddah - VMware
  { 
    datacenterName: 'DC-JEDDAH-01', 
    name: 'AT-VMWARE-PROD', 
    cluster_type: 'vmware',
    vendor: 'VMware',
    platform_version: 'vSphere 8.0 Update 2',
    hypervisor_version: 'ESXi 8.0.2',
    storage_type: 'all-flash',
    node_count: 4,
    notes: 'Application workloads and development VMs',
  },
  // Dammam - Hyper-V
  { 
    datacenterName: 'DC-DAMMAM-01', 
    name: 'IS-HYPERV-SEC', 
    cluster_type: 'hyperv',  // Fixed: was 'hyper-v', DB constraint expects 'hyperv'
    vendor: 'Microsoft',
    platform_version: 'Windows Server 2022',
    hypervisor_version: 'Hyper-V 10.0',
    storage_type: 'hybrid',
    node_count: 3,
    notes: 'Security infrastructure and DMZ workloads',
  },
];

// Professional Cluster Nodes - 3-4 per cluster
const professionalClusterNodes = [
  // OS-NUTANIX-PROD nodes (4)
  { clusterName: 'OS-NUTANIX-PROD', name: 'OS-NX-NODE-01', cpu_sockets: 2, cpu_cores: 64, ram_gb: 512, storage_total_tb: 24, storage_used_tb: 18.5, mgmt_ip: '10.10.2.101', ilo_idrac_ip: '10.10.2.201', vendor: 'Dell', model: 'XC740xd-12', serial_number: 'NX-RUH-001', status: 'active', node_role: 'hybrid' },
  { clusterName: 'OS-NUTANIX-PROD', name: 'OS-NX-NODE-02', cpu_sockets: 2, cpu_cores: 64, ram_gb: 512, storage_total_tb: 24, storage_used_tb: 19.2, mgmt_ip: '10.10.2.102', ilo_idrac_ip: '10.10.2.202', vendor: 'Dell', model: 'XC740xd-12', serial_number: 'NX-RUH-002', status: 'active', node_role: 'hybrid' },
  { clusterName: 'OS-NUTANIX-PROD', name: 'OS-NX-NODE-03', cpu_sockets: 2, cpu_cores: 64, ram_gb: 512, storage_total_tb: 24, storage_used_tb: 17.8, mgmt_ip: '10.10.2.103', ilo_idrac_ip: '10.10.2.203', vendor: 'Dell', model: 'XC740xd-12', serial_number: 'NX-RUH-003', status: 'active', node_role: 'hybrid' },
  { clusterName: 'OS-NUTANIX-PROD', name: 'OS-NX-NODE-04', cpu_sockets: 2, cpu_cores: 64, ram_gb: 512, storage_total_tb: 24, storage_used_tb: 16.1, mgmt_ip: '10.10.2.104', ilo_idrac_ip: '10.10.2.204', vendor: 'Dell', model: 'XC740xd-12', serial_number: 'NX-RUH-004', status: 'active', node_role: 'hybrid' },
  
  // OS-NUTANIX-DR nodes (3)
  { clusterName: 'OS-NUTANIX-DR', name: 'OS-DR-NODE-01', cpu_sockets: 2, cpu_cores: 48, ram_gb: 384, storage_total_tb: 20, storage_used_tb: 8.5, mgmt_ip: '10.10.2.111', ilo_idrac_ip: '10.10.2.211', vendor: 'Dell', model: 'XC650-10', serial_number: 'NX-DR-001', status: 'active', node_role: 'hybrid' },
  { clusterName: 'OS-NUTANIX-DR', name: 'OS-DR-NODE-02', cpu_sockets: 2, cpu_cores: 48, ram_gb: 384, storage_total_tb: 20, storage_used_tb: 9.2, mgmt_ip: '10.10.2.112', ilo_idrac_ip: '10.10.2.212', vendor: 'Dell', model: 'XC650-10', serial_number: 'NX-DR-002', status: 'active', node_role: 'hybrid' },
  { clusterName: 'OS-NUTANIX-DR', name: 'OS-DR-NODE-03', cpu_sockets: 2, cpu_cores: 48, ram_gb: 384, storage_total_tb: 20, storage_used_tb: 7.8, mgmt_ip: '10.10.2.113', ilo_idrac_ip: '10.10.2.213', vendor: 'Dell', model: 'XC650-10', serial_number: 'NX-DR-003', status: 'active', node_role: 'hybrid' },
  
  // AT-VMWARE-PROD nodes (4)
  { clusterName: 'AT-VMWARE-PROD', name: 'AT-ESX-NODE-01', cpu_sockets: 2, cpu_cores: 56, ram_gb: 768, storage_total_tb: 30, storage_used_tb: 22.5, mgmt_ip: '10.20.2.101', ilo_idrac_ip: '10.20.2.201', vendor: 'HP', model: 'ProLiant DL380 Gen10 Plus', serial_number: 'VMW-JED-001', status: 'active', node_role: 'compute' },
  { clusterName: 'AT-VMWARE-PROD', name: 'AT-ESX-NODE-02', cpu_sockets: 2, cpu_cores: 56, ram_gb: 768, storage_total_tb: 30, storage_used_tb: 24.1, mgmt_ip: '10.20.2.102', ilo_idrac_ip: '10.20.2.202', vendor: 'HP', model: 'ProLiant DL380 Gen10 Plus', serial_number: 'VMW-JED-002', status: 'active', node_role: 'compute' },
  { clusterName: 'AT-VMWARE-PROD', name: 'AT-ESX-NODE-03', cpu_sockets: 2, cpu_cores: 56, ram_gb: 768, storage_total_tb: 30, storage_used_tb: 21.8, mgmt_ip: '10.20.2.103', ilo_idrac_ip: '10.20.2.203', vendor: 'HP', model: 'ProLiant DL380 Gen10 Plus', serial_number: 'VMW-JED-003', status: 'active', node_role: 'compute' },
  { clusterName: 'AT-VMWARE-PROD', name: 'AT-ESX-NODE-04', cpu_sockets: 2, cpu_cores: 56, ram_gb: 768, storage_total_tb: 30, storage_used_tb: 19.5, mgmt_ip: '10.20.2.104', ilo_idrac_ip: '10.20.2.204', vendor: 'HP', model: 'ProLiant DL380 Gen10 Plus', serial_number: 'VMW-JED-004', status: 'active', node_role: 'storage' },
  
  // IS-HYPERV-SEC nodes (3)
  { clusterName: 'IS-HYPERV-SEC', name: 'IS-HV-NODE-01', cpu_sockets: 2, cpu_cores: 40, ram_gb: 256, storage_total_tb: 15, storage_used_tb: 9.8, mgmt_ip: '10.30.2.101', ilo_idrac_ip: '10.30.2.201', vendor: 'Dell', model: 'PowerEdge R750', serial_number: 'HV-DMM-001', status: 'active', node_role: 'hybrid' },
  { clusterName: 'IS-HYPERV-SEC', name: 'IS-HV-NODE-02', cpu_sockets: 2, cpu_cores: 40, ram_gb: 256, storage_total_tb: 15, storage_used_tb: 10.2, mgmt_ip: '10.30.2.102', ilo_idrac_ip: '10.30.2.202', vendor: 'Dell', model: 'PowerEdge R750', serial_number: 'HV-DMM-002', status: 'active', node_role: 'hybrid' },
  { clusterName: 'IS-HYPERV-SEC', name: 'IS-HV-NODE-03', cpu_sockets: 2, cpu_cores: 40, ram_gb: 256, storage_total_tb: 15, storage_used_tb: 8.5, mgmt_ip: '10.30.2.103', ilo_idrac_ip: '10.30.2.203', vendor: 'Dell', model: 'PowerEdge R750', serial_number: 'HV-DMM-003', status: 'maintenance', node_role: 'hybrid' },
];

// Professional Maintenance Windows
const professionalMaintenanceWindows = [
  {
    domainName: 'os.com',
    title: 'Windows Server Patching - February 2026',
    description: 'Monthly security patches for all Windows servers in OS domain',
    start_time: '2026-02-15T22:00:00Z',
    end_time: '2026-02-16T06:00:00Z',
    impact_level: 'medium',
    status: 'scheduled',
    recurrence: 'monthly',
  },
  {
    domainName: 'os.com',
    title: 'Nutanix Cluster Upgrade - AOS 6.6',
    description: 'Upgrade Nutanix AOS to version 6.6 with rolling restart',
    start_time: '2026-03-01T00:00:00Z',
    end_time: '2026-03-01T08:00:00Z',
    impact_level: 'high',
    status: 'scheduled',
    recurrence: 'once',
  },
  {
    domainName: 'at.com',
    title: 'Exchange 2019 CU14 Update',
    description: 'Install Exchange Server 2019 Cumulative Update 14',
    start_time: '2026-02-22T22:00:00Z',
    end_time: '2026-02-23T04:00:00Z',
    impact_level: 'high',
    status: 'scheduled',
    recurrence: 'once',
  },
  {
    domainName: 'at.com',
    title: 'VMware vSphere Patching',
    description: 'Apply latest ESXi patches to all hosts',
    start_time: '2026-02-28T23:00:00Z',
    end_time: '2026-03-01T05:00:00Z',
    impact_level: 'medium',
    status: 'scheduled',
    recurrence: 'quarterly',
  },
  {
    domainName: 'is.com',
    title: 'Firewall Firmware Upgrade',
    description: 'Upgrade Palo Alto firewall firmware to latest version',
    start_time: '2026-02-08T01:00:00Z',
    end_time: '2026-02-08T03:00:00Z',
    impact_level: 'high',
    status: 'completed',
    recurrence: 'once',
  },
  {
    domainName: 'is.com',
    title: 'Security Certificate Renewal',
    description: 'Renew and deploy SSL certificates for DMZ services',
    start_time: '2026-02-20T10:00:00Z',
    end_time: '2026-02-20T14:00:00Z',
    impact_level: 'low',
    status: 'scheduled',
    recurrence: 'once',
  },
];

// Professional On-Call Schedules
const professionalOnCallSchedules = [
  {
    domainName: 'os.com',
    name: 'OS Infrastructure On-Call',
    rotation_type: 'round_robin',
    is_active: true,
  },
  {
    domainName: 'at.com',
    name: 'AT Applications Support',
    rotation_type: 'round_robin',
    is_active: true,
  },
  {
    domainName: 'is.com',
    name: 'IS Security Operations',
    rotation_type: 'round_robin',
    is_active: true,
  },
];

// Professional File Shares
const professionalFileShares = [
  {
    domainName: 'os.com',
    name: 'OS-SHARED-DATA',
    path: '\\\\os-file01.os.com\\data',
    share_type: 'SMB',
    scan_mode: 'DIRECT',
    scan_depth: 10,
    exclude_patterns: ['*.tmp', '*.bak', 'Thumbs.db'],
    is_enabled: true,
  },
  {
    domainName: 'os.com',
    name: 'OS-USER-HOMES',
    path: '\\\\os-file01.os.com\\users',
    share_type: 'SMB',
    scan_mode: 'DIRECT',
    scan_depth: 5,
    exclude_patterns: ['AppData', '*.tmp'],
    is_enabled: true,
  },
  {
    domainName: 'at.com',
    name: 'AT-DEV-REPOS',
    path: '/mnt/nfs/dev-repos',
    share_type: 'NFS',
    scan_mode: 'DIRECT',
    scan_depth: 8,
    exclude_patterns: ['node_modules', '.git', 'vendor'],
    is_enabled: true,
  },
  {
    domainName: 'at.com',
    name: 'AT-BUILD-ARTIFACTS',
    path: '/mnt/nfs/artifacts',
    share_type: 'NFS',
    scan_mode: 'DIRECT',
    scan_depth: 6,
    exclude_patterns: ['*.log'],
    is_enabled: true,
  },
  {
    domainName: 'is.com',
    name: 'IS-LOGS-ARCHIVE',
    path: '\\\\is-file01.is.com\\logs',
    share_type: 'SMB',
    scan_mode: 'DIRECT',
    scan_depth: 12,
    exclude_patterns: [],
    is_enabled: true,
  },
  {
    domainName: 'is.com',
    name: 'IS-EVIDENCE-VAULT',
    path: '\\\\is-file01.is.com\\evidence',
    share_type: 'SMB',
    scan_mode: 'DIRECT',
    scan_depth: 15,
    exclude_patterns: [],
    is_enabled: false, // Disabled for compliance
  },
];

// Professional Vacations
const professionalVacations = [
  { status: 'pending', vacation_type: 'annual', start_date: '2026-03-01', end_date: '2026-03-05', notes: 'Family vacation' },
  { status: 'approved', vacation_type: 'annual', start_date: '2026-04-10', end_date: '2026-04-15', notes: 'Eid Al-Fitr holiday' },
  { status: 'rejected', vacation_type: 'sick', start_date: '2026-02-20', end_date: '2026-02-21', notes: 'Medical appointment - rescheduled' },
  { status: 'pending', vacation_type: 'personal', start_date: '2026-05-15', end_date: '2026-05-16', notes: 'Personal matters' },
  { status: 'approved', vacation_type: 'annual', start_date: '2026-06-20', end_date: '2026-07-05', notes: 'Summer vacation with family' },
];

// Professional licenses with varied expiry dates
const professionalLicenses = [
  // Expired
  { 
    name: 'Adobe Acrobat Pro DC', 
    vendor: 'Adobe', 
    license_key: 'ADOBE-XXXX-XXXX-XXXX',
    quantity: 15,
    expiry_date: '2025-12-01',
    cost: 4500,
    status: 'expired',
  },
  // Expiring within 30 days (current date is 2026-02-01)
  { 
    name: 'Kaspersky Endpoint Security', 
    vendor: 'Kaspersky', 
    license_key: 'KASP-XXXX-XXXX-XXXX',
    quantity: 200,
    expiry_date: '2026-02-15',
    cost: 8500,
    status: 'active',
  },
  { 
    name: 'VMware vSphere Enterprise Plus', 
    vendor: 'VMware', 
    license_key: 'VMWARE-VSPH-XXXX-XXXX',
    quantity: 10,
    expiry_date: '2026-02-20',
    cost: 45000,
    status: 'active',
  },
  { 
    name: 'Veeam Backup & Replication Enterprise', 
    vendor: 'Veeam', 
    license_key: 'VEEAM-XXXX-XXXX-XXXX',
    quantity: 20,
    expiry_date: '2026-02-28',
    cost: 15000,
    status: 'active',
  },
  // Valid licenses
  { 
    name: 'Microsoft 365 E3', 
    vendor: 'Microsoft', 
    license_key: 'M365-E3-XXXX-XXXX',
    quantity: 150,
    expiry_date: '2027-06-30',
    cost: 75000,
    status: 'active',
  },
  { 
    name: 'Windows Server 2022 Datacenter', 
    vendor: 'Microsoft', 
    license_key: 'WINSRV-DC-XXXX-XXXX',
    quantity: 8,
    expiry_date: '2028-01-01',
    cost: 48000,
    status: 'active',
  },
  { 
    name: 'SQL Server 2022 Enterprise', 
    vendor: 'Microsoft', 
    license_key: 'SQLSRV-ENT-XXXX-XXXX',
    quantity: 4,
    expiry_date: '2028-01-01',
    cost: 60000,
    status: 'active',
  },
  { 
    name: 'Red Hat Enterprise Linux', 
    vendor: 'Red Hat', 
    license_key: 'RHEL-XXXX-XXXX-XXXX',
    quantity: 20,
    expiry_date: '2027-03-15',
    cost: 12000,
    status: 'active',
  },
  { 
    name: 'Splunk Enterprise', 
    vendor: 'Splunk', 
    license_key: 'SPLUNK-XXXX-XXXX-XXXX',
    quantity: 1,
    expiry_date: '2026-09-30',
    cost: 35000,
    status: 'active',
  },
  { 
    name: 'ServiceNow ITSM', 
    vendor: 'ServiceNow', 
    license_key: 'SNOW-XXXX-XXXX-XXXX',
    quantity: 50,
    expiry_date: '2026-12-31',
    cost: 85000,
    status: 'active',
  },
  // Extended Licenses
  { 
    name: 'Nutanix AOS', 
    vendor: 'Nutanix', 
    license_key: 'NTX-AOS-XXXX-XXXX',
    quantity: 7,
    expiry_date: '2027-06-15',
    cost: 55000,
    status: 'active',
  },
  { 
    name: 'Zabbix Enterprise', 
    vendor: 'Zabbix', 
    license_key: 'ZABBIX-ENT-XXXX-XXXX',
    quantity: 1,
    expiry_date: '2026-04-30',
    cost: 8000,
    status: 'active',
  },
  { 
    name: 'AutoCAD LT', 
    vendor: 'Autodesk', 
    license_key: 'ACAD-LT-XXXX-XXXX',
    quantity: 5,
    expiry_date: '2025-12-31',
    cost: 3500,
    status: 'expired',
  },
  { 
    name: 'Palo Alto Networks', 
    vendor: 'Palo Alto', 
    license_key: 'PAN-FW-XXXX-XXXX',
    quantity: 2,
    expiry_date: '2027-08-20',
    cost: 42000,
    status: 'active',
  },
];

// Professional tasks with varied statuses
const professionalTasks = [
  // Overdue tasks (due date in the past - before 2026-02-01)
  { 
    title: 'تجديد شهادة SSL لبوابة الموظفين',
    description: 'تجديد شهادة SSL للبوابة الداخلية قبل انتهائها - أولوية قصوى',
    priority: 'p1',
    frequency: 'once',
    due_date: '2026-01-15',
    task_status: 'todo',
  },
  { 
    title: 'مراجعة صلاحيات المستخدمين للربع الأول',
    description: 'مراجعة شاملة لصلاحيات الوصول لجميع المستخدمين',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-01-20',
    task_status: 'todo',
  },
  // In progress tasks
  { 
    title: 'ترقية VMware vSphere إلى 8.0',
    description: 'ترقية منصة الافتراضية إلى الإصدار الأخير مع الحفاظ على التوافق',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-02-15',
    task_status: 'in_progress',
  },
  { 
    title: 'تحديث سياسات النسخ الاحتياطي',
    description: 'تحديث سياسات Veeam لتشمل السيرفرات الجديدة',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-02-10',
    task_status: 'in_progress',
  },
  // Todo tasks
  { 
    title: 'تثبيت تحديثات أمان Windows',
    description: 'تثبيت تحديثات الأمان الشهرية على جميع سيرفرات Windows',
    priority: 'p1',
    frequency: 'monthly',
    due_date: '2026-02-28',
    task_status: 'todo',
  },
  { 
    title: 'اختبار خطة التعافي من الكوارث',
    description: 'إجراء اختبار DR للتأكد من صلاحية خطة التعافي',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-03-15',
    task_status: 'todo',
  },
  { 
    title: 'تجديد شهادات SSL للتطبيقات',
    description: 'تجديد شهادات SSL لـ GitLab و Jenkins والتطبيقات الأخرى',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-03-01',
    task_status: 'todo',
  },
  // Done tasks
  { 
    title: 'تكوين النسخ الاحتياطي للسيرفرات الجديدة',
    description: 'إعداد jobs النسخ الاحتياطي للسيرفرات المضافة حديثاً',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-01-25',
    task_status: 'done',
  },
  { 
    title: 'توثيق بنية الشبكة',
    description: 'تحديث وثائق الشبكة وإضافة المخططات الجديدة',
    priority: 'p3',
    frequency: 'once',
    due_date: '2026-01-10',
    task_status: 'done',
  },
  { 
    title: 'إعداد monitoring للسيرفرات الجديدة',
    description: 'إضافة السيرفرات الجديدة لنظام Zabbix',
    priority: 'p2',
    frequency: 'once',
    due_date: '2026-01-30',
    task_status: 'done',
  },
];

// Web Applications
const professionalWebApps = [
  { 
    name: 'Active Directory Admin Center', 
    url: 'https://adac.os.com',
    category: 'infrastructure',
    icon: '🔐',
    description: 'إدارة Active Directory',
    is_active: true,
  },
  { 
    name: 'GitLab', 
    url: 'https://gitlab.at.com',
    category: 'development',
    icon: '🦊',
    description: 'إدارة المستودعات و CI/CD',
    is_active: true,
  },
  { 
    name: 'Grafana', 
    url: 'https://grafana.is.com',
    category: 'monitoring',
    icon: '📊',
    description: 'لوحات المراقبة والتحليلات',
    is_active: true,
  },
  { 
    name: 'Jenkins', 
    url: 'https://jenkins.at.com',
    category: 'development',
    icon: '🔧',
    description: 'خادم CI/CD',
    is_active: true,
  },
  { 
    name: 'Zabbix', 
    url: 'https://zabbix.is.com',
    category: 'monitoring',
    icon: '🔍',
    description: 'مراقبة البنية التحتية',
    is_active: true,
  },
  { 
    name: 'Veeam Console', 
    url: 'https://backup.os.com',
    category: 'backup',
    icon: '💾',
    description: 'إدارة النسخ الاحتياطي',
    is_active: true,
  },
  { 
    name: 'Confluence Wiki', 
    url: 'https://wiki.at.com',
    category: 'documentation',
    icon: '📝',
    description: 'قاعدة المعرفة والتوثيق',
    is_active: true,
  },
  { 
    name: 'Wazuh SIEM', 
    url: 'https://siem.is.com',
    category: 'security',
    icon: '🛡️',
    description: 'نظام SIEM للأمان',
    is_active: true,
  },
  { 
    name: 'Exchange Admin Center', 
    url: 'https://mail.at.com/ecp',
    category: 'communication',
    icon: '📧',
    description: 'إدارة Exchange',
    is_active: true,
  },
  { 
    name: 'Firewall Console', 
    url: 'https://fw.is.com',
    category: 'security',
    icon: '🔥',
    description: 'إدارة جدار الحماية',
    is_active: true,
  },
];

// Vault items
const professionalVaultItems = [
  { title: 'OS-DC01 Administrator', username: 'administrator', item_type: 'server', url: 'OS-DC01', notes: 'Primary domain controller admin' },
  { title: 'GitLab Root Account', username: 'root', item_type: 'website', url: 'https://gitlab.at.com', notes: 'GitLab root admin' },
  { title: 'SQL Server SA', username: 'sa', item_type: 'server', url: 'AT-SQL01', notes: 'SQL Server system administrator' },
  { title: 'Veeam Service Account', username: 'svc_veeam', item_type: 'application', url: 'OS-BACKUP01', notes: 'Veeam service account' },
  { title: 'Firewall Admin', username: 'admin', item_type: 'network_device', url: '10.30.1.1', notes: 'Main firewall admin' },
  { title: 'SIEM API Key', username: 'api_key', item_type: 'api_key', notes: 'Wazuh API key for integrations' },
  // Extended Vault Items
  { title: 'Exchange Admin', username: 'exchAdmin', item_type: 'server', url: 'AT-EXCH01', notes: 'Exchange server administrator' },
  { title: 'Nutanix Prism Admin', username: 'admin', item_type: 'application', url: 'https://prism.os.com', notes: 'Nutanix Prism Central admin' },
  { title: 'VMware vCenter', username: 'administrator@vsphere.local', item_type: 'application', url: 'https://vcenter.at.com', notes: 'vCenter Server admin' },
  { title: 'Zabbix API Key', username: 'api', item_type: 'api_key', notes: 'Zabbix monitoring API key' },
  { title: 'AWS Root Account', username: 'root', item_type: 'other', url: 'https://console.aws.amazon.com', notes: 'AWS root account for DR (Cloud)' },
  { title: 'Azure Portal', username: 'admin@company.onmicrosoft.com', item_type: 'other', url: 'https://portal.azure.com', notes: 'Azure admin portal (Cloud)' },
];

// Professional Scan Agents
const professionalScanAgents = [
  { domainName: 'os.com', name: 'OS-SCANNER-01', site_tag: 'Riyadh-DC', status: 'ONLINE', version: '2.5.1' },
  { domainName: 'os.com', name: 'OS-SCANNER-02', site_tag: 'Riyadh-DR', status: 'ONLINE', version: '2.5.1' },
  { domainName: 'at.com', name: 'AT-SCANNER-01', site_tag: 'Jeddah-DC', status: 'ONLINE', version: '2.5.0' },
  { domainName: 'is.com', name: 'IS-SCANNER-01', site_tag: 'Dammam-DC', status: 'OFFLINE', version: '2.4.8' },
];

export interface SeedResult {
  success: boolean;
  message: string;
  details?: {
    domains: number;
    networks: number;
    servers: number;
    licenses: number;
    tasks: number;
    webApps: number;
    vaultItems: number;
    datacenters: number;
    clusters: number;
    clusterNodes: number;
    maintenanceWindows: number;
    onCallSchedules: number;
    fileShares: number;
    vacations: number;
    scanAgents: number;
  };
}

export async function seedAllData(): Promise<SeedResult> {
  try {
    // Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    let createdCounts = {
      domains: 0,
      networks: 0,
      servers: 0,
      licenses: 0,
      tasks: 0,
      webApps: 0,
      vaultItems: 0,
      datacenters: 0,
      clusters: 0,
      clusterNodes: 0,
      maintenanceWindows: 0,
      onCallSchedules: 0,
      fileShares: 0,
      vacations: 0,
      scanAgents: 0,
    };

    // 1. Create Domains (only the 3 professional domains)
    const { data: existingDomains } = await supabase.from('domains').select('name, id');
    const existingDomainNames = existingDomains?.map(d => d.name) || [];
    const newDomains = professionalDomains.filter(d => !existingDomainNames.includes(d.name));
    
    if (newDomains.length > 0) {
      const { data: createdDomains, error: domainError } = await supabase
        .from('domains')
        .insert(newDomains)
        .select();
      
      if (domainError) throw new Error(`Failed to create domains: ${domainError.message}`);
      createdCounts.domains = createdDomains?.length || 0;
    }

    // Get all domains for mapping
    const { data: allDomains } = await supabase.from('domains').select('*');
    const domainMap = new Map(allDomains?.map(d => [d.name, d.id]) || []);

    // 2. Create Networks
    const { data: existingNetworks } = await supabase.from('networks').select('name, id');
    const existingNetworkNames = existingNetworks?.map(n => n.name) || [];
    const newNetworks = professionalNetworks
      .filter(n => !existingNetworkNames.includes(n.name))
      .map(network => ({
        name: network.name,
        subnet: network.subnet,
        gateway: network.gateway,
        dns_servers: network.dns_servers,
        domain_id: domainMap.get(network.domainName),
      }))
      .filter(n => n.domain_id);

    if (newNetworks.length > 0) {
      const { data: createdNetworks, error: networkError } = await supabase
        .from('networks')
        .insert(newNetworks)
        .select();
      
      if (networkError) throw new Error(`Failed to create networks: ${networkError.message}`);
      createdCounts.networks = createdNetworks?.length || 0;
    }

    // Get all networks for mapping
    const { data: allNetworks } = await supabase.from('networks').select('*');
    const networkMap = new Map(allNetworks?.map(n => [n.name, n.id]) || []);

    // 3. Create Servers
    const { data: existingServers } = await supabase.from('servers').select('name');
    const existingServerNames = existingServers?.map(s => s.name) || [];
    const newServers = professionalServers
      .filter(s => !existingServerNames.includes(s.name))
      .map(server => ({
        name: server.name,
        ip_address: server.ip_address,
        server_role: server.server_role,
        primary_application: server.primary_application,
        operating_system: server.operating_system,
        environment: server.environment,
        status: server.status,
        is_backed_up_by_veeam: server.is_backed_up_by_veeam,
        backup_frequency: server.backup_frequency || 'none',
        last_backup_status: server.last_backup_status,
        vendor: server.vendor,
        model: server.model,
        serial_number: server.serial_number,
        purchase_date: server.purchase_date,
        warranty_end: server.warranty_end,
        eol_date: server.eol_date,
        eos_date: server.eos_date,
        owner: server.owner,
        responsible_user: server.responsible_user,
        beneficiary_department: server.beneficiary_department,
        rpo_hours: server.rpo_hours,
        rto_hours: server.rto_hours,
        network_id: networkMap.get(server.networkName),
        created_by: profile.id,
      }));

    if (newServers.length > 0) {
      const { data: createdServers, error: serverError } = await supabase
        .from('servers')
        .insert(newServers)
        .select();
      
      if (serverError) throw new Error(`Failed to create servers: ${serverError.message}`);
      createdCounts.servers = createdServers?.length || 0;
    }

    // 4. Create Datacenters
    const { data: existingDatacenters } = await supabase.from('datacenters').select('name');
    const existingDatacenterNames = existingDatacenters?.map(d => d.name) || [];
    const newDatacenters = professionalDatacenters
      .filter(dc => !existingDatacenterNames.includes(dc.name))
      .map(dc => ({
        name: dc.name,
        location: dc.location,
        notes: dc.notes,
        domain_id: domainMap.get(dc.domainName),
        created_by: profile.id,
      }))
      .filter(dc => dc.domain_id);

    if (newDatacenters.length > 0) {
      const { data: createdDatacenters, error: dcError } = await supabase
        .from('datacenters')
        .insert(newDatacenters)
        .select();
      
      if (dcError) throw new Error(`Failed to create datacenters: ${dcError.message}`);
      createdCounts.datacenters = createdDatacenters?.length || 0;
    }

    // Get all datacenters for mapping
    const { data: allDatacenters } = await supabase.from('datacenters').select('*');
    const datacenterMap = new Map(allDatacenters?.map(dc => [dc.name, dc.id]) || []);

    // 5. Create Clusters
    const { data: existingClusters } = await supabase.from('clusters').select('name');
    const existingClusterNames = existingClusters?.map(c => c.name) || [];
    const newClusters = professionalClusters
      .filter(c => !existingClusterNames.includes(c.name))
      .map(cluster => {
        const datacenterId = datacenterMap.get(cluster.datacenterName);
        const datacenter = allDatacenters?.find(dc => dc.name === cluster.datacenterName);
        return {
          name: cluster.name,
          cluster_type: cluster.cluster_type,
          vendor: cluster.vendor,
          platform_version: cluster.platform_version,
          hypervisor_version: cluster.hypervisor_version,
          rf_level: cluster.rf_level,
          storage_type: cluster.storage_type,
          node_count: cluster.node_count,
          notes: cluster.notes,
          datacenter_id: datacenterId,
          domain_id: datacenter?.domain_id,
          created_by: profile.id,
        };
      })
      .filter(c => c.domain_id);

    if (newClusters.length > 0) {
      const { data: createdClusters, error: clusterError } = await supabase
        .from('clusters')
        .insert(newClusters)
        .select();
      
      if (clusterError) throw new Error(`Failed to create clusters: ${clusterError.message}`);
      createdCounts.clusters = createdClusters?.length || 0;
    }

    // Get all clusters for mapping
    const { data: allClusters } = await supabase.from('clusters').select('*');
    const clusterMap = new Map(allClusters?.map(c => [c.name, { id: c.id, domain_id: c.domain_id }]) || []);

    // 6. Create Cluster Nodes
    const { data: existingNodes } = await supabase.from('cluster_nodes').select('name');
    const existingNodeNames = existingNodes?.map(n => n.name) || [];
    const newNodes = professionalClusterNodes
      .filter(n => !existingNodeNames.includes(n.name))
      .map(node => {
        const clusterInfo = clusterMap.get(node.clusterName);
        return {
          name: node.name,
          cpu_sockets: node.cpu_sockets,
          cpu_cores: node.cpu_cores,
          ram_gb: node.ram_gb,
          storage_total_tb: node.storage_total_tb,
          storage_used_tb: node.storage_used_tb,
          mgmt_ip: node.mgmt_ip,
          ilo_idrac_ip: node.ilo_idrac_ip,
          vendor: node.vendor,
          model: node.model,
          serial_number: node.serial_number,
          status: node.status,
          node_role: node.node_role,
          cluster_id: clusterInfo?.id,
          domain_id: clusterInfo?.domain_id,
        };
      })
      .filter(n => n.cluster_id && n.domain_id);

    if (newNodes.length > 0) {
      const { data: createdNodes, error: nodeError } = await supabase
        .from('cluster_nodes')
        .insert(newNodes)
        .select();
      
      if (nodeError) throw new Error(`Failed to create cluster nodes: ${nodeError.message}`);
      createdCounts.clusterNodes = createdNodes?.length || 0;
    }

    // 7. Create Maintenance Windows
    const { data: existingMW } = await supabase.from('maintenance_windows').select('title');
    const existingMWTitles = existingMW?.map(m => m.title) || [];
    const newMW = professionalMaintenanceWindows
      .filter(mw => !existingMWTitles.includes(mw.title))
      .map(mw => ({
        title: mw.title,
        description: mw.description,
        start_time: mw.start_time,
        end_time: mw.end_time,
        impact_level: mw.impact_level,
        status: mw.status,
        recurrence: mw.recurrence,
        domain_id: domainMap.get(mw.domainName),
        created_by: profile.id,
      }))
      .filter(mw => mw.domain_id);

    if (newMW.length > 0) {
      const { data: createdMW, error: mwError } = await supabase
        .from('maintenance_windows')
        .insert(newMW)
        .select();
      
      if (mwError) throw new Error(`Failed to create maintenance windows: ${mwError.message}`);
      createdCounts.maintenanceWindows = createdMW?.length || 0;
    }

    // 8. Create On-Call Schedules
    const { data: existingOC } = await supabase.from('on_call_schedules').select('name');
    const existingOCNames = existingOC?.map(o => o.name) || [];
    const newOC = professionalOnCallSchedules
      .filter(oc => !existingOCNames.includes(oc.name))
      .map(oc => ({
        name: oc.name,
        rotation_type: oc.rotation_type,
        is_active: oc.is_active,
        domain_id: domainMap.get(oc.domainName),
        created_by: profile.id,
      }))
      .filter(oc => oc.domain_id);

    if (newOC.length > 0) {
      const { data: createdOC, error: ocError } = await supabase
        .from('on_call_schedules')
        .insert(newOC)
        .select();
      
      if (ocError) throw new Error(`Failed to create on-call schedules: ${ocError.message}`);
      createdCounts.onCallSchedules = createdOC?.length || 0;
    }

    // 9. Create File Shares
    const { data: existingFS } = await supabase.from('file_shares').select('name');
    const existingFSNames = existingFS?.map(f => f.name) || [];
    const newFS = professionalFileShares
      .filter(fs => !existingFSNames.includes(fs.name))
      .map(fs => ({
        name: fs.name,
        path: fs.path,
        share_type: fs.share_type,
        scan_mode: fs.scan_mode,
        scan_depth: fs.scan_depth,
        exclude_patterns: fs.exclude_patterns,
        is_enabled: fs.is_enabled,
        domain_id: domainMap.get(fs.domainName),
        created_by: profile.id,
      }))
      .filter(fs => fs.domain_id);

    if (newFS.length > 0) {
      const { data: createdFS, error: fsError } = await supabase
        .from('file_shares')
        .insert(newFS)
        .select();
      
      if (fsError) throw new Error(`Failed to create file shares: ${fsError.message}`);
      createdCounts.fileShares = createdFS?.length || 0;
    }

    // 10. Create Vacations
    const newVacations = professionalVacations.map(v => ({
      status: v.status,
      vacation_type: v.vacation_type,
      start_date: v.start_date,
      end_date: v.end_date,
      notes: v.notes,
      profile_id: profile.id,
    }));

    // Only insert if no vacations exist for this user
    const { data: existingVacations } = await supabase
      .from('vacations')
      .select('id')
      .eq('profile_id', profile.id)
      .limit(1);

    if (!existingVacations || existingVacations.length === 0) {
      const { data: createdVacations, error: vacError } = await supabase
        .from('vacations')
        .insert(newVacations)
        .select();
      
      if (vacError) throw new Error(`Failed to create vacations: ${vacError.message}`);
      createdCounts.vacations = createdVacations?.length || 0;
    }

    // 11. Create Licenses (assign to first domain)
    const firstDomainId = domainMap.get('os.com');
    const { data: existingLicenses } = await supabase.from('licenses').select('name');
    const existingLicenseNames = existingLicenses?.map(l => l.name) || [];
    const newLicenses = professionalLicenses
      .filter(l => !existingLicenseNames.includes(l.name))
      .map(license => ({
        ...license,
        domain_id: firstDomainId,
        created_by: profile.id,
        purchase_date: '2023-01-01',
      }));

    if (newLicenses.length > 0) {
      const { data: createdLicenses, error: licenseError } = await supabase
        .from('licenses')
        .insert(newLicenses)
        .select();
      
      if (licenseError) throw new Error(`Failed to create licenses: ${licenseError.message}`);
      createdCounts.licenses = createdLicenses?.length || 0;
    }

    // 12. Create Tasks
    const { data: existingTasks } = await supabase.from('tasks').select('title');
    const existingTaskTitles = existingTasks?.map(t => t.title) || [];
    const newTasks = professionalTasks
      .filter(t => !existingTaskTitles.includes(t.title))
      .map(task => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        frequency: task.frequency,
        due_date: task.due_date,
        task_status: task.task_status,
        status: task.task_status === 'done' ? 'completed' : 'pending',
        assigned_to: profile.id,
        created_by: profile.id,
      }));

    if (newTasks.length > 0) {
      const { data: createdTasks, error: taskError } = await supabase
        .from('tasks')
        .insert(newTasks)
        .select();
      
      if (taskError) throw new Error(`Failed to create tasks: ${taskError.message}`);
      createdCounts.tasks = createdTasks?.length || 0;
    }

    // 13. Create Web Applications
    const { data: existingApps } = await supabase.from('website_applications').select('name');
    const existingAppNames = existingApps?.map(a => a.name) || [];
    const newWebApps = professionalWebApps
      .filter(a => !existingAppNames.includes(a.name))
      .map((app, index) => ({
        ...app,
        domain_id: allDomains?.[index % (allDomains?.length || 1)]?.id,
        created_by: profile.id,
      }));

    if (newWebApps.length > 0) {
      const { data: createdApps, error: appError } = await supabase
        .from('website_applications')
        .insert(newWebApps)
        .select();
      
      if (appError) throw new Error(`Failed to create web apps: ${appError.message}`);
      createdCounts.webApps = createdApps?.length || 0;
    }

    // 14. Create Vault Items
    const { data: existingVaultItems } = await supabase.from('vault_items').select('title');
    const existingVaultTitles = existingVaultItems?.map(v => v.title) || [];
    const newVaultItems = professionalVaultItems
      .filter(v => !existingVaultTitles.includes(v.title))
      .map(item => ({
        title: item.title,
        username: item.username,
        item_type: item.item_type,
        url: item.url,
        notes: item.notes,
        owner_id: profile.id,
        created_by: profile.id,
      }));

    if (newVaultItems.length > 0) {
      const { data: createdVaultItems, error: vaultError } = await supabase
        .from('vault_items')
        .insert(newVaultItems as any)
        .select();
      
      if (vaultError) throw new Error(`Failed to create vault items: ${vaultError.message}`);
      createdCounts.vaultItems = createdVaultItems?.length || 0;
    }

    // 15. Create Scan Agents
    const { data: existingAgents } = await supabase.from('scan_agents').select('name');
    const existingAgentNames = existingAgents?.map(a => a.name) || [];
    const newAgents = professionalScanAgents
      .filter(a => !existingAgentNames.includes(a.name))
      .map(agent => ({
        name: agent.name,
        site_tag: agent.site_tag,
        status: agent.status,
        version: agent.version,
        domain_id: domainMap.get(agent.domainName),
        created_by: profile.id,
        auth_token_hash: 'demo_token_' + agent.name.toLowerCase().replace(/-/g, '_'),
        last_seen_at: agent.status === 'ONLINE' ? new Date().toISOString() : null,
      }))
      .filter(a => a.domain_id);

    if (newAgents.length > 0) {
      const { data: createdAgents, error: agentError } = await supabase
        .from('scan_agents')
        .insert(newAgents)
        .select();
      
      if (agentError) throw new Error(`Failed to create scan agents: ${agentError.message}`);
      createdCounts.scanAgents = createdAgents?.length || 0;
    }

    const totalCreated = Object.values(createdCounts).reduce((a, b) => a + b, 0);
    
    return {
      success: true,
      message: totalCreated > 0 
        ? `تم إنشاء ${totalCreated} سجل تجريبي بنجاح`
        : 'لم يتم إنشاء سجلات جديدة (البيانات موجودة مسبقاً)',
      details: createdCounts,
    };

  } catch (error) {
    console.error('Seed data error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Reset and reseed all data
export async function resetAndSeedData(): Promise<SeedResult> {
  try {
    // Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    // Delete existing demo data (only items created by this user)
    await supabase.from('vacations').delete().eq('profile_id', profile.id);
    await supabase.from('vault_items').delete().eq('owner_id', profile.id);
    await supabase.from('tasks').delete().eq('created_by', profile.id);
    await supabase.from('scan_agents').delete().eq('created_by', profile.id);
    await supabase.from('cluster_nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clusters').delete().eq('created_by', profile.id);
    await supabase.from('datacenters').delete().eq('created_by', profile.id);
    await supabase.from('maintenance_windows').delete().eq('created_by', profile.id);
    await supabase.from('on_call_schedules').delete().eq('created_by', profile.id);
    await supabase.from('file_shares').delete().eq('created_by', profile.id);
    await supabase.from('website_applications').delete().eq('created_by', profile.id);
    await supabase.from('licenses').delete().eq('created_by', profile.id);
    await supabase.from('servers').delete().eq('created_by', profile.id);

    // Now seed fresh data
    return await seedAllData();
  } catch (error) {
    console.error('Reset and seed error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
