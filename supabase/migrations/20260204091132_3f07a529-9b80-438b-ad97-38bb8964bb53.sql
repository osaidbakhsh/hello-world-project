-- Clean up old network RLS policies that still reference is_admin/domain_id
DROP POLICY IF EXISTS "Admins can do all on networks" ON networks;
DROP POLICY IF EXISTS "Users can view assigned networks" ON networks;