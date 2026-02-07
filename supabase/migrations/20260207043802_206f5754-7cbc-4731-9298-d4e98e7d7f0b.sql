-- ============================================================
-- FIX: v_my_role_assignments - Add SECURITY INVOKER for consistency
-- Note: This view already uses auth.uid() for filtering, but adding
-- SECURITY INVOKER ensures underlying table RLS is respected
-- ============================================================

-- Step 1: Drop the existing view
DROP VIEW IF EXISTS public.v_my_role_assignments;

-- Step 2: Recreate with SECURITY INVOKER
CREATE VIEW public.v_my_role_assignments
WITH (security_invoker = true)
AS
SELECT 
    ra.id,
    ra.user_id,
    ra.role_id,
    r.name AS role_name,
    r.capabilities,
    ra.scope_type,
    ra.scope_id,
    ra.status,
    ra.granted_at,
    ra.notes,
    CASE ra.scope_type
        WHEN 'site'::role_scope_type THEN (SELECT sites.name FROM sites WHERE sites.id = ra.scope_id)
        WHEN 'domain'::role_scope_type THEN (SELECT domains.name FROM domains WHERE domains.id = ra.scope_id)
        WHEN 'cluster'::role_scope_type THEN (SELECT clusters.name FROM clusters WHERE clusters.id = ra.scope_id)
        ELSE NULL::text
    END AS scope_name,
    CASE ra.scope_type
        WHEN 'site'::role_scope_type THEN ra.scope_id
        WHEN 'domain'::role_scope_type THEN (SELECT domains.site_id FROM domains WHERE domains.id = ra.scope_id)
        WHEN 'cluster'::role_scope_type THEN (SELECT dc.site_id FROM clusters c JOIN datacenters dc ON dc.id = c.datacenter_id WHERE c.id = ra.scope_id)
        ELSE NULL::uuid
    END AS owning_site_id
FROM role_assignments ra
JOIN roles r ON r.id = ra.role_id
WHERE ra.user_id = auth.uid() AND ra.status = 'active'::role_status_type;

-- Step 3: Grant SELECT to authenticated users
GRANT SELECT ON public.v_my_role_assignments TO authenticated;

-- Step 4: Add documentation
COMMENT ON VIEW public.v_my_role_assignments IS 
'Returns role assignments for the current authenticated user only.
Uses SECURITY INVOKER to respect RLS policies on underlying tables.';