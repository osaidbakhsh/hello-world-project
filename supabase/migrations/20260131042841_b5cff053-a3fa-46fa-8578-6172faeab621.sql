-- Drop the restrictive SELECT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid() OR is_admin());

-- Also fix domains, networks, servers, tasks, licenses policies that might be RESTRICTIVE
-- Domains
DROP POLICY IF EXISTS "Users can view assigned domains" ON public.domains;
CREATE POLICY "Users can view assigned domains"
ON public.domains
FOR SELECT
USING (is_admin() OR can_access_domain(id));

-- Networks
DROP POLICY IF EXISTS "Users can view assigned networks" ON public.networks;
CREATE POLICY "Users can view assigned networks"
ON public.networks
FOR SELECT
USING (is_admin() OR can_access_domain(domain_id));

-- Servers
DROP POLICY IF EXISTS "Users can view servers in their networks" ON public.servers;
CREATE POLICY "Users can view servers in their networks"
ON public.servers
FOR SELECT
USING (is_admin() OR can_access_network(network_id) OR network_id IS NULL);

-- Licenses
DROP POLICY IF EXISTS "Users can view licenses in their domains" ON public.licenses;
CREATE POLICY "Users can view licenses in their domains"
ON public.licenses
FOR SELECT
USING (is_admin() OR can_access_domain(domain_id) OR domain_id IS NULL);

-- Tasks
DROP POLICY IF EXISTS "Users can view assigned tasks or tasks in their networks" ON public.tasks;
CREATE POLICY "Users can view assigned tasks or tasks in their networks"
ON public.tasks
FOR SELECT
USING (
  is_admin() 
  OR assigned_to = get_my_profile_id() 
  OR (server_id IS NOT NULL AND can_access_network((SELECT network_id FROM servers WHERE id = tasks.server_id)))
  OR (server_id IS NULL AND assigned_to = get_my_profile_id())
);

-- Vacations
DROP POLICY IF EXISTS "Users can view their vacations" ON public.vacations;
CREATE POLICY "Users can view their vacations"
ON public.vacations
FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());

-- Yearly goals
DROP POLICY IF EXISTS "Users can view their goals" ON public.yearly_goals;
CREATE POLICY "Users can view their goals"
ON public.yearly_goals
FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());

-- Employee reports
DROP POLICY IF EXISTS "Users can view their reports" ON public.employee_reports;
CREATE POLICY "Users can view their reports"
ON public.employee_reports
FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());