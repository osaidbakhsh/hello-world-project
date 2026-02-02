-- ============================================
-- SECURITY REMEDIATION MIGRATION
-- Full Remediation + UI Fix Pack
-- ============================================

-- A1: Fix servers RLS - NULL network_id Exposure
DROP POLICY IF EXISTS "Users can view servers in their networks" ON servers;
DROP POLICY IF EXISTS "Users can add servers to their networks" ON servers;

CREATE POLICY "servers_select_v2" ON servers FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

CREATE POLICY "servers_insert_v2" ON servers FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

-- A2: Fix licenses RLS - NULL domain_id Exposure
DROP POLICY IF EXISTS "Users can view licenses in their domains" ON licenses;

CREATE POLICY "licenses_select_v2" ON licenses FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

-- A3: Fix website_applications RLS - Publicly Readable
DROP POLICY IF EXISTS "Users can view active website applications" ON website_applications;

CREATE POLICY "website_applications_select_v2" ON website_applications FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() OR is_active = true
  )
);

-- A4: Fix on_call RLS - USING(true)
DROP POLICY IF EXISTS "Users can view on call schedules" ON on_call_schedules;
DROP POLICY IF EXISTS "Users can view on_call_assignments" ON on_call_assignments;

CREATE POLICY "on_call_schedules_select_v2" ON on_call_schedules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "on_call_assignments_select_v2" ON on_call_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- B1: Fix audit_logs insert - restrict to own user
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

CREATE POLICY "audit_logs_insert_v2" ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = get_my_profile_id())
);

-- B2: Fix vault_audit_logs insert - restrict to own user
DROP POLICY IF EXISTS "Authenticated users can insert vault audit logs" ON vault_audit_logs;

CREATE POLICY "vault_audit_logs_insert_v2" ON vault_audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = get_my_profile_id())
);

-- C1: Fix employee-reports storage policies - Admin only
DROP POLICY IF EXISTS "Authenticated users can read employee reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete employee reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload employee reports" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_delete" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_select" ON storage.objects;

CREATE POLICY "employee_reports_admin_select" ON storage.objects FOR SELECT
USING (bucket_id = 'employee-reports' AND is_admin());

CREATE POLICY "employee_reports_admin_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-reports' AND is_admin());

CREATE POLICY "employee_reports_admin_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'employee-reports' AND is_admin());

-- C2: MIME type restrictions
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'procurement-quotations';

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
]
WHERE id = 'employee-reports';