-- Add domain_id to scan_results first
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES domains(id);

-- =====================================================
-- FIX SCAN_JOBS RLS
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage scan jobs" ON scan_jobs;
DROP POLICY IF EXISTS "Users can view scan jobs in their domains" ON scan_jobs;
DROP POLICY IF EXISTS "scan_jobs_select" ON scan_jobs;
DROP POLICY IF EXISTS "scan_jobs_insert" ON scan_jobs;
DROP POLICY IF EXISTS "scan_jobs_update" ON scan_jobs;
DROP POLICY IF EXISTS "scan_jobs_delete" ON scan_jobs;

CREATE POLICY "scan_jobs_select" ON scan_jobs FOR SELECT
  USING (is_super_admin() OR can_access_domain(domain_id) OR 
    (network_id IS NOT NULL AND can_access_network(network_id)));
CREATE POLICY "scan_jobs_insert" ON scan_jobs FOR INSERT
  WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));
CREATE POLICY "scan_jobs_update" ON scan_jobs FOR UPDATE
  USING (is_super_admin() OR is_domain_admin(domain_id));
CREATE POLICY "scan_jobs_delete" ON scan_jobs FOR DELETE
  USING (is_super_admin() OR is_domain_admin(domain_id));

-- =====================================================
-- FIX SCAN_RESULTS RLS (use scan_job.domain_id for results without domain_id)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage scan results" ON scan_results;
DROP POLICY IF EXISTS "Users can view scan results" ON scan_results;
DROP POLICY IF EXISTS "scan_results_select" ON scan_results;
DROP POLICY IF EXISTS "scan_results_insert" ON scan_results;
DROP POLICY IF EXISTS "scan_results_update" ON scan_results;
DROP POLICY IF EXISTS "scan_results_delete" ON scan_results;

CREATE POLICY "scan_results_select" ON scan_results FOR SELECT
  USING (is_super_admin() OR 
    (domain_id IS NOT NULL AND can_access_domain(domain_id)) OR 
    EXISTS (
      SELECT 1 FROM scan_jobs sj
      WHERE sj.id = scan_results.scan_job_id
      AND (can_access_domain(sj.domain_id) OR 
        (sj.network_id IS NOT NULL AND can_access_network(sj.network_id)))
    ));
CREATE POLICY "scan_results_insert" ON scan_results FOR INSERT
  WITH CHECK (is_super_admin() OR 
    (domain_id IS NOT NULL AND is_domain_admin(domain_id)) OR
    EXISTS (
      SELECT 1 FROM scan_jobs sj
      WHERE sj.id = scan_results.scan_job_id
      AND is_domain_admin(sj.domain_id)
    ));
CREATE POLICY "scan_results_update" ON scan_results FOR UPDATE
  USING (is_super_admin() OR 
    (domain_id IS NOT NULL AND is_domain_admin(domain_id)));
CREATE POLICY "scan_results_delete" ON scan_results FOR DELETE
  USING (is_super_admin() OR 
    (domain_id IS NOT NULL AND is_domain_admin(domain_id)));