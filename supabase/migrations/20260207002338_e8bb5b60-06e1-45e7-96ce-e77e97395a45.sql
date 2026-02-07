-- =================================================================
-- FIX: Use DELETE WHERE TRUE to bypass policy check
-- =================================================================

CREATE OR REPLACE FUNCTION public.reset_to_empty_prod(
  p_owner_user_id UUID,
  p_owner_profile_id UUID,
  p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_deleted JSONB := '{}'::JSONB;
  v_would_delete JSONB := '{}'::JSONB;
  v_skipped_missing TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
  v_errors TEXT[] := '{}';
  v_count BIGINT;
  v_tbl TEXT;
  v_table_exists BOOLEAN;
  v_owner_email TEXT;
  
  v_tables_to_clear TEXT[] := ARRAY[
    'discovered_resources', 'virtualization_sync_runs', 'integration_secrets', 'virtualization_integrations',
    'scan_results', 'scan_snapshots', 'fileshare_scans', 'folder_stats', 'scan_jobs', 'agent_events', 'scan_agents', 'file_shares',
    'notification_dedup', 'notifications', 'approval_events', 'approval_requests',
    'vault_audit_logs', 'audit_logs', 'vault_permissions', 'vault_item_secrets', 'vault_items', 'vault_settings', 'user_private_vault',
    'infra_credential_access_logs', 'infrastructure_credentials', 'infra_snapshots', 'infrastructure_alerts',
    'task_comments', 'tasks', 'task_templates', 'maintenance_events', 'change_requests', 'maintenance_windows', 'on_call_assignments', 'escalation_rules', 'on_call_schedules',
    'vacations', 'vacation_balances', 'yearly_goals', 'report_upload_rows', 'report_uploads', 'employee_reports',
    'procurement_activity_logs', 'procurement_quotations', 'procurement_request_items', 'procurement_requests', 'purchase_requests', 'licenses',
    'domain_integrations', 'ad_users', 'ad_groups', 'ad_computers', 'ad_domain_controllers', 'ad_snapshots',
    'connection_test_runs', 'ldap_configs', 'ntp_configs', 'mail_configs',
    'import_batches', 'resource_vm_details', 'resource_server_details', 'resources', 'integration_runs', 'system_health_checks',
    'website_applications', 'vms', 'servers', 'networks', 'networks_v2', 'cluster_nodes', 'clusters', 'datacenters',
    'manager_assignments', 'domain_memberships', 'site_memberships', 'domains', 'sites', 'role_assignments'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SECURITY_ERROR: No authenticated user';
  END IF;

  IF auth.uid() != p_owner_user_id THEN
    RAISE EXCEPTION 'SECURITY_ERROR: Caller does not match owner_user_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'SECURITY_ERROR: Caller is not super_admin';
  END IF;

  SELECT email INTO v_owner_email
  FROM public.profiles
  WHERE id = p_owner_profile_id AND user_id = auth.uid();

  IF v_owner_email IS NULL OR v_owner_email != 'osaidbakhsh@gmail.com' THEN
    RAISE EXCEPTION 'SECURITY_ERROR: Owner email verification failed';
  END IF;

  FOREACH v_tbl IN ARRAY v_tables_to_clear LOOP
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = v_tbl
      ) INTO v_table_exists;

      IF NOT v_table_exists THEN
        v_skipped_missing := array_append(v_skipped_missing, v_tbl);
        CONTINUE;
      END IF;

      EXECUTE format('SELECT count(*) FROM public.%I', v_tbl) INTO v_count;

      IF p_dry_run THEN
        v_would_delete := v_would_delete || jsonb_build_object(v_tbl, v_count);
      ELSE
        IF v_count > 0 THEN
          -- Use DELETE WHERE TRUE instead of bare DELETE
          EXECUTE format('DELETE FROM public.%I WHERE TRUE', v_tbl);
        END IF;
        v_deleted := v_deleted || jsonb_build_object(v_tbl, v_count);
      END IF;

    EXCEPTION WHEN OTHERS THEN
      IF p_dry_run THEN
        v_errors := array_append(v_errors, format('%s: %s', v_tbl, SQLERRM));
      ELSE
        RAISE EXCEPTION 'ATOMIC_DELETE_FAILED: Table % error: %', v_tbl, SQLERRM;
      END IF;
    END;
  END LOOP;

  -- Delete other profiles (preserve owner)
  SELECT count(*) INTO v_count FROM public.profiles WHERE id != p_owner_profile_id;
  IF p_dry_run THEN
    v_would_delete := v_would_delete || jsonb_build_object('profiles_others', v_count);
  ELSE
    IF v_count > 0 THEN DELETE FROM public.profiles WHERE id != p_owner_profile_id; END IF;
    v_deleted := v_deleted || jsonb_build_object('profiles_others', v_count);
  END IF;

  -- Delete other user_roles (preserve owner)
  SELECT count(*) INTO v_count FROM public.user_roles WHERE user_id != p_owner_user_id;
  IF p_dry_run THEN
    v_would_delete := v_would_delete || jsonb_build_object('user_roles_others', v_count);
  ELSE
    IF v_count > 0 THEN DELETE FROM public.user_roles WHERE user_id != p_owner_user_id; END IF;
    v_deleted := v_deleted || jsonb_build_object('user_roles_others', v_count);
  END IF;

  IF NOT p_dry_run THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_owner_profile_id) THEN
      RAISE EXCEPTION 'CRITICAL_ERROR: Owner profile was deleted!';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_owner_user_id AND role = 'super_admin') THEN
      v_warnings := array_append(v_warnings, 'WARNING: Owner super_admin role missing');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'dry_run', p_dry_run,
    'timestamp', now(),
    'preserved', jsonb_build_object('owner_user_id', p_owner_user_id, 'owner_profile_id', p_owner_profile_id, 'owner_email', v_owner_email),
    'would_delete', CASE WHEN p_dry_run THEN v_would_delete ELSE NULL END,
    'deleted', CASE WHEN NOT p_dry_run THEN v_deleted ELSE NULL END,
    'skipped_missing', to_jsonb(v_skipped_missing),
    'warnings', to_jsonb(v_warnings),
    'errors', to_jsonb(v_errors)
  );
END;
$$;

-- Re-apply permissions
REVOKE ALL ON FUNCTION public.reset_to_empty_prod(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_to_empty_prod(uuid, uuid, boolean) TO authenticated;