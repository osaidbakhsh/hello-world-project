-- Add SMTP authentication columns to mail_configs
ALTER TABLE mail_configs 
  ADD COLUMN IF NOT EXISTS smtp_username text,
  ADD COLUMN IF NOT EXISTS smtp_password_encrypted text;

-- Add SMB credentials to file_shares
ALTER TABLE file_shares 
  ADD COLUMN IF NOT EXISTS smb_username text,
  ADD COLUMN IF NOT EXISTS smb_password_encrypted text;

-- Add RLS policies for storage bucket (employee-reports bucket already exists)
-- Ensure authenticated users can upload, read, and delete reports
CREATE POLICY "Authenticated users can upload employee reports" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'employee-reports');

CREATE POLICY "Authenticated users can read employee reports" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'employee-reports');

CREATE POLICY "Authenticated users can delete employee reports" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'employee-reports');