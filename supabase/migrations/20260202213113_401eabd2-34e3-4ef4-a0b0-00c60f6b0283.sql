-- ============================================
-- FINAL CORRECTIONS MIGRATION
-- Addresses remaining RLS gaps and triggers
-- ============================================

-- 1.1: Servers UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users can update servers in their networks" ON servers;

CREATE POLICY "servers_update_v2" ON servers FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

CREATE POLICY "servers_delete_v2" ON servers FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

-- 1.2: Licenses UPDATE/DELETE policies
CREATE POLICY "licenses_update_v2" ON licenses FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

CREATE POLICY "licenses_delete_v2" ON licenses FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

-- 2.1: website_applications domain-scoped
DROP POLICY IF EXISTS "website_applications_select_v2" ON website_applications;

CREATE POLICY "website_applications_select_v3" ON website_applications FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
    OR (domain_id IS NULL AND is_active = true)
  )
);

CREATE POLICY "website_applications_update_v2" ON website_applications FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_edit_domain(domain_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_edit_domain(domain_id))
  )
);

CREATE POLICY "website_applications_delete_v2" ON website_applications FOR DELETE
USING (auth.uid() IS NOT NULL AND is_admin());

-- 2.2: on_call_schedules domain-scoped
DROP POLICY IF EXISTS "on_call_schedules_select_v2" ON on_call_schedules;

CREATE POLICY "on_call_schedules_select_v3" ON on_call_schedules FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
    OR domain_id IS NULL
  )
);

-- 2.3: on_call_assignments domain-scoped via schedule
DROP POLICY IF EXISTS "on_call_assignments_select_v2" ON on_call_assignments;

CREATE POLICY "on_call_assignments_select_v3" ON on_call_assignments FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR profile_id = get_my_profile_id()
    OR EXISTS (
      SELECT 1 FROM on_call_schedules s 
      WHERE s.id = on_call_assignments.schedule_id 
      AND (s.domain_id IS NULL OR can_access_domain(s.domain_id))
    )
  )
);

-- 3.1: audit_logs trigger
CREATE OR REPLACE FUNCTION validate_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := get_my_profile_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_insert_validator ON audit_logs;
CREATE TRIGGER audit_log_insert_validator
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_audit_log_insert();

-- 3.2: vault_audit_logs trigger
CREATE OR REPLACE FUNCTION validate_vault_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := get_my_profile_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vault_audit_log_insert_validator ON vault_audit_logs;
CREATE TRIGGER vault_audit_log_insert_validator
BEFORE INSERT ON vault_audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_vault_audit_log_insert();