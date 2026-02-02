-- =============================================
-- Procurement Module Database Schema
-- =============================================

-- 1. Create procurement_requests table
CREATE TABLE public.procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
  request_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','ordered','received','closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  currency text DEFAULT 'SAR',
  needed_by date,
  created_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create procurement_request_items table
CREATE TABLE public.procurement_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.procurement_requests(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'pcs',
  specs text,
  estimated_unit_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create procurement_quotations table
CREATE TABLE public.procurement_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.procurement_requests(id) ON DELETE CASCADE NOT NULL,
  vendor_name text NOT NULL,
  quotation_ref text,
  quote_date date,
  valid_until date,
  subtotal numeric,
  tax numeric,
  shipping numeric,
  discount numeric,
  total numeric,
  currency text DEFAULT 'SAR',
  file_path text NOT NULL,
  original_filename text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 4. Create procurement_activity_logs table
CREATE TABLE public.procurement_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.procurement_requests(id) ON DELETE CASCADE NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Create indexes
CREATE INDEX idx_procurement_requests_domain ON public.procurement_requests(domain_id, created_at DESC);
CREATE INDEX idx_procurement_requests_status ON public.procurement_requests(status);
CREATE INDEX idx_procurement_requests_number ON public.procurement_requests(request_number);
CREATE INDEX idx_procurement_items_request ON public.procurement_request_items(request_id);
CREATE INDEX idx_procurement_quotations_request ON public.procurement_quotations(request_id, created_at DESC);
CREATE INDEX idx_procurement_quotations_vendor ON public.procurement_quotations(vendor_name);
CREATE INDEX idx_procurement_activity_request ON public.procurement_activity_logs(request_id, created_at DESC);

-- 6. Add updated_at triggers
CREATE TRIGGER update_procurement_requests_updated_at
  BEFORE UPDATE ON public.procurement_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procurement_items_updated_at
  BEFORE UPDATE ON public.procurement_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Enable RLS
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_activity_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for procurement_requests
CREATE POLICY "Domain members can view procurement requests"
  ON public.procurement_requests FOR SELECT
  USING (public.is_super_admin() OR public.can_access_domain(domain_id));

CREATE POLICY "Domain members can create requests"
  ON public.procurement_requests FOR INSERT
  WITH CHECK (public.is_super_admin() OR public.is_admin() OR public.can_access_domain(domain_id));

CREATE POLICY "Request update policy"
  ON public.procurement_requests FOR UPDATE
  USING (
    public.is_super_admin() 
    OR public.is_domain_admin(domain_id)
    OR (status = 'draft' AND created_by = public.get_my_profile_id())
  );

CREATE POLICY "Request delete policy"
  ON public.procurement_requests FOR DELETE
  USING (
    public.is_super_admin() 
    OR public.is_domain_admin(domain_id)
    OR (status = 'draft' AND created_by = public.get_my_profile_id())
  );

-- 9. RLS Policies for procurement_request_items
CREATE POLICY "View items via request access"
  ON public.procurement_request_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.can_access_domain(pr.domain_id))
  ));

CREATE POLICY "Insert items for own draft requests"
  ON public.procurement_request_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.is_admin() OR (pr.status = 'draft' AND pr.created_by = public.get_my_profile_id()))
  ));

CREATE POLICY "Update items for own draft requests"
  ON public.procurement_request_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.is_domain_admin(pr.domain_id) OR (pr.status = 'draft' AND pr.created_by = public.get_my_profile_id()))
  ));

CREATE POLICY "Delete items for own draft requests"
  ON public.procurement_request_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.is_domain_admin(pr.domain_id) OR (pr.status = 'draft' AND pr.created_by = public.get_my_profile_id()))
  ));

-- 10. RLS Policies for procurement_quotations
CREATE POLICY "View quotations via request access"
  ON public.procurement_quotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.can_access_domain(pr.domain_id))
  ));

CREATE POLICY "Upload quotations for domain requests"
  ON public.procurement_quotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.is_admin() OR public.can_access_domain(pr.domain_id))
  ));

CREATE POLICY "Delete quotations"
  ON public.procurement_quotations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.is_domain_admin(pr.domain_id) OR uploaded_by = public.get_my_profile_id())
  ));

-- 11. RLS Policies for procurement_activity_logs
CREATE POLICY "View activity logs via request access"
  ON public.procurement_activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.can_access_domain(pr.domain_id))
  ));

CREATE POLICY "Insert activity logs"
  ON public.procurement_activity_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.procurement_requests pr 
    WHERE pr.id = request_id 
    AND (public.is_super_admin() OR public.can_access_domain(pr.domain_id))
  ));

-- 12. Create storage bucket for quotation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('procurement-quotations', 'procurement-quotations', false)
ON CONFLICT (id) DO NOTHING;

-- 13. Storage policies
CREATE POLICY "Authenticated users can upload procurement quotations"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'procurement-quotations');

CREATE POLICY "Domain members can view procurement quotations"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'procurement-quotations');

CREATE POLICY "Users can delete their own quotations"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'procurement-quotations' AND (auth.uid()::text = owner_id::text OR public.is_admin()));

-- 14. Function to generate request numbers
CREATE OR REPLACE FUNCTION public.generate_procurement_request_number(p_domain_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_domain_code text;
  v_year text;
  v_sequence int;
  v_number text;
BEGIN
  -- Get domain code or first 3 chars of domain name
  SELECT COALESCE(code, LEFT(name, 3)) INTO v_domain_code FROM domains WHERE id = p_domain_id;
  v_domain_code := UPPER(COALESCE(v_domain_code, 'GEN'));
  
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get next sequence for this domain and year
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(request_number, '[^0-9]', '', 'g'), '') AS int)
  ), 0) + 1
  INTO v_sequence
  FROM procurement_requests
  WHERE domain_id = p_domain_id
    AND request_number LIKE v_domain_code || '-PR-' || v_year || '-%';
  
  v_number := v_domain_code || '-PR-' || v_year || '-' || LPAD(v_sequence::text, 4, '0');
  
  RETURN v_number;
END;
$$;