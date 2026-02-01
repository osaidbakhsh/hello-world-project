-- Datacenters Table
CREATE TABLE datacenters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clusters Table
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  datacenter_id UUID REFERENCES datacenters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cluster_type TEXT CHECK (cluster_type IN ('nutanix', 'vmware', 'hyperv', 'other')),
  vendor TEXT,
  platform_version TEXT,
  hypervisor_version TEXT,
  node_count INTEGER DEFAULT 0,
  storage_type TEXT CHECK (storage_type IN ('all-flash', 'hybrid', 'hdd')),
  rf_level TEXT CHECK (rf_level IN ('RF2', 'RF3')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cluster Nodes Table
CREATE TABLE cluster_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  node_role TEXT CHECK (node_role IN ('compute', 'storage', 'hybrid')) DEFAULT 'hybrid',
  serial_number TEXT,
  model TEXT,
  vendor TEXT,
  cpu_sockets INTEGER,
  cpu_cores INTEGER,
  ram_gb INTEGER,
  storage_total_tb DECIMAL(10,2),
  storage_used_tb DECIMAL(10,2),
  mgmt_ip TEXT,
  ilo_idrac_ip TEXT,
  status TEXT CHECK (status IN ('active', 'maintenance', 'decommissioned')) DEFAULT 'active',
  server_ref_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VMs Table
CREATE TABLE vms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  host_node_id UUID REFERENCES cluster_nodes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  ip_address TEXT,
  os TEXT,
  environment TEXT CHECK (environment IN ('production', 'development', 'testing', 'staging', 'dr')) DEFAULT 'production',
  status TEXT CHECK (status IN ('running', 'stopped', 'suspended', 'template')) DEFAULT 'running',
  vcpu INTEGER,
  ram_gb INTEGER,
  disk_total_gb INTEGER,
  tags TEXT[] DEFAULT '{}',
  owner_department TEXT,
  beneficiary TEXT,
  server_ref_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Infra Snapshots Table
CREATE TABLE infra_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  captured_at TIMESTAMPTZ DEFAULT now(),
  total_cpu_cores INTEGER DEFAULT 0,
  used_cpu_cores INTEGER DEFAULT 0,
  total_ram_gb INTEGER DEFAULT 0,
  used_ram_gb INTEGER DEFAULT 0,
  total_storage_tb DECIMAL(10,2) DEFAULT 0,
  used_storage_tb DECIMAL(10,2) DEFAULT 0,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_datacenters_domain ON datacenters(domain_id);
CREATE INDEX idx_clusters_domain ON clusters(domain_id);
CREATE INDEX idx_clusters_datacenter ON clusters(datacenter_id);
CREATE INDEX idx_cluster_nodes_cluster ON cluster_nodes(cluster_id);
CREATE INDEX idx_cluster_nodes_domain ON cluster_nodes(domain_id);
CREATE INDEX idx_vms_cluster ON vms(cluster_id);
CREATE INDEX idx_vms_domain ON vms(domain_id);
CREATE INDEX idx_vms_host ON vms(host_node_id);
CREATE INDEX idx_infra_snapshots_cluster ON infra_snapshots(cluster_id);
CREATE INDEX idx_infra_snapshots_domain ON infra_snapshots(domain_id);

-- Enable RLS on all tables
ALTER TABLE datacenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vms ENABLE ROW LEVEL SECURITY;
ALTER TABLE infra_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for datacenters
CREATE POLICY "Admins full access to datacenters" ON datacenters
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Domain editors can manage datacenters" ON datacenters
  FOR ALL TO authenticated 
  USING (can_edit_domain(domain_id)) 
  WITH CHECK (can_edit_domain(domain_id));

CREATE POLICY "Domain members can view datacenters" ON datacenters
  FOR SELECT TO authenticated 
  USING (is_admin() OR can_access_domain(domain_id));

-- RLS Policies for clusters
CREATE POLICY "Admins full access to clusters" ON clusters
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Domain editors can manage clusters" ON clusters
  FOR ALL TO authenticated 
  USING (can_edit_domain(domain_id)) 
  WITH CHECK (can_edit_domain(domain_id));

CREATE POLICY "Domain members can view clusters" ON clusters
  FOR SELECT TO authenticated 
  USING (is_admin() OR can_access_domain(domain_id));

-- RLS Policies for cluster_nodes
CREATE POLICY "Admins full access to cluster_nodes" ON cluster_nodes
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Domain editors can manage cluster_nodes" ON cluster_nodes
  FOR ALL TO authenticated 
  USING (can_edit_domain(domain_id)) 
  WITH CHECK (can_edit_domain(domain_id));

CREATE POLICY "Domain members can view cluster_nodes" ON cluster_nodes
  FOR SELECT TO authenticated 
  USING (is_admin() OR can_access_domain(domain_id));

-- RLS Policies for vms
CREATE POLICY "Admins full access to vms" ON vms
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Domain editors can manage vms" ON vms
  FOR ALL TO authenticated 
  USING (can_edit_domain(domain_id)) 
  WITH CHECK (can_edit_domain(domain_id));

CREATE POLICY "Domain members can view vms" ON vms
  FOR SELECT TO authenticated 
  USING (is_admin() OR can_access_domain(domain_id));

-- RLS Policies for infra_snapshots
CREATE POLICY "Admins full access to infra_snapshots" ON infra_snapshots
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Domain editors can manage infra_snapshots" ON infra_snapshots
  FOR ALL TO authenticated 
  USING (can_edit_domain(domain_id)) 
  WITH CHECK (can_edit_domain(domain_id));

CREATE POLICY "Domain members can view infra_snapshots" ON infra_snapshots
  FOR SELECT TO authenticated 
  USING (is_admin() OR can_access_domain(domain_id));