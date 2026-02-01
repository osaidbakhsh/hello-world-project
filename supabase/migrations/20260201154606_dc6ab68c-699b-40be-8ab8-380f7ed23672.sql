-- =====================================================
-- FILE SHARE ANALYTICS MODULE - Database Schema
-- =====================================================

-- 1. Helper Function: can_edit_domain
CREATE OR REPLACE FUNCTION public.can_edit_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() 
      AND dm.domain_id = _domain_id
      AND dm.can_edit = true
  ) OR public.is_admin()
$$;

-- 2. Scan Agents Table (must be created before file_shares)
CREATE TABLE public.scan_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  site_tag TEXT,
  status TEXT DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE')),
  last_seen_at TIMESTAMPTZ,
  version TEXT,
  auth_token_hash TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. File Shares Table
CREATE TABLE public.file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('SMB', 'NFS', 'LOCAL')),
  path TEXT NOT NULL,
  scan_mode TEXT NOT NULL CHECK (scan_mode IN ('DIRECT', 'AGENT')),
  agent_id UUID REFERENCES public.scan_agents(id) ON DELETE SET NULL,
  credential_vault_id UUID REFERENCES public.vault_items(id) ON DELETE SET NULL,
  scan_depth INTEGER DEFAULT 10,
  exclude_patterns TEXT[] DEFAULT '{}',
  schedule_cron TEXT,
  maintenance_window_id UUID REFERENCES public.maintenance_windows(id) ON DELETE SET NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. File Share Scans Table
CREATE TABLE public.fileshare_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_share_id UUID REFERENCES public.file_shares(id) ON DELETE CASCADE NOT NULL,
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
  scan_mode TEXT NOT NULL CHECK (scan_mode IN ('DIRECT', 'AGENT')),
  agent_id UUID REFERENCES public.scan_agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_code TEXT CHECK (error_code IS NULL OR error_code IN ('ACCESS_DENIED', 'PATH_NOT_FOUND', 'TIMEOUT', 'IO_ERROR')),
  log_text TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Scan Snapshots Table
CREATE TABLE public.scan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_share_id UUID REFERENCES public.file_shares(id) ON DELETE CASCADE NOT NULL,
  scan_id UUID REFERENCES public.fileshare_scans(id) ON DELETE CASCADE NOT NULL,
  total_bytes BIGINT DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  total_folders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Folder Stats Table
CREATE TABLE public.folder_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.scan_snapshots(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.folder_stats(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  size_bytes BIGINT DEFAULT 0,
  files_count INTEGER DEFAULT 0,
  folders_count INTEGER DEFAULT 0,
  percent_of_share DECIMAL(5,2) DEFAULT 0
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_scan_agents_domain ON public.scan_agents(domain_id);
CREATE INDEX idx_scan_agents_status ON public.scan_agents(status);
CREATE INDEX idx_file_shares_domain ON public.file_shares(domain_id);
CREATE INDEX idx_file_shares_agent ON public.file_shares(agent_id);
CREATE INDEX idx_file_shares_enabled ON public.file_shares(is_enabled);
CREATE INDEX idx_fileshare_scans_share ON public.fileshare_scans(file_share_id);
CREATE INDEX idx_fileshare_scans_status ON public.fileshare_scans(status);
CREATE INDEX idx_fileshare_scans_agent ON public.fileshare_scans(agent_id);
CREATE INDEX idx_scan_snapshots_share ON public.scan_snapshots(file_share_id);
CREATE INDEX idx_scan_snapshots_scan ON public.scan_snapshots(scan_id);
CREATE INDEX idx_folder_stats_snapshot ON public.folder_stats(snapshot_id);
CREATE INDEX idx_folder_stats_parent ON public.folder_stats(parent_id);
CREATE INDEX idx_folder_stats_depth ON public.folder_stats(depth);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at for file_shares
CREATE TRIGGER update_file_shares_updated_at
  BEFORE UPDATE ON public.file_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate agent belongs to same domain as file_share
CREATE OR REPLACE FUNCTION public.check_agent_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_mode = 'AGENT' AND NEW.agent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.scan_agents 
      WHERE id = NEW.agent_id AND domain_id = NEW.domain_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same domain as file share';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_agent_same_domain
  BEFORE INSERT OR UPDATE ON public.file_shares
  FOR EACH ROW EXECUTE FUNCTION public.check_agent_domain();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.scan_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fileshare_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_stats ENABLE ROW LEVEL SECURITY;

-- SCAN AGENTS POLICIES
CREATE POLICY "Admins full access to scan_agents" ON public.scan_agents
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Domain editors can manage agents" ON public.scan_agents
  FOR ALL TO authenticated
  USING (public.can_edit_domain(domain_id))
  WITH CHECK (public.can_edit_domain(domain_id));

CREATE POLICY "Domain members can view agents" ON public.scan_agents
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.can_access_domain(domain_id));

-- FILE SHARES POLICIES
CREATE POLICY "Admins full access to file_shares" ON public.file_shares
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Domain editors can manage file_shares" ON public.file_shares
  FOR ALL TO authenticated
  USING (public.can_edit_domain(domain_id))
  WITH CHECK (public.can_edit_domain(domain_id));

CREATE POLICY "Domain members can view file_shares" ON public.file_shares
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.can_access_domain(domain_id));

-- FILESHARE SCANS POLICIES
CREATE POLICY "Admins full access to fileshare_scans" ON public.fileshare_scans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Domain editors can manage scans" ON public.fileshare_scans
  FOR ALL TO authenticated
  USING (public.can_edit_domain(domain_id))
  WITH CHECK (public.can_edit_domain(domain_id));

CREATE POLICY "Domain members can view scans" ON public.fileshare_scans
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.can_access_domain(domain_id));

-- SCAN SNAPSHOTS POLICIES
CREATE POLICY "Admins full access to scan_snapshots" ON public.scan_snapshots
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view snapshots in their domains" ON public.scan_snapshots
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.file_shares fs 
      WHERE fs.id = file_share_id AND public.can_access_domain(fs.domain_id)
    )
  );

-- FOLDER STATS POLICIES
CREATE POLICY "Admins full access to folder_stats" ON public.folder_stats
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view folder_stats in their domains" ON public.folder_stats
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.scan_snapshots ss
      JOIN public.file_shares fs ON fs.id = ss.file_share_id
      WHERE ss.id = snapshot_id AND public.can_access_domain(fs.domain_id)
    )
  );