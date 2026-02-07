-- ==================================================================
-- POST-RESET VERIFICATION SQL CHECKLIST
-- Run these queries after reset to confirm:
--   1. All tenant tables are empty
--   2. Owner profile preserved (1 row, osaidbakhsh@gmail.com)
--   3. Owner super_admin role preserved
--   4. Role definitions intact
-- ==================================================================

-- ====================================================================
-- VERIFICATION #1: Verify All Tenant Tables Are Empty (count = 0)
-- ====================================================================
SELECT 'sites' as table_name, count(*) as row_count FROM sites
UNION ALL SELECT 'domains', count(*) FROM domains
UNION ALL SELECT 'datacenters', count(*) FROM datacenters
UNION ALL SELECT 'clusters', count(*) FROM clusters
UNION ALL SELECT 'networks', count(*) FROM networks
UNION ALL SELECT 'servers', count(*) FROM servers
UNION ALL SELECT 'resources', count(*) FROM resources
UNION ALL SELECT 'vms', count(*) FROM vms
UNION ALL SELECT 'tasks', count(*) FROM tasks
UNION ALL SELECT 'maintenance_windows', count(*) FROM maintenance_windows
UNION ALL SELECT 'on_call_schedules', count(*) FROM on_call_schedules
UNION ALL SELECT 'approval_requests', count(*) FROM approval_requests
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'role_assignments', count(*) FROM role_assignments
ORDER BY table_name;

-- Expected result: all count(*) = 0


-- ====================================================================
-- VERIFICATION #2: Verify Owner Profile Preserved (count = 1)
-- ====================================================================
SELECT id, user_id, email, full_name
FROM profiles
WHERE email = 'osaidbakhsh@gmail.com';

-- Expected: 1 row with osaidbakhsh@gmail.com


-- ====================================================================
-- VERIFICATION #3: Verify Other Profiles Deleted (count = 0)
-- ====================================================================
SELECT count(*) as other_profiles_count 
FROM profiles
WHERE email != 'osaidbakhsh@gmail.com';

-- Expected: 0


-- ====================================================================
-- VERIFICATION #4: Verify Owner Has super_admin Role
-- (Using corrected query with profiles JOIN)
-- ====================================================================
SELECT ur.user_id, ur.role, p.email
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
WHERE p.email = 'osaidbakhsh@gmail.com' AND ur.role = 'super_admin';

-- Expected: 1 row with role='super_admin' and email='osaidbakhsh@gmail.com'


-- ====================================================================
-- VERIFICATION #5: Verify Other user_roles Deleted (count = 0)
-- ====================================================================
SELECT count(*) as other_user_roles_count 
FROM user_roles
WHERE user_id NOT IN (SELECT user_id FROM profiles WHERE email = 'osaidbakhsh@gmail.com');

-- Expected: 0


-- ====================================================================
-- VERIFICATION #6: Verify Role Definitions Are Intact (count > 0)
-- ====================================================================
SELECT count(*) as roles_count FROM roles;

-- Expected: > 0 (SuperAdmin, SiteAdmin, DomainAdmin, etc. should exist)


-- ====================================================================
-- VERIFICATION #7: Verify Memberships Are Empty (count = 0)
-- ====================================================================
SELECT count(*) as site_memberships FROM site_memberships
UNION ALL SELECT count(*) FROM domain_memberships
UNION ALL SELECT count(*) FROM manager_assignments;

-- Expected: all 0


-- ====================================================================
-- COMPREHENSIVE VERIFICATION (all checks at once)
-- ====================================================================
WITH verification_checks AS (
  SELECT 'sites_empty' as check_name, count(*) as count, 0 as expected FROM sites
  UNION ALL SELECT 'tasks_empty', count(*), 0 FROM tasks
  UNION ALL SELECT 'domains_empty', count(*), 0 FROM domains
  UNION ALL SELECT 'role_assignments_empty', count(*), 0 FROM role_assignments
  UNION ALL SELECT 'approval_requests_empty', count(*), 0 FROM approval_requests
  UNION ALL SELECT 'audit_logs_empty', count(*), 0 FROM audit_logs
  UNION ALL SELECT 'owner_profile_exists', count(*), 1 
    FROM profiles WHERE email = 'osaidbakhsh@gmail.com'
  UNION ALL SELECT 'owner_has_super_admin', count(*), 1
    FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE p.email = 'osaidbakhsh@gmail.com' AND ur.role = 'super_admin'
  UNION ALL SELECT 'other_profiles_deleted', count(*), 0
    FROM profiles WHERE email != 'osaidbakhsh@gmail.com'
  UNION ALL SELECT 'other_user_roles_deleted', count(*), 0
    FROM user_roles WHERE user_id NOT IN (SELECT user_id FROM profiles WHERE email = 'osaidbakhsh@gmail.com')
  UNION ALL SELECT 'roles_definitions_exist', count(*), 1
    FROM roles LIMIT 1
)
SELECT
  check_name,
  count as actual,
  expected,
  CASE WHEN count = expected THEN '✓ PASS' ELSE '✗ FAIL' END as result
FROM verification_checks
ORDER BY result DESC, check_name;

-- Expected result: All checks should show "✓ PASS"
