-- Fix security warning: Function Search Path Mutable
-- Add SET search_path = public to the trigger function

CREATE OR REPLACE FUNCTION public.update_private_vault_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;