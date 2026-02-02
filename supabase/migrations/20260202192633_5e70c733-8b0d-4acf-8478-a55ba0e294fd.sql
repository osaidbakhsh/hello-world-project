-- Add unique constraints for upsert to work properly
CREATE UNIQUE INDEX IF NOT EXISTS mail_configs_domain_id_idx 
  ON mail_configs(domain_id) 
  WHERE domain_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ntp_configs_domain_id_idx 
  ON ntp_configs(domain_id) 
  WHERE domain_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ldap_configs_domain_id_idx 
  ON ldap_configs(domain_id) 
  WHERE domain_id IS NOT NULL;

-- Enhance datacenters table with professional fields
ALTER TABLE datacenters 
  ADD COLUMN IF NOT EXISTS power_capacity_kw integer,
  ADD COLUMN IF NOT EXISTS cooling_type text,
  ADD COLUMN IF NOT EXISTS tier_level text,
  ADD COLUMN IF NOT EXISTS rack_count integer,
  ADD COLUMN IF NOT EXISTS floor_space_sqm numeric,
  ADD COLUMN IF NOT EXISTS certifications text[],
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS emergency_contact text;