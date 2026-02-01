-- EPIC D: Add Asset Lifecycle fields to servers table
-- Purchase and vendor information
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS vendor text;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS serial_number text;

-- Warranty and support
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS warranty_end date;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS contract_id text;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS support_level text DEFAULT 'standard';

-- End of Life / End of Support dates
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS eol_date date;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS eos_date date;

-- Server role classification
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS server_role text[] DEFAULT '{}';

-- RTO/RPO and disaster recovery
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS rpo_hours integer;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS rto_hours integer;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS last_restore_test timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.servers.purchase_date IS 'Date the server was purchased';
COMMENT ON COLUMN public.servers.vendor IS 'Hardware vendor (Dell, HP, etc.)';
COMMENT ON COLUMN public.servers.model IS 'Server model number';
COMMENT ON COLUMN public.servers.serial_number IS 'Hardware serial number';
COMMENT ON COLUMN public.servers.warranty_end IS 'Warranty expiration date';
COMMENT ON COLUMN public.servers.contract_id IS 'Support contract reference';
COMMENT ON COLUMN public.servers.support_level IS 'Support tier: standard, premium, none';
COMMENT ON COLUMN public.servers.eol_date IS 'End of Life date - no more updates';
COMMENT ON COLUMN public.servers.eos_date IS 'End of Support date - vendor support ends';
COMMENT ON COLUMN public.servers.server_role IS 'Server roles: DC, CA, DNS, DHCP, File, Exchange, SQL, IIS, etc.';
COMMENT ON COLUMN public.servers.rpo_hours IS 'Recovery Point Objective in hours';
COMMENT ON COLUMN public.servers.rto_hours IS 'Recovery Time Objective in hours';
COMMENT ON COLUMN public.servers.last_restore_test IS 'Last successful restore test date';