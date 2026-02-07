-- ============================================================
-- FIX: server_inventory_view RLS Bypass Security Vulnerability
-- Problem: SECURITY DEFINER allows any authenticated user to see all servers
-- Solution: Recreate view with SECURITY INVOKER to enforce RLS
-- ============================================================

-- Step 1: Drop the existing insecure view
DROP VIEW IF EXISTS public.server_inventory_view;

-- Step 2: Recreate with SECURITY INVOKER (respects RLS policies)
CREATE VIEW public.server_inventory_view
WITH (security_invoker = true)
AS
SELECT 
    r.id,
    r.id AS resource_id,
    s.id AS server_id,
    r.site_id,
    COALESCE(r.domain_id, s.domain_id) AS domain_id,
    s.network_id,
    r.name,
    r.hostname,
    r.primary_ip AS ip_address,
    r.os AS operating_system,
    (r.status)::text AS status,
    (r.criticality)::text AS criticality,
    r.environment,
    r.owner_team AS owner,
    COALESCE((r.cpu_cores)::text, s.cpu) AS cpu,
    COALESCE(
        CASE
            WHEN (r.ram_gb IS NOT NULL) THEN ((r.ram_gb)::text || ' GB'::text)
            ELSE NULL::text
        END, s.ram) AS ram,
    COALESCE(
        CASE
            WHEN (r.storage_gb IS NOT NULL) THEN ((r.storage_gb)::text || ' GB'::text)
            ELSE NULL::text
        END, s.disk_space) AS disk_space,
    r.vendor,
    r.model,
    r.serial_number,
    r.warranty_end,
    r.eol_date,
    r.eos_date,
    r.is_backed_up,
    r.backup_policy,
    s.beneficiary_department,
    s.primary_application,
    s.business_owner,
    s.is_backed_up_by_veeam,
    s.backup_frequency,
    s.backup_job_name,
    s.purchase_date,
    s.contract_id,
    s.support_level,
    s.server_role,
    s.rpo_hours,
    s.rto_hours,
    s.last_restore_test,
    s.responsible_user,
    r.notes,
    r.tags,
    r.created_at,
    r.updated_at,
    r.created_by,
    n.name AS network_name,
    d.name AS domain_name,
    site.name AS site_name
FROM resources r
JOIN servers s ON s.resource_id = r.id
LEFT JOIN networks n ON n.id = s.network_id
LEFT JOIN domains d ON d.id = COALESCE(r.domain_id, s.domain_id)
LEFT JOIN sites site ON site.id = r.site_id
WHERE r.resource_type = 'physical_server'::resource_type;

-- Step 3: Grant SELECT to authenticated users (RLS will filter results)
GRANT SELECT ON public.server_inventory_view TO authenticated;

-- Step 4: Add comment for documentation
COMMENT ON VIEW public.server_inventory_view IS 
'Flattened view of physical servers joining resources and servers tables. 
Uses SECURITY INVOKER to respect RLS policies on underlying tables.
Data visibility is controlled by RLS on resources and servers tables.';