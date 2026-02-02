-- Create vacation_balances table
CREATE TABLE IF NOT EXISTS public.vacation_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  annual_balance integer DEFAULT 21,
  sick_balance integer DEFAULT 15,
  emergency_balance integer DEFAULT 5,
  used_annual integer DEFAULT 0,
  used_sick integer DEFAULT 0,
  used_emergency integer DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, year)
);

-- Enable RLS
ALTER TABLE public.vacation_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own balance"
ON public.vacation_balances FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());

CREATE POLICY "Super Admin can manage all balances"
ON public.vacation_balances FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Function to auto-create balance for new year (with search_path)
CREATE OR REPLACE FUNCTION public.create_annual_vacation_balance()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vacation_balances (profile_id, year)
  VALUES (NEW.id, EXTRACT(YEAR FROM CURRENT_DATE)::integer)
  ON CONFLICT (profile_id, year) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create balance when profile is created
DROP TRIGGER IF EXISTS create_vacation_balance_on_profile ON public.profiles;
CREATE TRIGGER create_vacation_balance_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_annual_vacation_balance();