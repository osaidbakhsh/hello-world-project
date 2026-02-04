-- Add missing columns to infra_credential_access_logs for full audit trail
ALTER TABLE public.infra_credential_access_logs 
ADD COLUMN IF NOT EXISTS resource_id uuid,
ADD COLUMN IF NOT EXISTS resource_type text;

-- Add encryption_tag column to infrastructure_credentials for additional security
ALTER TABLE public.infrastructure_credentials
ADD COLUMN IF NOT EXISTS encryption_tag text;