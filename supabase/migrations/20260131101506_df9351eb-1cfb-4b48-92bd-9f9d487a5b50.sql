-- Create import_batches table for tracking and rollback of imports
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by UUID REFERENCES profiles(id),
  entity_type TEXT NOT NULL,
  employee_id UUID REFERENCES profiles(id),
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  import_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only admins can see all, employees can see their own imports
CREATE POLICY "Admins can view all import batches" ON import_batches
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert import batches" ON import_batches
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update import batches" ON import_batches
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete import batches" ON import_batches
  FOR DELETE USING (public.is_admin());

-- Add user_name column to audit_logs for historical accuracy
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create private bucket for certificates (only admins can access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for certificates bucket - admin only
CREATE POLICY "Only admins can view certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "Only admins can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "Only admins can delete certificates"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificates' AND public.is_admin());