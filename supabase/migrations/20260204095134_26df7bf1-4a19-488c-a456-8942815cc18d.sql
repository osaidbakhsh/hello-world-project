-- Phase 2: JWT Custom Claims & Auth Integration
-- Inject domain_ids and site_ids into JWT tokens for Edge Function authorization

-- Create the custom access token hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  user_role text;
  domain_ids uuid[];
  site_ids uuid[];
  profile_id uuid;
BEGIN
  -- Extract user_id from the event
  user_id := (event->>'user_id')::uuid;
  
  -- Get the current claims
  claims := event->'claims';
  
  -- Get user's profile ID
  SELECT id INTO profile_id FROM profiles WHERE profiles.user_id = custom_access_token_hook.user_id;
  
  -- Get user's role from user_roles table
  SELECT role::text INTO user_role 
  FROM user_roles 
  WHERE user_roles.user_id = custom_access_token_hook.user_id
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2 
      WHEN 'employee' THEN 3 
    END
  LIMIT 1;
  
  -- Get all domain IDs the user has access to
  SELECT ARRAY_AGG(DISTINCT dm.domain_id) INTO domain_ids
  FROM domain_memberships dm
  WHERE dm.profile_id = profile_id;
  
  -- Get all site IDs the user has access to (direct membership)
  SELECT ARRAY_AGG(DISTINCT sm.site_id) INTO site_ids
  FROM site_memberships sm
  WHERE sm.profile_id = profile_id;
  
  -- Add site IDs from domain memberships (indirect access)
  SELECT ARRAY_AGG(DISTINCT d.site_id) INTO site_ids
  FROM domain_memberships dm
  JOIN domains d ON d.id = dm.domain_id
  WHERE dm.profile_id = profile_id
  UNION
  SELECT UNNEST(site_ids);
  
  -- Inject custom claims
  claims := jsonb_set(claims, '{app_role}', to_jsonb(COALESCE(user_role, 'employee')));
  claims := jsonb_set(claims, '{profile_id}', to_jsonb(profile_id));
  claims := jsonb_set(claims, '{domain_ids}', COALESCE(to_jsonb(domain_ids), '[]'::jsonb));
  claims := jsonb_set(claims, '{site_ids}', COALESCE(to_jsonb(site_ids), '[]'::jsonb));
  
  -- For super_admin, add a flag for easy checking
  IF user_role = 'super_admin' THEN
    claims := jsonb_set(claims, '{is_super_admin}', 'true'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{is_super_admin}', 'false'::jsonb);
  END IF;
  
  -- Return the modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute permission to supabase_auth_admin (required for the hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Create helper function to extract claims from JWT in Edge Functions
CREATE OR REPLACE FUNCTION public.get_my_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    jsonb_build_object(
      'user_id', auth.uid(),
      'app_role', COALESCE((SELECT role::text FROM user_roles WHERE user_id = auth.uid() ORDER BY 
        CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END LIMIT 1), 'employee'),
      'profile_id', (SELECT id FROM profiles WHERE user_id = auth.uid()),
      'domain_ids', COALESCE(
        (SELECT ARRAY_AGG(DISTINCT dm.domain_id) 
         FROM domain_memberships dm 
         JOIN profiles p ON p.id = dm.profile_id 
         WHERE p.user_id = auth.uid()), 
        ARRAY[]::uuid[]
      ),
      'site_ids', COALESCE(
        (SELECT ARRAY_AGG(DISTINCT sm.site_id) 
         FROM site_memberships sm 
         JOIN profiles p ON p.id = sm.profile_id 
         WHERE p.user_id = auth.uid()), 
        ARRAY[]::uuid[]
      ),
      'is_super_admin', EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    )
$$;

-- Create function to check if user has access to a specific domain (for use in Edge Functions)
CREATE OR REPLACE FUNCTION public.user_can_access_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin() 
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      JOIN profiles p ON p.id = dm.profile_id
      WHERE p.user_id = auth.uid() AND dm.domain_id = _domain_id
    )
    OR EXISTS (
      SELECT 1 FROM site_memberships sm
      JOIN profiles p ON p.id = sm.profile_id
      JOIN domains d ON d.site_id = sm.site_id
      WHERE p.user_id = auth.uid() AND d.id = _domain_id
    )
$$;

-- Create function to check if user has access to a specific site
CREATE OR REPLACE FUNCTION public.user_can_access_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin() 
    OR EXISTS (
      SELECT 1 FROM site_memberships sm
      JOIN profiles p ON p.id = sm.profile_id
      WHERE p.user_id = auth.uid() AND sm.site_id = _site_id
    )
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      JOIN profiles p ON p.id = dm.profile_id
      JOIN domains d ON d.id = dm.domain_id
      WHERE p.user_id = auth.uid() AND d.site_id = _site_id
    )
$$;