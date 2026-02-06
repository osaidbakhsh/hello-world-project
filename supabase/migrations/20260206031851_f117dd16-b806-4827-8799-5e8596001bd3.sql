-- ============================================================
-- PHASE 5: APPROVAL REQUESTS + EVENTS SCHEMA (FIXED)
-- ============================================================

-- Approval requests table (tables may already exist from previous partial migration)
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('site', 'domain', 'cluster')),
  scope_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action_type TEXT NOT NULL,
  request_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'applied', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  approver_role TEXT,
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  requester_notes TEXT,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for approval_requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_site_id ON public.approval_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_domain_id ON public.approval_requests(domain_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);

-- Approval events/history table
CREATE TABLE IF NOT EXISTS public.approval_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_events_request_id ON public.approval_events(request_id, created_at);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view approval requests within scope" ON public.approval_requests;
DROP POLICY IF EXISTS "Users can create approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Approvers can update approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Users can view approval events for accessible requests" ON public.approval_events;
DROP POLICY IF EXISTS "Users can create approval events" ON public.approval_events;

-- RLS policies for approval_requests
-- View: users can see approvals within their accessible sites/domains
CREATE POLICY "Users can view approval requests within scope" ON public.approval_requests
  FOR SELECT USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.user_id = (SELECT public.get_my_profile_id())
        AND ra.status = 'active'
        AND (
          (ra.scope_type = 'site' AND ra.scope_id = approval_requests.site_id) OR
          (ra.scope_type = 'domain' AND ra.scope_id = approval_requests.domain_id)
        )
    )
  );

-- Insert: authenticated users can create approval requests
CREATE POLICY "Users can create approval requests" ON public.approval_requests
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    requested_by = (SELECT public.get_my_profile_id())
  );

-- Update: approvers with manage permission can update (approve/reject)
CREATE POLICY "Approvers can update approval requests" ON public.approval_requests
  FOR UPDATE USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.user_id = (SELECT public.get_my_profile_id())
        AND ra.status = 'active'
        AND r.name IN ('SuperAdmin', 'SiteAdmin')
        AND (ra.scope_type = 'site' AND ra.scope_id = approval_requests.site_id)
    )
  );

-- RLS policies for approval_events
CREATE POLICY "Users can view approval events for accessible requests" ON public.approval_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = approval_events.request_id
        AND (
          public.is_super_admin() OR
          EXISTS (
            SELECT 1 FROM public.role_assignments ra
            JOIN public.roles r ON r.id = ra.role_id
            WHERE ra.user_id = (SELECT public.get_my_profile_id())
              AND ra.status = 'active'
              AND (
                (ra.scope_type = 'site' AND ra.scope_id = ar.site_id) OR
                (ra.scope_type = 'domain' AND ra.scope_id = ar.domain_id)
              )
          )
        )
    )
  );

CREATE POLICY "Users can create approval events" ON public.approval_events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (actor_id IS NULL OR actor_id = (SELECT public.get_my_profile_id()))
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_approval_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_approval_request_timestamp ON public.approval_requests;
CREATE TRIGGER update_approval_request_timestamp
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_approval_request_updated_at();

-- Add scope columns to audit_logs if not present
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS scope_type TEXT,
  ADD COLUMN IF NOT EXISTS scope_id UUID,
  ADD COLUMN IF NOT EXISTS approval_request_id UUID;