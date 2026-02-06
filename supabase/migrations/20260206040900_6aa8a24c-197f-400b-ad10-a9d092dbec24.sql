
-- PART 1: DATA MODEL HARDENING (FINAL CORRECTED)

-- 1.1 Add idempotency constraint for synced resources
ALTER TABLE public.resources 
ADD CONSTRAINT unique_resources_source_external UNIQUE (site_id, source, external_id);

-- 1.2 Add performance indexes
CREATE INDEX IF NOT EXISTS idx_resources_site_source ON public.resources(site_id, source);
CREATE INDEX IF NOT EXISTS idx_resources_integration ON public.resources(site_id, integration_id);
CREATE INDEX IF NOT EXISTS idx_discovered_resources_integration_time ON public.discovered_resources(integration_id, discovered_at DESC);

-- 1.3 Staging retention: Create a function to purge old staging rows (older than 14 days)
CREATE OR REPLACE FUNCTION public.cleanup_discovered_resources()
RETURNS TABLE(deleted_count bigint) AS $$
  WITH deleted AS (
    DELETE FROM public.discovered_resources
    WHERE discovered_at < now() - interval '14 days'
    RETURNING id
  )
  SELECT count(*) as deleted_count FROM deleted;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 1.4 Ensure integration_secrets RLS is fully locked down (server-side only)
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Secrets readable by server" ON public.integration_secrets;
DROP POLICY IF EXISTS "Secrets writable by server" ON public.integration_secrets;
DROP POLICY IF EXISTS "integration_secrets_no_access" ON public.integration_secrets;

-- Create restrictive policy that blocks all client access
CREATE POLICY "integration_secrets_server_only" 
  ON public.integration_secrets 
  FOR ALL 
  TO authenticated 
  USING (false) 
  WITH CHECK (false);

-- 1.5 Lock down discovered_resources writes to server-side only (no user inserts)
ALTER TABLE public.discovered_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discovered_resources_view" ON public.discovered_resources;
DROP POLICY IF EXISTS "discovered_resources_server_writes_only" ON public.discovered_resources;
DROP POLICY IF EXISTS "discovered_resources_no_user_writes" ON public.discovered_resources;

CREATE POLICY "discovered_resources_view_authenticated"
  ON public.discovered_resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "discovered_resources_no_user_inserts"
  ON public.discovered_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
