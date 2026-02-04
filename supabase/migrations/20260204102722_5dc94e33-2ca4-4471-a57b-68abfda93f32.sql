-- Enable Supabase Realtime for infrastructure tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cluster_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clusters;

-- Create infrastructure_alerts table for NOC alert tracking
CREATE TABLE IF NOT EXISTS public.infrastructure_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  resource_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'warning', 'info', 'recovery')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on infrastructure_alerts
ALTER TABLE public.infrastructure_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for infrastructure_alerts
CREATE POLICY "Users can view alerts in their domains"
ON public.infrastructure_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    WHERE dm.domain_id = infrastructure_alerts.domain_id
    AND dm.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

CREATE POLICY "Authenticated users can acknowledge alerts"
ON public.infrastructure_alerts FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.infrastructure_alerts;

-- Create index for performance
CREATE INDEX idx_infrastructure_alerts_domain ON public.infrastructure_alerts(domain_id);
CREATE INDEX idx_infrastructure_alerts_created ON public.infrastructure_alerts(created_at DESC);
CREATE INDEX idx_infrastructure_alerts_unresolved ON public.infrastructure_alerts(resolved_at) WHERE resolved_at IS NULL;