-- Create purchase requests table
CREATE TABLE public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost NUMERIC,
  currency TEXT DEFAULT 'SAR',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase requests
CREATE POLICY "Users can view their own purchase requests"
ON public.purchase_requests FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());

CREATE POLICY "Users can create their own purchase requests"
ON public.purchase_requests FOR INSERT
WITH CHECK (profile_id = get_my_profile_id());

CREATE POLICY "Users can update their pending requests"
ON public.purchase_requests FOR UPDATE
USING ((profile_id = get_my_profile_id() AND status = 'pending') OR is_admin());

CREATE POLICY "Admins can delete purchase requests"
ON public.purchase_requests FOR DELETE
USING (is_admin());

-- Create manager assignments table for approval workflow
CREATE TABLE public.manager_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_approve_vacations BOOLEAN DEFAULT true,
  can_approve_purchases BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, manager_id)
);

-- Enable RLS
ALTER TABLE public.manager_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manager assignments
CREATE POLICY "Admins can manage all assignments"
ON public.manager_assignments FOR ALL
USING (is_admin());

CREATE POLICY "Users can view their managers"
ON public.manager_assignments FOR SELECT
USING (employee_id = get_my_profile_id() OR manager_id = get_my_profile_id() OR is_admin());

-- Create function to check if user is manager of another user
CREATE OR REPLACE FUNCTION public.is_manager_of(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manager_assignments ma
    JOIN public.profiles p ON p.id = ma.manager_id
    WHERE p.user_id = auth.uid() AND ma.employee_id = _employee_id
  )
$$;

-- Update vacations table to use manager approval check
CREATE POLICY "Managers can approve vacations"
ON public.vacations FOR UPDATE
USING (is_manager_of(profile_id) OR is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_requests_updated_at
BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();