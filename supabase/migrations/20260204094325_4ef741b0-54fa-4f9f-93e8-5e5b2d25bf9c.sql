-- ============================================================
-- MIGRATION 5: User Private Vault (Zero-Knowledge Architecture)
-- ============================================================

-- 1. Create user_private_vault table
-- This table stores employee's personal secrets with ABSOLUTE isolation
-- Even Super Admins cannot access this data - owner only!
CREATE TABLE IF NOT EXISTS public.user_private_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  encrypted_content text NOT NULL,
  encryption_iv text NOT NULL,
  encryption_tag text,
  content_type text DEFAULT 'note',  -- 'note', 'credential', 'document', 'ssh_key', 'api_key'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_private_vault ENABLE ROW LEVEL SECURITY;

-- 3. THE ONLY POLICY - Absolute owner isolation
-- CRITICAL: This is the ONLY policy on this table.
-- No is_super_admin() bypass, no service role exceptions.
-- auth.uid() is used directly (not get_my_profile_id()) for maximum security.
CREATE POLICY "private_vault_owner_only" ON public.user_private_vault
FOR ALL USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 4. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_private_vault_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_vault_updated_at ON public.user_private_vault;
CREATE TRIGGER trg_private_vault_updated_at
BEFORE UPDATE ON public.user_private_vault
FOR EACH ROW EXECUTE FUNCTION public.update_private_vault_updated_at();

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_vault_owner ON public.user_private_vault(owner_id);
CREATE INDEX IF NOT EXISTS idx_private_vault_content_type ON public.user_private_vault(content_type);
CREATE INDEX IF NOT EXISTS idx_private_vault_created_at ON public.user_private_vault(created_at DESC);

-- 6. Add comment explaining the security model
COMMENT ON TABLE public.user_private_vault IS 
'Zero-knowledge personal vault. ONLY the owner can access their data. 
No admin override, no service role bypass. Content is encrypted client-side.
RLS policy: auth.uid() = owner_id (no exceptions).';