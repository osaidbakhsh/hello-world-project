-- =========================================================================
-- ENT-RBAC-001 Part 2: Update helper functions for 3-tier RBAC
-- =========================================================================

-- 1. Create/update is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;

-- 2. Update is_admin() to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  )
$$;

-- 3. Update has_role() to handle super_admin checking for admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND (role = _role OR (_role = 'admin' AND role = 'super_admin'))
  )
$$;

-- 4. Create is_employee_only() function (view-only users)
CREATE OR REPLACE FUNCTION public.is_employee_only()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'employee'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  )
$$;

-- 5. Create can_manage_domain() for admin domain scoping
CREATE OR REPLACE FUNCTION public.can_manage_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
  OR (
    public.has_role(auth.uid(), 'admin')
    AND public.can_edit_domain(_domain_id)
  )
$$;

-- 6. Update can_access_domain() to include super_admin bypass
CREATE OR REPLACE FUNCTION public.can_access_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() AND dm.domain_id = _domain_id
  )
$$;

-- 7. Update can_edit_domain() to include super_admin bypass
CREATE OR REPLACE FUNCTION public.can_edit_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() 
      AND dm.domain_id = _domain_id
      AND dm.can_edit = true
  )
$$;

-- 8. Update get_user_role() to return highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2 
      WHEN 'employee' THEN 3 
    END
  LIMIT 1
$$;