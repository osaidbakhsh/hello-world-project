-- Branding storage bucket for login background
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read access (login page needs to load background without auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Branding assets are publicly readable'
  ) THEN
    CREATE POLICY "Branding assets are publicly readable"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'branding');
  END IF;
END $$;

-- Admin-only write access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload branding assets'
  ) THEN
    CREATE POLICY "Admins can upload branding assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'branding' AND is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update branding assets'
  ) THEN
    CREATE POLICY "Admins can update branding assets"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'branding' AND is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete branding assets'
  ) THEN
    CREATE POLICY "Admins can delete branding assets"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'branding' AND is_admin());
  END IF;
END $$;