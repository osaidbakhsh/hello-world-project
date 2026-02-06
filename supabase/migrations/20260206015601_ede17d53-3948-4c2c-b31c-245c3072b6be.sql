-- ============================================================
-- PHASE 1: DATA MODEL NORMALIZATION
-- Batch 1.1: Authoritative hierarchy + Batch 1.2: Polymorphic networks + Batch 1.3: Unified resources
-- ============================================================

-- Create enum for resource types
CREATE TYPE public.resource_type AS ENUM ('vm', 'physical_server', 'appliance', 'service', 'container', 'database');

-- Create enum for resource status
CREATE TYPE public.resource_status AS ENUM ('online', 'offline', 'maintenance', 'degraded', 'unknown', 'decommissioned');

-- Create enum for criticality levels
CREATE TYPE public.criticality_level AS ENUM ('critical', 'high', 'medium', 'low');

-- Create enum for network scope types
CREATE TYPE public.network_scope_type AS ENUM ('site', 'cluster');

-- ============================================================
-- NETWORKS V2: Polymorphic scoping (site OR cluster)
-- ============================================================
CREATE TABLE public.networks_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    scope_type network_scope_type NOT NULL DEFAULT 'site',
    scope_id UUID, -- References either sites.id or clusters.id based on scope_type
    name TEXT NOT NULL,
    cidr TEXT,
    vlan_id INTEGER,
    gateway TEXT,
    dns_servers TEXT[],
    description TEXT,
    tags TEXT[],
    is_management BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_scope CHECK (
        (scope_type = 'site' AND scope_id = site_id) OR
        (scope_type = 'cluster' AND scope_id IS NOT NULL)
    )
);

-- Create index for RLS and queries
CREATE INDEX idx_networks_v2_site ON public.networks_v2(site_id);
CREATE INDEX idx_networks_v2_scope ON public.networks_v2(scope_type, scope_id);
CREATE INDEX idx_networks_v2_vlan ON public.networks_v2(vlan_id) WHERE vlan_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_networks_v2_updated_at
    BEFORE UPDATE ON public.networks_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.networks_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for networks_v2
CREATE POLICY "Users can view networks in their sites"
    ON public.networks_v2 FOR SELECT
    USING (public.can_access_site(site_id));

CREATE POLICY "Site operators can manage networks"
    ON public.networks_v2 FOR ALL
    USING (public.can_manage_site(site_id))
    WITH CHECK (public.can_manage_site(site_id));

-- ============================================================
-- RESOURCES: Unified inventory table
-- ============================================================
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    cluster_id UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
    network_id UUID REFERENCES public.networks_v2(id) ON DELETE SET NULL,
    
    -- Core identification
    resource_type resource_type NOT NULL,
    name TEXT NOT NULL,
    hostname TEXT,
    fqdn TEXT,
    
    -- Network info
    primary_ip TEXT,
    secondary_ips TEXT[],
    mac_address TEXT,
    
    -- System info
    os TEXT,
    os_version TEXT,
    cpu_cores INTEGER,
    ram_gb NUMERIC(10,2),
    storage_gb NUMERIC(10,2),
    
    -- Classification
    status resource_status NOT NULL DEFAULT 'unknown',
    criticality criticality_level DEFAULT 'medium',
    environment TEXT, -- production, staging, development, etc.
    
    -- Ownership
    owner_team TEXT,
    owner_user_id UUID REFERENCES public.profiles(id),
    responsible_user_id UUID REFERENCES public.profiles(id),
    
    -- Business context
    application TEXT,
    department TEXT,
    cost_center TEXT,
    
    -- Lifecycle
    commissioned_at DATE,
    warranty_end DATE,
    eol_date DATE,
    eos_date DATE,
    
    -- Vendor info
    vendor TEXT,
    model TEXT,
    serial_number TEXT,
    asset_tag TEXT,
    
    -- Monitoring
    last_seen_at TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    
    -- Backup info
    is_backed_up BOOLEAN DEFAULT false,
    backup_policy TEXT,
    last_backup_at TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure unique hostname per site
    CONSTRAINT unique_hostname_per_site UNIQUE (site_id, hostname)
);

-- Indexes for common queries and RLS
CREATE INDEX idx_resources_site ON public.resources(site_id);
CREATE INDEX idx_resources_site_domain ON public.resources(site_id, domain_id);
CREATE INDEX idx_resources_site_cluster ON public.resources(site_id, cluster_id);
CREATE INDEX idx_resources_type ON public.resources(resource_type);
CREATE INDEX idx_resources_status ON public.resources(status);
CREATE INDEX idx_resources_criticality ON public.resources(criticality);
CREATE INDEX idx_resources_primary_ip ON public.resources(primary_ip) WHERE primary_ip IS NOT NULL;
CREATE INDEX idx_resources_hostname ON public.resources(hostname) WHERE hostname IS NOT NULL;
CREATE INDEX idx_resources_last_seen ON public.resources(last_seen_at DESC);
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags);

-- Trigger for updated_at
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
CREATE POLICY "Users can view resources in their sites"
    ON public.resources FOR SELECT
    USING (public.can_access_site(site_id));

CREATE POLICY "Site operators can manage resources"
    ON public.resources FOR ALL
    USING (public.can_manage_site(site_id))
    WITH CHECK (public.can_manage_site(site_id));

-- ============================================================
-- RESOURCE DETAILS: Type-specific extensions
-- ============================================================

-- VM-specific details
CREATE TABLE public.resource_vm_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    hypervisor_type TEXT, -- vmware, hyperv, proxmox, nutanix
    hypervisor_host TEXT,
    vm_id TEXT, -- Platform-specific VM ID
    template_name TEXT,
    is_template BOOLEAN DEFAULT false,
    tools_status TEXT,
    tools_version TEXT,
    snapshot_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_vm_resource UNIQUE (resource_id)
);

-- Physical server details
CREATE TABLE public.resource_server_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    datacenter_id UUID REFERENCES public.datacenters(id),
    rack_location TEXT,
    rack_unit INTEGER,
    power_supply_count INTEGER,
    ilo_ip TEXT, -- iLO/iDRAC/IPMI
    ilo_type TEXT,
    bios_version TEXT,
    firmware_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_server_resource UNIQUE (resource_id)
);

-- Indexes
CREATE INDEX idx_vm_details_resource ON public.resource_vm_details(resource_id);
CREATE INDEX idx_server_details_resource ON public.resource_server_details(resource_id);
CREATE INDEX idx_server_details_datacenter ON public.resource_server_details(datacenter_id);

-- Enable RLS (inherits from parent resource)
ALTER TABLE public.resource_vm_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_server_details ENABLE ROW LEVEL SECURITY;

-- RLS for VM details
CREATE POLICY "Users can view VM details for accessible resources"
    ON public.resource_vm_details FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND public.can_access_site(r.site_id)
    ));

CREATE POLICY "Site operators can manage VM details"
    ON public.resource_vm_details FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND public.can_manage_site(r.site_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND public.can_manage_site(r.site_id)
    ));

-- RLS for Server details
CREATE POLICY "Users can view server details for accessible resources"
    ON public.resource_server_details FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND public.can_access_site(r.site_id)
    ));

CREATE POLICY "Site operators can manage server details"
    ON public.resource_server_details FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND public.can_manage_site(r.site_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = resource_id AND public.can_manage_site(r.site_id)
    ));

-- ============================================================
-- HELPER FUNCTION: Get resources with details
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_resources_with_details(p_site_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    site_id UUID,
    domain_id UUID,
    cluster_id UUID,
    resource_type resource_type,
    name TEXT,
    hostname TEXT,
    primary_ip TEXT,
    os TEXT,
    status resource_status,
    criticality criticality_level,
    owner_team TEXT,
    last_seen_at TIMESTAMPTZ,
    vm_hypervisor_type TEXT,
    vm_hypervisor_host TEXT,
    server_rack_location TEXT,
    server_ilo_ip TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        r.id,
        r.site_id,
        r.domain_id,
        r.cluster_id,
        r.resource_type,
        r.name,
        r.hostname,
        r.primary_ip,
        r.os,
        r.status,
        r.criticality,
        r.owner_team,
        r.last_seen_at,
        vm.hypervisor_type,
        vm.hypervisor_host,
        srv.rack_location,
        srv.ilo_ip
    FROM public.resources r
    LEFT JOIN public.resource_vm_details vm ON vm.resource_id = r.id
    LEFT JOIN public.resource_server_details srv ON srv.resource_id = r.id
    WHERE (p_site_id IS NULL OR r.site_id = p_site_id)
      AND public.can_access_site(r.site_id)
    ORDER BY r.name;
$$;