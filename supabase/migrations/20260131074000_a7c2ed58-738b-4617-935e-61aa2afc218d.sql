-- =====================================================
-- Phase 1: Server Enhancements (Veeam + Beneficiary)
-- =====================================================

-- Add Beneficiary/Business fields
ALTER TABLE servers ADD COLUMN IF NOT EXISTS beneficiary_department TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS primary_application TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS business_owner TEXT;

-- Add Veeam Backup fields
ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_backed_up_by_veeam BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS backup_frequency TEXT DEFAULT 'none';
ALTER TABLE servers ADD COLUMN IF NOT EXISTS backup_job_name TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_backup_status TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_backup_date TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- Phase 2: Enhanced Task System (Pro Features)
-- =====================================================

-- Add new task lifecycle columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'draft';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_response_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_resolve_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE;

-- Add task relationship columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS watchers UUID[];

-- Add task linking columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_server_id UUID REFERENCES servers(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_network_id UUID REFERENCES networks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_license_id UUID REFERENCES licenses(id);

-- Add task content columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]';

-- =====================================================
-- Phase 3: Network Scan Tables
-- =====================================================

-- Create scan_jobs table
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain_id UUID REFERENCES domains(id),
  network_id UUID REFERENCES networks(id),
  ip_range TEXT NOT NULL,
  scan_mode TEXT DEFAULT 'basic',
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  summary JSONB
);

-- Create scan_results table
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  hostname TEXT,
  os_type TEXT,
  os_version TEXT,
  device_type TEXT,
  open_ports TEXT[],
  vendor TEXT,
  mac_address TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_imported BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Phase 4: Task Templates & Comments
-- =====================================================

-- Create task_templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  checklist JSONB DEFAULT '[]',
  frequency TEXT,
  priority TEXT DEFAULT 'medium',
  default_assignee_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create on_call_schedules table
CREATE TABLE IF NOT EXISTS on_call_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rotation_type TEXT DEFAULT 'round_robin',
  team_members UUID[],
  current_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Phase 5: RLS Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_schedules ENABLE ROW LEVEL SECURITY;

-- Scan Jobs policies
CREATE POLICY "Admins can manage scan jobs"
  ON scan_jobs FOR ALL USING (is_admin());

CREATE POLICY "Users can view scan jobs in their domains"
  ON scan_jobs FOR SELECT USING (
    is_admin() OR 
    (domain_id IS NOT NULL AND can_access_domain(domain_id)) OR
    (network_id IS NOT NULL AND can_access_network(network_id))
  );

-- Scan Results policies
CREATE POLICY "Admins can manage scan results"
  ON scan_results FOR ALL USING (is_admin());

CREATE POLICY "Users can view scan results"
  ON scan_results FOR SELECT USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM scan_jobs sj 
      WHERE sj.id = scan_results.scan_job_id 
      AND (
        (sj.domain_id IS NOT NULL AND can_access_domain(sj.domain_id)) OR
        (sj.network_id IS NOT NULL AND can_access_network(sj.network_id))
      )
    )
  );

-- Task Templates policies
CREATE POLICY "Admins can manage task templates"
  ON task_templates FOR ALL USING (is_admin());

CREATE POLICY "Users can view active templates"
  ON task_templates FOR SELECT USING (is_active = TRUE OR is_admin());

-- Task Comments policies
CREATE POLICY "Users can view comments on their tasks"
  ON task_comments FOR SELECT USING (
    is_admin() OR 
    author_id = get_my_profile_id() OR
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_comments.task_id 
      AND (t.assigned_to = get_my_profile_id() OR t.requester_id = get_my_profile_id())
    )
  );

CREATE POLICY "Users can add comments to their tasks"
  ON task_comments FOR INSERT WITH CHECK (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_comments.task_id 
      AND (t.assigned_to = get_my_profile_id() OR t.requester_id = get_my_profile_id() OR t.created_by = get_my_profile_id())
    )
  );

CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE USING (
    author_id = get_my_profile_id() OR is_admin()
  );

CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE USING (
    author_id = get_my_profile_id() OR is_admin()
  );

-- On Call Schedules policies
CREATE POLICY "Admins can manage on call schedules"
  ON on_call_schedules FOR ALL USING (is_admin());

CREATE POLICY "Users can view on call schedules"
  ON on_call_schedules FOR SELECT USING (TRUE);

-- =====================================================
-- Phase 6: Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_created_at ON scan_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_job_id ON scan_results(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_ip ON scan_results(ip_address);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_status ON tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_breached ON tasks(sla_breached);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add entity_name to audit_logs for better tracking
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name TEXT;