-- =========================================================================
-- ENT-RBAC-001 Part 1: Add super_admin to enum
-- =========================================================================

-- Add 'super_admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';