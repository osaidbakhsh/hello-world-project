-- ============================================================
-- VIRTUALIZATION INTEGRATIONS MODULE
-- Isolated, optional feature for hypervisor integrations
-- ============================================================

-- 1) virtualization_integrations - main config table
CREATE TABLE public.virtualization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('nutanix_prism', 'hyperv')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'enabled', 'degraded')),
  mode TEXT NOT NULL DEFAULT 'preview' CHECK (mode IN ('preview', 'sync')),
  config_json JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_virt_integrations_site ON public.virtualization_integrations(site_id);
CREATE INDEX idx_virt_integrations_type ON public.virtualization_integrations(integration_type);
CREATE INDEX idx_virt_integrations_status ON public.virtualization_integrations(status);

-- 2) integration_secrets - server-side only (no frontend access)
CREATE TABLE public.integration_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.virtualization_integrations(id) ON DELETE CASCADE,
  secret_type TEXT NOT NULL CHECK (secret_type IN ('basic_auth', 'token', 'winrm', 'ssh')),
  secret_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_secrets_integration ON public.integration_secrets(integration_id);

-- 3) virtualization_sync_runs - sync job history
CREATE TABLE public.virtualization_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.virtualization_integrations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  success BOOLEAN,
  mode TEXT NOT NULL CHECK (mode IN ('preview', 'sync')),
  stats_json JSONB DEFAULT '{}',
  error_summary TEXT,
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_sync_runs_integration ON public.virtualization_sync_runs(integration_id, started_at DESC);

-- 4) discovered_resources - staging table for preview mode
CREATE TABLE public.discovered_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.virtualization_integrations(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.virtualization_sync_runs(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('vm', 'host', 'network')),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ip_address TEXT,
  domain_id UUID REFERENCES public.domains(id),
  cluster_id UUID REFERENCES public.clusters(id),
  network_id UUID,
  attributes_json JSONB DEFAULT '{}',
  diff_action TEXT CHECK (diff_action IN ('create', 'update', 'delete', 'unchanged'))
);

CREATE UNIQUE INDEX idx_discovered_resources_unique 
  ON public.discovered_resources(integration_id, resource_type, external_id, discovered_at);
CREATE INDEX idx_discovered_resources_integration ON public.discovered_resources(integration_id, discovered_at DESC);
CREATE INDEX idx_discovered_resources_run ON public.discovered_resources(run_id);

-- 5) Add source tracking to resources table for sync identification
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.virtualization_integrations(id);

CREATE INDEX IF NOT EXISTS idx_resources_source ON public.resources(source);
CREATE INDEX IF NOT EXISTS idx_resources_external_id ON public.resources(external_id) WHERE external_id IS NOT NULL;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.virtualization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtualization_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_resources ENABLE ROW LEVEL SECURITY;

-- virtualization_integrations: view with site membership
CREATE POLICY "Users can view integrations for their sites"
  ON public.virtualization_integrations FOR SELECT
  USING (
    site_id IN (
      SELECT sm.site_id FROM site_memberships sm WHERE sm.profile_id = auth.uid()
    )
  );

-- virtualization_integrations: manage with site_admin role
CREATE POLICY "Site admins can insert integrations"
  ON public.virtualization_integrations FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT sm.site_id FROM site_memberships sm 
      WHERE sm.profile_id = auth.uid() AND sm.site_role = 'site_admin'
    )
  );

CREATE POLICY "Site admins can update integrations"
  ON public.virtualization_integrations FOR UPDATE
  USING (
    site_id IN (
      SELECT sm.site_id FROM site_memberships sm 
      WHERE sm.profile_id = auth.uid() AND sm.site_role = 'site_admin'
    )
  );

CREATE POLICY "Site admins can delete integrations"
  ON public.virtualization_integrations FOR DELETE
  USING (
    site_id IN (
      SELECT sm.site_id FROM site_memberships sm 
      WHERE sm.profile_id = auth.uid() AND sm.site_role = 'site_admin'
    )
  );

-- integration_secrets: NO frontend access - server-side only
CREATE POLICY "Secrets are server-side only"
  ON public.integration_secrets FOR ALL
  USING (false)
  WITH CHECK (false);

-- virtualization_sync_runs: view with site access
CREATE POLICY "Users can view sync runs for their sites"
  ON public.virtualization_sync_runs FOR SELECT
  USING (
    integration_id IN (
      SELECT vi.id FROM virtualization_integrations vi
      JOIN site_memberships sm ON vi.site_id = sm.site_id
      WHERE sm.profile_id = auth.uid()
    )
  );

-- discovered_resources: view with site access
CREATE POLICY "Users can view discovered resources for their sites"
  ON public.discovered_resources FOR SELECT
  USING (
    site_id IN (
      SELECT sm.site_id FROM site_memberships sm WHERE sm.profile_id = auth.uid()
    )
  );

-- discovered_resources: writes are server-side only
CREATE POLICY "Discovered resources write is server-side only"
  ON public.discovered_resources FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Discovered resources update is server-side only"
  ON public.discovered_resources FOR UPDATE
  USING (false);

CREATE POLICY "Discovered resources delete is server-side only"
  ON public.discovered_resources FOR DELETE
  USING (false);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at for virtualization_integrations
CREATE TRIGGER update_virt_integrations_updated_at
  BEFORE UPDATE ON public.virtualization_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for integration_secrets
CREATE TRIGGER update_integration_secrets_updated_at
  BEFORE UPDATE ON public.integration_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();