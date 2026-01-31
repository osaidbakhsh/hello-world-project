-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'employee',
    department TEXT DEFAULT 'IT',
    position TEXT DEFAULT 'System Admin',
    phone TEXT,
    skills TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create domains/networks table
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create networks table
CREATE TABLE public.networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    subnet TEXT,
    gateway TEXT,
    dns_servers TEXT[],
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create domain_memberships table (which domains a user can access)
CREATE TABLE public.domain_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(profile_id, domain_id)
);

-- Create servers table
CREATE TABLE public.servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    ip_address TEXT,
    operating_system TEXT,
    environment TEXT DEFAULT 'production',
    status TEXT DEFAULT 'active',
    owner TEXT,
    responsible_user TEXT,
    disk_space TEXT,
    ram TEXT,
    cpu TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tasks table (server_id is optional)
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    frequency TEXT DEFAULT 'once',
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vacations table
CREATE TABLE public.vacations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vacation_type TEXT NOT NULL DEFAULT 'annual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create employee_reports table
CREATE TABLE public.employee_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    report_date DATE NOT NULL,
    report_type TEXT DEFAULT 'weekly',
    file_name TEXT,
    file_url TEXT,
    notes TEXT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create licenses table
CREATE TABLE public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    vendor TEXT,
    license_key TEXT,
    purchase_date DATE,
    expiry_date DATE,
    quantity INTEGER DEFAULT 1,
    assigned_to TEXT,
    cost DECIMAL(10,2),
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create yearly_goals table
CREATE TABLE public.yearly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create app_settings table
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default app name
INSERT INTO public.app_settings (key, value) VALUES ('app_name', 'IT');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Create helper function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Create helper function to check domain access
CREATE OR REPLACE FUNCTION public.can_access_domain(_domain_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() AND dm.domain_id = _domain_id
  )
$$;

-- Create helper function to check network access (via domain)
CREATE OR REPLACE FUNCTION public.can_access_network(_network_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.networks n
    JOIN public.domain_memberships dm ON dm.domain_id = n.domain_id
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() AND n.id = _network_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (public.is_admin());

-- Domains policies
CREATE POLICY "Admins can do all on domains" ON public.domains
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view assigned domains" ON public.domains
FOR SELECT USING (public.is_admin() OR public.can_access_domain(id));

-- Networks policies
CREATE POLICY "Admins can do all on networks" ON public.networks
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view assigned networks" ON public.networks
FOR SELECT USING (public.is_admin() OR public.can_access_domain(domain_id));

-- Domain memberships policies
CREATE POLICY "Admins can manage memberships" ON public.domain_memberships
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their own memberships" ON public.domain_memberships
FOR SELECT USING (profile_id = public.get_my_profile_id());

-- Servers policies
CREATE POLICY "Admins can do all on servers" ON public.servers
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view servers in their networks" ON public.servers
FOR SELECT USING (public.is_admin() OR public.can_access_network(network_id) OR network_id IS NULL);

CREATE POLICY "Users can add servers to their networks" ON public.servers
FOR INSERT WITH CHECK (public.is_admin() OR public.can_access_network(network_id) OR network_id IS NULL);

CREATE POLICY "Users can update servers in their networks" ON public.servers
FOR UPDATE USING (public.is_admin() OR public.can_access_network(network_id));

-- Tasks policies
CREATE POLICY "Admins can do all on tasks" ON public.tasks
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view assigned tasks or tasks in their networks" ON public.tasks
FOR SELECT USING (
    public.is_admin() 
    OR assigned_to = public.get_my_profile_id()
    OR (server_id IS NOT NULL AND public.can_access_network((SELECT network_id FROM public.servers WHERE id = tasks.server_id)))
    OR (server_id IS NULL AND assigned_to = public.get_my_profile_id())
);

CREATE POLICY "Users can create tasks" ON public.tasks
FOR INSERT WITH CHECK (public.is_admin() OR assigned_to = public.get_my_profile_id() OR assigned_to IS NULL);

CREATE POLICY "Users can update their tasks" ON public.tasks
FOR UPDATE USING (public.is_admin() OR assigned_to = public.get_my_profile_id());

-- Vacations policies
CREATE POLICY "Admins can do all on vacations" ON public.vacations
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their vacations" ON public.vacations
FOR SELECT USING (profile_id = public.get_my_profile_id() OR public.is_admin());

CREATE POLICY "Users can create their vacations" ON public.vacations
FOR INSERT WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can update their vacations" ON public.vacations
FOR UPDATE USING (profile_id = public.get_my_profile_id() OR public.is_admin());

-- Employee reports policies
CREATE POLICY "Admins can do all on employee_reports" ON public.employee_reports
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their reports" ON public.employee_reports
FOR SELECT USING (profile_id = public.get_my_profile_id() OR public.is_admin());

CREATE POLICY "Admins can upload reports" ON public.employee_reports
FOR INSERT WITH CHECK (public.is_admin());

-- Licenses policies
CREATE POLICY "Admins can do all on licenses" ON public.licenses
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view licenses in their domains" ON public.licenses
FOR SELECT USING (public.is_admin() OR public.can_access_domain(domain_id) OR domain_id IS NULL);

-- Yearly goals policies
CREATE POLICY "Admins can do all on yearly_goals" ON public.yearly_goals
FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their goals" ON public.yearly_goals
FOR SELECT USING (profile_id = public.get_my_profile_id() OR public.is_admin());

CREATE POLICY "Users can manage their goals" ON public.yearly_goals
FOR INSERT WITH CHECK (profile_id = public.get_my_profile_id() OR public.is_admin());

CREATE POLICY "Users can update their goals" ON public.yearly_goals
FOR UPDATE USING (profile_id = public.get_my_profile_id() OR public.is_admin());

-- App settings policies (public read, admin write)
CREATE POLICY "Anyone can read app settings" ON public.app_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT WITH CHECK (public.is_admin());

-- Create trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON public.servers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();