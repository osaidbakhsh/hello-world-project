-- Create the RPC function for visible employees
CREATE OR REPLACE FUNCTION list_visible_employees()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  is_super BOOLEAN;
BEGIN
  current_profile_id := get_my_profile_id();
  
  IF current_profile_id IS NULL THEN
    RETURN;
  END IF;

  is_super := is_super_admin();

  -- Super admin: see ALL employees with email (global directory)
  IF is_super THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.email
    FROM profiles p
    WHERE p.id <> current_profile_id
    ORDER BY p.full_name;
    RETURN;
  END IF;

  -- Non-admin: see only employees in shared domains (no email for privacy)
  RETURN QUERY
  SELECT DISTINCT p.id, p.full_name, NULL::TEXT as email
  FROM profiles p
  JOIN domain_memberships dm_emp ON dm_emp.profile_id = p.id
  JOIN domain_memberships dm_me ON dm_me.domain_id = dm_emp.domain_id
  WHERE dm_me.profile_id = current_profile_id
    AND p.id <> current_profile_id
  ORDER BY p.full_name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION list_visible_employees() TO authenticated;

-- Add performance index for domain membership lookups
CREATE INDEX IF NOT EXISTS idx_domain_memberships_profile_domain 
ON domain_memberships(profile_id, domain_id);