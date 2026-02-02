-- =====================================================
-- Phase 1: Security & Auth Foundations
-- =====================================================

-- 1.1 Add domain_role column to domain_memberships
ALTER TABLE domain_memberships 
ADD COLUMN IF NOT EXISTS domain_role text 
DEFAULT 'employee' 
CHECK (domain_role IN ('domain_admin', 'employee'));

-- 1.2 Add code column to domains for unique identification
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS code text UNIQUE;

-- 1.3 Create is_domain_admin helper function (SECURITY DEFINER, no recursion)
CREATE OR REPLACE FUNCTION public.is_domain_admin(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() 
      AND dm.domain_id = _domain_id
      AND dm.domain_role = 'domain_admin'
  )
$$;

-- =====================================================
-- Phase 2: Config Tables & Connection Test Runs
-- =====================================================

-- 2.1 LDAP Configurations
CREATE TABLE IF NOT EXISTS ldap_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  host text NOT NULL,
  port integer DEFAULT 389,
  use_tls boolean DEFAULT false,
  base_dn text,
  bind_dn text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.2 NTP Configurations
CREATE TABLE IF NOT EXISTS ntp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  servers text[] NOT NULL DEFAULT '{}',
  sync_interval_seconds integer DEFAULT 3600,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.3 Mail Configurations
CREATE TABLE IF NOT EXISTS mail_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  smtp_host text NOT NULL,
  smtp_port integer DEFAULT 587,
  use_tls boolean DEFAULT true,
  from_email text,
  from_name text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.4 Connection Test Runs
CREATE TABLE IF NOT EXISTS connection_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) NOT NULL,
  module text NOT NULL CHECK (module IN ('ldap', 'ntp', 'mail', 'fileshare', 'agent', 'storage')),
  ldap_config_id uuid REFERENCES ldap_configs(id) ON DELETE SET NULL,
  ntp_config_id uuid REFERENCES ntp_configs(id) ON DELETE SET NULL,
  mail_config_id uuid REFERENCES mail_configs(id) ON DELETE SET NULL,
  fileshare_id uuid REFERENCES file_shares(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('success', 'fail', 'validation_only')),
  latency_ms integer,
  message text,
  error_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Phase 3: System Health Checks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL CHECK (check_type IN ('auth', 'db', 'storage', 'realtime')),
  status text NOT NULL CHECK (status IN ('success', 'fail')),
  latency_ms integer,
  error_message text,
  error_details jsonb,
  checked_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Phase 4: Report Uploads Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id),
  employee_id uuid REFERENCES profiles(id),
  uploaded_by uuid REFERENCES profiles(id),
  file_path text NOT NULL,
  original_filename text NOT NULL,
  version integer DEFAULT 1,
  imported_rows integer DEFAULT 0,
  rejected_rows integer DEFAULT 0,
  import_summary jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_upload_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_upload_id uuid REFERENCES report_uploads(id) ON DELETE CASCADE NOT NULL,
  row_number integer NOT NULL,
  status text CHECK (status IN ('accepted', 'rejected')) NOT NULL,
  errors text[],
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Enable RLS on all new tables
-- =====================================================

ALTER TABLE ldap_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_upload_rows ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for config tables (domain-scoped)
-- Pattern: SELECT for members, CRUD for domain_admin/super_admin
-- =====================================================

-- LDAP Configs
CREATE POLICY "ldap_configs_select" ON ldap_configs FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "ldap_configs_insert" ON ldap_configs FOR INSERT
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "ldap_configs_update" ON ldap_configs FOR UPDATE
USING (is_super_admin() OR is_domain_admin(domain_id))
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "ldap_configs_delete" ON ldap_configs FOR DELETE
USING (is_super_admin() OR is_domain_admin(domain_id));

-- NTP Configs
CREATE POLICY "ntp_configs_select" ON ntp_configs FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "ntp_configs_insert" ON ntp_configs FOR INSERT
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "ntp_configs_update" ON ntp_configs FOR UPDATE
USING (is_super_admin() OR is_domain_admin(domain_id))
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "ntp_configs_delete" ON ntp_configs FOR DELETE
USING (is_super_admin() OR is_domain_admin(domain_id));

-- Mail Configs
CREATE POLICY "mail_configs_select" ON mail_configs FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "mail_configs_insert" ON mail_configs FOR INSERT
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "mail_configs_update" ON mail_configs FOR UPDATE
USING (is_super_admin() OR is_domain_admin(domain_id))
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "mail_configs_delete" ON mail_configs FOR DELETE
USING (is_super_admin() OR is_domain_admin(domain_id));

-- Connection Test Runs
CREATE POLICY "connection_test_runs_select" ON connection_test_runs FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "connection_test_runs_insert" ON connection_test_runs FOR INSERT
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "connection_test_runs_delete" ON connection_test_runs FOR DELETE
USING (is_super_admin());

-- System Health Checks (admin only)
CREATE POLICY "system_health_checks_select" ON system_health_checks FOR SELECT
USING (is_super_admin() OR is_admin());

CREATE POLICY "system_health_checks_insert" ON system_health_checks FOR INSERT
WITH CHECK (is_super_admin() OR is_admin());

CREATE POLICY "system_health_checks_delete" ON system_health_checks FOR DELETE
USING (is_super_admin());

-- Report Uploads
CREATE POLICY "report_uploads_select" ON report_uploads FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "report_uploads_insert" ON report_uploads FOR INSERT
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "report_uploads_update" ON report_uploads FOR UPDATE
USING (is_super_admin() OR is_domain_admin(domain_id))
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "report_uploads_delete" ON report_uploads FOR DELETE
USING (is_super_admin() OR is_domain_admin(domain_id));

-- Report Upload Rows (via parent)
CREATE POLICY "report_upload_rows_select" ON report_upload_rows FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_uploads ru 
    WHERE ru.id = report_upload_rows.report_upload_id 
    AND (is_super_admin() OR can_access_domain(ru.domain_id))
  )
);

CREATE POLICY "report_upload_rows_insert" ON report_upload_rows FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM report_uploads ru 
    WHERE ru.id = report_upload_rows.report_upload_id 
    AND (is_super_admin() OR is_domain_admin(ru.domain_id))
  )
);

CREATE POLICY "report_upload_rows_delete" ON report_upload_rows FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM report_uploads ru 
    WHERE ru.id = report_upload_rows.report_upload_id 
    AND (is_super_admin() OR is_domain_admin(ru.domain_id))
  )
);

-- =====================================================
-- Create employee-reports storage bucket
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-reports', 'employee-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee-reports bucket
CREATE POLICY "employee_reports_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "employee_reports_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "employee_reports_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-reports' AND auth.uid() IS NOT NULL);