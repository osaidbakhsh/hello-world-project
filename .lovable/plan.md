
# Phase 1 Implementation - Branch Hierarchy Foundation

## Pre-Implementation Corrections Applied

Based on your feedback, I'm implementing these corrections:

| Issue | Original Plan | Corrected Approach |
|-------|---------------|-------------------|
| Fixed UUID | Hard-coded `00000000-...` | Use `code='DEFAULT'` as singleton key, SELECT id for backfill |
| can_access_branch | Direct domain_memberships query | Use `can_access_domain(d.id)` for consistency |
| update_updated_at_column | Assumed exists | ✅ Verified exists in database |

---

## Phase 1 Migration SQL

### Migration 1: Create Branch Infrastructure

```sql
-- ============================================================
-- PHASE 1: BRANCH HIERARCHY FOUNDATION
-- ============================================================
-- Corrections applied:
-- 1. No fixed UUID - use code='DEFAULT' as singleton key
-- 2. can_access_branch uses can_access_domain for consistency
-- 3. branch_role default is 'branch_viewer' (not 'viewer')
-- ============================================================

-- Step 1: Create branch_role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'branch_role') THEN
    CREATE TYPE branch_role AS ENUM ('branch_admin', 'branch_operator', 'branch_viewer');
  END IF;
END$$;

-- Step 2: Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  city text,
  region text,
  timezone text DEFAULT 'Asia/Riyadh',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Add updated_at trigger for branches
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Create branch_memberships table
CREATE TABLE IF NOT EXISTS branch_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_role branch_role NOT NULL DEFAULT 'branch_viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, profile_id)
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_branch_memberships_branch ON branch_memberships(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_memberships_profile ON branch_memberships(profile_id);

-- Step 6: Enable RLS on both tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_memberships ENABLE ROW LEVEL SECURITY;

-- Step 7: Add branch_id to domains (nullable first)
ALTER TABLE domains ADD COLUMN IF NOT EXISTS branch_id uuid;

-- Step 8: Create default branch (idempotent using code as singleton key)
INSERT INTO branches (name, code, notes)
VALUES ('Default Branch', 'DEFAULT', 'Auto-created for existing domains')
ON CONFLICT (code) DO NOTHING;

-- Step 9: Backfill domains with default branch (using code lookup, NOT fixed UUID)
UPDATE domains 
SET branch_id = (SELECT id FROM branches WHERE code = 'DEFAULT')
WHERE branch_id IS NULL;

-- Step 10: Enforce NOT NULL on domains.branch_id
ALTER TABLE domains ALTER COLUMN branch_id SET NOT NULL;

-- Step 11: Add FK constraint (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_domains_branch' AND table_name = 'domains'
  ) THEN
    ALTER TABLE domains ADD CONSTRAINT fk_domains_branch 
      FOREIGN KEY (branch_id) REFERENCES branches(id);
  END IF;
END$$;

-- Step 12: Add index on domains.branch_id
CREATE INDEX IF NOT EXISTS idx_domains_branch ON domains(branch_id);

-- ============================================================
-- SECURITY FUNCTIONS (all with SET search_path = public)
-- ============================================================

-- can_access_branch: Uses can_access_domain for consistency
CREATE OR REPLACE FUNCTION public.can_access_branch(_branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    -- Direct branch membership
    OR EXISTS (
      SELECT 1 FROM branch_memberships bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid() AND bm.branch_id = _branch_id
    )
    -- Has access to any domain under this branch (uses can_access_domain for consistency)
    OR EXISTS (
      SELECT 1 FROM domains d
      WHERE d.branch_id = _branch_id AND can_access_domain(d.id)
    )
$$;

-- can_manage_branch: Branch admin or super_admin
CREATE OR REPLACE FUNCTION public.can_manage_branch(_branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM branch_memberships bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid() 
        AND bm.branch_id = _branch_id
        AND bm.branch_role = 'branch_admin'
    )
$$;

-- is_branch_admin: Same logic as can_manage_branch
CREATE OR REPLACE FUNCTION public.is_branch_admin(_branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM branch_memberships bm
      JOIN profiles p ON p.id = bm.profile_id
      WHERE p.user_id = auth.uid() 
        AND bm.branch_id = _branch_id
        AND bm.branch_role = 'branch_admin'
    )
$$;

-- UPDATED can_access_domain: Add branch_admin inheritance
CREATE OR REPLACE FUNCTION public.can_access_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    -- Direct domain membership
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      JOIN profiles p ON p.id = dm.profile_id
      WHERE p.user_id = auth.uid() AND dm.domain_id = _domain_id
    )
    -- Branch admin inherits access to all domains in their branch
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN branch_memberships bm ON bm.branch_id = d.branch_id
      JOIN profiles p ON p.id = bm.profile_id
      WHERE d.id = _domain_id
        AND p.user_id = auth.uid()
        AND bm.branch_role = 'branch_admin'
    )
$$;

-- UPDATED can_edit_domain: Add branch_admin inheritance
CREATE OR REPLACE FUNCTION public.can_edit_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin()
    -- Direct domain membership with edit rights
    OR EXISTS (
      SELECT 1 FROM domain_memberships dm
      JOIN profiles p ON p.id = dm.profile_id
      WHERE p.user_id = auth.uid() 
        AND dm.domain_id = _domain_id
        AND dm.can_edit = true
    )
    -- Branch admin inherits edit access
    OR EXISTS (
      SELECT 1 FROM domains d
      JOIN branch_memberships bm ON bm.branch_id = d.branch_id
      JOIN profiles p ON p.id = bm.profile_id
      WHERE d.id = _domain_id
        AND p.user_id = auth.uid()
        AND bm.branch_role = 'branch_admin'
    )
$$;

-- ============================================================
-- RLS POLICIES FOR branches
-- ============================================================
DROP POLICY IF EXISTS "branches_select" ON branches;
DROP POLICY IF EXISTS "branches_insert" ON branches;
DROP POLICY IF EXISTS "branches_update" ON branches;
DROP POLICY IF EXISTS "branches_delete" ON branches;

CREATE POLICY "branches_select" ON branches FOR SELECT
USING (can_access_branch(id));

CREATE POLICY "branches_insert" ON branches FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "branches_update" ON branches FOR UPDATE
USING (can_manage_branch(id))
WITH CHECK (can_manage_branch(id));

CREATE POLICY "branches_delete" ON branches FOR DELETE
USING (is_super_admin());

-- ============================================================
-- RLS POLICIES FOR branch_memberships
-- ============================================================
DROP POLICY IF EXISTS "branch_memberships_select" ON branch_memberships;
DROP POLICY IF EXISTS "branch_memberships_insert" ON branch_memberships;
DROP POLICY IF EXISTS "branch_memberships_update" ON branch_memberships;
DROP POLICY IF EXISTS "branch_memberships_delete" ON branch_memberships;

CREATE POLICY "branch_memberships_select" ON branch_memberships FOR SELECT
USING (can_access_branch(branch_id) OR profile_id = get_my_profile_id());

CREATE POLICY "branch_memberships_insert" ON branch_memberships FOR INSERT
WITH CHECK (can_manage_branch(branch_id));

CREATE POLICY "branch_memberships_update" ON branch_memberships FOR UPDATE
USING (can_manage_branch(branch_id))
WITH CHECK (can_manage_branch(branch_id));

CREATE POLICY "branch_memberships_delete" ON branch_memberships FOR DELETE
USING (can_manage_branch(branch_id));

-- ============================================================
-- UPDATE domains POLICIES (Remove is_admin, use is_super_admin)
-- ============================================================
DROP POLICY IF EXISTS "Admins can do all on domains" ON domains;
DROP POLICY IF EXISTS "Users can view assigned domains" ON domains;
DROP POLICY IF EXISTS "domains_select" ON domains;
DROP POLICY IF EXISTS "domains_insert" ON domains;
DROP POLICY IF EXISTS "domains_update" ON domains;
DROP POLICY IF EXISTS "domains_delete" ON domains;

CREATE POLICY "domains_select" ON domains FOR SELECT
USING (is_super_admin() OR can_access_domain(id));

CREATE POLICY "domains_insert" ON domains FOR INSERT
WITH CHECK (is_super_admin() OR can_manage_branch(branch_id));

CREATE POLICY "domains_update" ON domains FOR UPDATE
USING (is_super_admin() OR can_manage_branch(branch_id))
WITH CHECK (is_super_admin() OR can_manage_branch(branch_id));

CREATE POLICY "domains_delete" ON domains FOR DELETE
USING (is_super_admin());

-- ============================================================
-- UPDATE clusters POLICIES (Remove is_admin)
-- ============================================================
DROP POLICY IF EXISTS "Admins full access to clusters" ON clusters;
DROP POLICY IF EXISTS "Domain members can view clusters" ON clusters;
DROP POLICY IF EXISTS "clusters_select" ON clusters;
DROP POLICY IF EXISTS "clusters_insert" ON clusters;
DROP POLICY IF EXISTS "clusters_update" ON clusters;
DROP POLICY IF EXISTS "clusters_delete" ON clusters;

CREATE POLICY "clusters_select" ON clusters FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "clusters_insert" ON clusters FOR INSERT
WITH CHECK (is_super_admin() OR can_edit_domain(domain_id));

CREATE POLICY "clusters_update" ON clusters FOR UPDATE
USING (is_super_admin() OR can_edit_domain(domain_id))
WITH CHECK (is_super_admin() OR can_edit_domain(domain_id));

CREATE POLICY "clusters_delete" ON clusters FOR DELETE
USING (is_super_admin() OR is_domain_admin(domain_id));
```

---

## Verification Queries (V1-V5)

After migration, I will run these queries and provide outputs:

```sql
-- V1: branch_role enum exists
SELECT typname, enumlabel FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'branch_role'
ORDER BY e.enumsortorder;

-- V2: Default branch exists with code='DEFAULT'
SELECT id, name, code, created_at FROM branches WHERE code = 'DEFAULT';

-- V3: All domains have branch_id (count of NULL must be 0)
SELECT COUNT(*) as null_branch_count FROM domains WHERE branch_id IS NULL;

-- V4: No is_admin in domain/cluster policies
SELECT tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('domains', 'clusters') 
AND (qual LIKE '%is_admin%' OR with_check LIKE '%is_admin%');

-- V5: Security functions have correct search_path
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('can_access_branch', 'can_manage_branch', 'is_branch_admin', 'can_access_domain', 'can_edit_domain')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## RLS Leak Test Matrix Scenarios (1-4, 11-12)

After migration, I will test these scenarios:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Cross-branch domain access | 0 rows for non-member |
| 2 | Cross-domain server access | 0 rows for non-member |
| 3 | Branch admin domain inheritance | All domains in branch |
| 4 | Cross-branch cluster access | 0 rows for non-member |
| 11 | Super admin sees all | All rows |
| 12 | Branch membership self-view | Own records only |

---

## Definition of Done for Phase 1

- [ ] branch_role enum created
- [ ] branches table created with RLS
- [ ] branch_memberships table created with RLS
- [ ] domains.branch_id is NOT NULL
- [ ] Default branch created via code='DEFAULT' (not fixed UUID)
- [ ] All 3 existing domains assigned to Default branch
- [ ] Security functions created with SET search_path = public
- [ ] can_access_domain updated with branch_admin inheritance
- [ ] No is_admin() in domains/clusters policies
- [ ] All verification queries pass
- [ ] RLS test scenarios 1-4, 11-12 pass

---

## Next Steps After Approval

1. Apply the migration
2. Run all verification queries (V1-V5)
3. Execute RLS leak test scenarios
4. Provide evidence of results
5. Proceed to Phase 2 only after Phase 1 is verified complete
