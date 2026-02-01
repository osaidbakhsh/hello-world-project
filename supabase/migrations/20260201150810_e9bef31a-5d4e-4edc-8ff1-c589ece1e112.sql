-- =============================================
-- EPIC B: On-Call Rotation System
-- =============================================

-- Update existing on_call_schedules table to add missing columns
ALTER TABLE public.on_call_schedules 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Create on_call_assignments table
CREATE TABLE IF NOT EXISTS public.on_call_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.on_call_schedules(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'secondary', 'backup')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create escalation_rules table
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.on_call_schedules(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  wait_minutes INTEGER DEFAULT 15,
  notify_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_method TEXT DEFAULT 'email' CHECK (notify_method IN ('email', 'sms', 'both', 'push')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EPIC C: Maintenance Windows & Change Calendar
-- =============================================

-- Create maintenance_windows table
CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  recurrence TEXT DEFAULT 'once' CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  affected_servers UUID[],
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create change_requests table
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_window_id UUID REFERENCES public.maintenance_windows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requested_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented', 'rolled_back')),
  risk_assessment TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  rollback_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Enable RLS on all new tables
-- =============================================

ALTER TABLE public.on_call_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for on_call_assignments
-- =============================================

CREATE POLICY "Admins can manage on_call_assignments"
ON public.on_call_assignments
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view on_call_assignments"
ON public.on_call_assignments
FOR SELECT
USING (true);

-- =============================================
-- RLS Policies for escalation_rules
-- =============================================

CREATE POLICY "Admins can manage escalation_rules"
ON public.escalation_rules
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view escalation_rules"
ON public.escalation_rules
FOR SELECT
USING (true);

-- =============================================
-- RLS Policies for maintenance_windows
-- =============================================

CREATE POLICY "Admins can manage maintenance_windows"
ON public.maintenance_windows
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view maintenance_windows in their domains"
ON public.maintenance_windows
FOR SELECT
USING (is_admin() OR can_access_domain(domain_id) OR domain_id IS NULL);

-- =============================================
-- RLS Policies for change_requests
-- =============================================

CREATE POLICY "Admins can manage change_requests"
ON public.change_requests
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view change_requests"
ON public.change_requests
FOR SELECT
USING (is_admin() OR requested_by = get_my_profile_id());

CREATE POLICY "Users can create change_requests"
ON public.change_requests
FOR INSERT
WITH CHECK (requested_by = get_my_profile_id() OR is_admin());

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE TRIGGER update_maintenance_windows_updated_at
BEFORE UPDATE ON public.maintenance_windows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_change_requests_updated_at
BEFORE UPDATE ON public.change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();