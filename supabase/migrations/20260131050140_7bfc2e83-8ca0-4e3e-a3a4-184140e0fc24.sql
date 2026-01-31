-- ============================================
-- Phase 1: Create New Tables Only (Tables might not exist)
-- ============================================

-- 1. Website Applications (Quick Links) - Drop if exists first
DROP TABLE IF EXISTS public.website_applications CASCADE;

CREATE TABLE public.website_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  icon TEXT,
  description TEXT,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.website_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on website_applications"
  ON public.website_applications FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view active website applications"
  ON public.website_applications FOR SELECT
  USING (is_active = true OR is_admin());

-- 2. Notifications System
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (user_id = get_my_profile_id() OR is_admin());

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = get_my_profile_id());

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (is_admin());

-- 3. Audit Log
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Phase 2: Seed Demo Data (Use UPSERT pattern)
-- ============================================

-- Get existing domain IDs or insert new ones
DO $$
DECLARE
  domain1_id UUID;
  domain2_id UUID;
  domain3_id UUID;
BEGIN
  -- Try to get existing domain IDs
  SELECT id INTO domain1_id FROM public.domains WHERE name = 'osaidtest1.com' LIMIT 1;
  SELECT id INTO domain2_id FROM public.domains WHERE name = 'osaidtest2.com' LIMIT 1;
  SELECT id INTO domain3_id FROM public.domains WHERE name = 'osaidtest3.com' LIMIT 1;

  -- Insert new domains only if they don't exist
  IF domain1_id IS NULL THEN
    INSERT INTO public.domains (name, description) VALUES ('osaidtest1.com', 'Production Domain - Main Infrastructure') RETURNING id INTO domain1_id;
  END IF;
  
  IF domain2_id IS NULL THEN
    INSERT INTO public.domains (name, description) VALUES ('osaidtest2.com', 'Development Domain - Dev & Testing') RETURNING id INTO domain2_id;
  END IF;
  
  IF domain3_id IS NULL THEN
    INSERT INTO public.domains (name, description) VALUES ('osaidtest3.com', 'DR Domain - Disaster Recovery Site') RETURNING id INTO domain3_id;
  END IF;

  -- Insert Networks
  INSERT INTO public.networks (name, subnet, gateway, domain_id, description, dns_servers)
  SELECT 'LAN-PROD', '10.0.1.0/24', '10.0.1.1', domain1_id, 'Production LAN Network', ARRAY['10.0.1.10', '10.0.1.11']
  WHERE NOT EXISTS (SELECT 1 FROM public.networks WHERE name = 'LAN-PROD' AND domain_id = domain1_id);

  INSERT INTO public.networks (name, subnet, gateway, domain_id, description, dns_servers)
  SELECT 'DMZ-PROD', '172.16.1.0/24', '172.16.1.1', domain1_id, 'Production DMZ Network', ARRAY['172.16.1.10']
  WHERE NOT EXISTS (SELECT 1 FROM public.networks WHERE name = 'DMZ-PROD' AND domain_id = domain1_id);

  INSERT INTO public.networks (name, subnet, gateway, domain_id, description, dns_servers)
  SELECT 'MGMT-PROD', '192.168.1.0/24', '192.168.1.1', domain1_id, 'Production Management Network', ARRAY['192.168.1.10']
  WHERE NOT EXISTS (SELECT 1 FROM public.networks WHERE name = 'MGMT-PROD' AND domain_id = domain1_id);

  INSERT INTO public.networks (name, subnet, gateway, domain_id, description, dns_servers)
  SELECT 'LAN-DEV', '10.0.2.0/24', '10.0.2.1', domain2_id, 'Development LAN Network', ARRAY['10.0.2.10']
  WHERE NOT EXISTS (SELECT 1 FROM public.networks WHERE name = 'LAN-DEV' AND domain_id = domain2_id);

  INSERT INTO public.networks (name, subnet, gateway, domain_id, description, dns_servers)
  SELECT 'DMZ-DEV', '172.16.2.0/24', '172.16.2.1', domain2_id, 'Development DMZ Network', ARRAY['172.16.2.10']
  WHERE NOT EXISTS (SELECT 1 FROM public.networks WHERE name = 'DMZ-DEV' AND domain_id = domain2_id);

  INSERT INTO public.networks (name, subnet, gateway, domain_id, description, dns_servers)
  SELECT 'LAN-DR', '10.0.3.0/24', '10.0.3.1', domain3_id, 'DR Site LAN Network', ARRAY['10.0.3.10']
  WHERE NOT EXISTS (SELECT 1 FROM public.networks WHERE name = 'LAN-DR' AND domain_id = domain3_id);

END $$;

-- Insert Demo Servers using existing network references
INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'DC01-PROD', '10.0.1.10', 'Windows Server 2022', 'production', 'active', 'IT Department', 'Osaid', 'Primary Domain Controller', n.id, '4 vCPU', '16 GB', '500 GB'
FROM public.networks n WHERE n.name = 'LAN-PROD'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'DC01-PROD');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'DC02-PROD', '10.0.1.11', 'Windows Server 2022', 'production', 'active', 'IT Department', 'Osaid', 'Secondary Domain Controller', n.id, '4 vCPU', '16 GB', '500 GB'
FROM public.networks n WHERE n.name = 'LAN-PROD'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'DC02-PROD');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'CA01-PROD', '10.0.1.12', 'Windows Server 2019', 'production', 'active', 'Security Team', 'Ahmed', 'Certificate Authority', n.id, '2 vCPU', '8 GB', '200 GB'
FROM public.networks n WHERE n.name = 'LAN-PROD'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'CA01-PROD');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'FILESERVER01', '10.0.1.20', 'Windows Server 2022', 'production', 'active', 'IT Department', 'Osaid', 'Main File Server', n.id, '8 vCPU', '32 GB', '4 TB'
FROM public.networks n WHERE n.name = 'LAN-PROD'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'FILESERVER01');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'WEB-PROD-01', '172.16.1.10', 'Ubuntu 22.04 LTS', 'production', 'active', 'DevOps Team', 'Mohammed', 'Production Web Server', n.id, '4 vCPU', '16 GB', '200 GB'
FROM public.networks n WHERE n.name = 'DMZ-PROD'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'WEB-PROD-01');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'DC01-DEV', '10.0.2.10', 'Windows Server 2019', 'development', 'active', 'IT Department', 'Khalid', 'Dev Domain Controller', n.id, '2 vCPU', '8 GB', '200 GB'
FROM public.networks n WHERE n.name = 'LAN-DEV'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'DC01-DEV');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'WEB-DEV-01', '172.16.2.10', 'Ubuntu 22.04 LTS', 'development', 'active', 'DevOps Team', 'Mohammed', 'Development Web Server', n.id, '2 vCPU', '8 GB', '100 GB'
FROM public.networks n WHERE n.name = 'DMZ-DEV'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'WEB-DEV-01');

INSERT INTO public.servers (name, ip_address, operating_system, environment, status, owner, responsible_user, notes, network_id, cpu, ram, disk_space)
SELECT 'DC01-DR', '10.0.3.10', 'Windows Server 2022', 'staging', 'maintenance', 'IT Department', 'Osaid', 'DR Domain Controller', n.id, '4 vCPU', '16 GB', '500 GB'
FROM public.networks n WHERE n.name = 'LAN-DR'
AND NOT EXISTS (SELECT 1 FROM public.servers WHERE name = 'DC01-DR');

-- Insert Demo Licenses
INSERT INTO public.licenses (name, vendor, license_key, expiry_date, purchase_date, quantity, cost, status, domain_id, notes)
SELECT 'Windows Server 2022 Datacenter', 'Microsoft', 'XXXXX-XXXXX-XXXXX-XXXXX-WS2022', (CURRENT_DATE + INTERVAL '15 days')::date, (CURRENT_DATE - INTERVAL '350 days')::date, 10, 15000, 'active', d.id, 'Expiring soon - needs renewal'
FROM public.domains d WHERE d.name = 'osaidtest1.com'
AND NOT EXISTS (SELECT 1 FROM public.licenses WHERE name = 'Windows Server 2022 Datacenter');

INSERT INTO public.licenses (name, vendor, license_key, expiry_date, purchase_date, quantity, cost, status, domain_id, notes)
SELECT 'Microsoft 365 E5', 'Microsoft', 'M365-E5-ENTERPRISE-KEY', (CURRENT_DATE + INTERVAL '180 days')::date, (CURRENT_DATE - INTERVAL '185 days')::date, 50, 25000, 'active', d.id, 'Annual subscription'
FROM public.domains d WHERE d.name = 'osaidtest1.com'
AND NOT EXISTS (SELECT 1 FROM public.licenses WHERE name = 'Microsoft 365 E5');

INSERT INTO public.licenses (name, vendor, license_key, expiry_date, purchase_date, quantity, cost, status, domain_id, notes)
SELECT 'VMware vSphere Enterprise Plus', 'VMware', 'VMWARE-VSPHERE-8-KEY', (CURRENT_DATE - INTERVAL '10 days')::date, (CURRENT_DATE - INTERVAL '375 days')::date, 5, 30000, 'expired', d.id, 'EXPIRED - urgent renewal needed'
FROM public.domains d WHERE d.name = 'osaidtest1.com'
AND NOT EXISTS (SELECT 1 FROM public.licenses WHERE name = 'VMware vSphere Enterprise Plus');

INSERT INTO public.licenses (name, vendor, license_key, expiry_date, purchase_date, quantity, cost, status, domain_id, notes)
SELECT 'Veeam Backup & Replication', 'Veeam', 'VEEAM-VBR-12-KEY', (CURRENT_DATE + INTERVAL '25 days')::date, (CURRENT_DATE - INTERVAL '340 days')::date, 10, 12000, 'active', d.id, 'Backup solution - expiring soon'
FROM public.domains d WHERE d.name = 'osaidtest1.com'
AND NOT EXISTS (SELECT 1 FROM public.licenses WHERE name = 'Veeam Backup & Replication');

-- Insert Demo Website Applications
INSERT INTO public.website_applications (name, url, category, icon, description, is_active) VALUES
  ('Active Directory', 'https://ad.osaidtest1.com', 'Identity', 'users', 'Active Directory Management Console', true),
  ('VMware vCenter', 'https://vcenter.osaidtest1.com', 'Virtualization', 'server', 'VMware vCenter Server', true),
  ('Veeam Backup', 'https://backup.osaidtest1.com', 'Backup', 'hard-drive', 'Veeam Backup & Replication Console', true),
  ('Zabbix Monitoring', 'https://zabbix.osaidtest1.com', 'Monitoring', 'activity', 'Infrastructure Monitoring System', true),
  ('GitLab', 'https://gitlab.osaidtest2.com', 'DevOps', 'git-branch', 'Source Code Repository', true),
  ('Jenkins', 'https://jenkins.osaidtest2.com', 'DevOps', 'cog', 'CI/CD Pipeline Server', true),
  ('Grafana', 'https://grafana.osaidtest1.com', 'Monitoring', 'bar-chart-2', 'Metrics & Visualization Dashboard', true),
  ('Wiki Documentation', 'https://wiki.osaidtest1.com', 'Documentation', 'book', 'Internal Knowledge Base', true);