-- Phase 3.5: Enhanced Notifications + Health Monitoring Schema

-- Add new columns to notifications table for scope-aware notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES public.domains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS code text;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_site_created ON public.notifications(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_domain_created ON public.notifications(domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_code ON public.notifications(code);

-- Create agent_events table for tracking agent lifecycle and diagnostic events
CREATE TABLE IF NOT EXISTS public.agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.scan_agents(id) ON DELETE CASCADE NOT NULL,
  domain_id uuid REFERENCES public.domains(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'online', 'offline', 'heartbeat', 'error', 'warning'
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_created ON public.agent_events(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_domain ON public.agent_events(domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON public.agent_events(event_type);

-- Create notification_dedup table for deduplication
CREATE TABLE IF NOT EXISTS public.notification_dedup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key text UNIQUE NOT NULL, -- Composite key like "AD_DC_DOWN:domain_id:site_id"
  last_sent_at timestamptz DEFAULT now() NOT NULL,
  count int DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_notification_dedup_key ON public.notification_dedup(dedup_key);

-- Add offline_since column to scan_agents for tracking offline duration
ALTER TABLE public.scan_agents 
  ADD COLUMN IF NOT EXISTS offline_since timestamptz;

-- Add last_error column to domain_integrations
ALTER TABLE public.domain_integrations
  ADD COLUMN IF NOT EXISTS last_error text;

-- Enable RLS on new tables
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dedup ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications (scope-aware)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view notifications for accessible sites" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;

CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    -- User's own notifications (legacy)
    user_id = auth.uid()
    OR
    -- Site-scoped notifications for accessible sites
    (site_id IS NOT NULL AND public.can_access_site(site_id))
    OR
    -- Domain-scoped notifications for accessible domains
    (domain_id IS NOT NULL AND public.can_access_domain(domain_id))
  );

-- Allow users to update only their own notifications (mark read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (site_id IS NOT NULL AND public.can_access_site(site_id))
    OR
    (domain_id IS NOT NULL AND public.can_access_domain(domain_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    (site_id IS NOT NULL AND public.can_access_site(site_id))
    OR
    (domain_id IS NOT NULL AND public.can_access_domain(domain_id))
  );

-- Allow users to delete only their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (site_id IS NOT NULL AND public.can_access_site(site_id))
  );

-- RLS for agent_events (view if can access the agent's domain)
CREATE POLICY "agent_events_select_policy" ON public.agent_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scan_agents sa
      WHERE sa.id = agent_events.agent_id
      AND (
        public.is_super_admin()
        OR public.can_access_site(sa.site_id)
      )
    )
  );

-- RLS for notification_dedup (server-side only, no client access)
CREATE POLICY "notification_dedup_no_client" ON public.notification_dedup
  FOR ALL TO authenticated
  USING (false);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;