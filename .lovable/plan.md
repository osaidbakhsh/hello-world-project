
# Rename "Branch" to "Site" & Finalize Site CRUD

## Summary
This plan cleans up legacy "branch" terminology in the codebase by renaming all Branch-related types to Site-based naming, ensuring consistency across the application. The Site CRUD functionality is already fully implemented.

---

## Current State Analysis

### Already Implemented (No Changes Needed)
The Site CRUD system is fully functional:
- `src/contexts/SiteContext.tsx` - Global site selection state
- `src/hooks/useSites.ts` - CRUD operations (create, read, update, delete)
- `src/components/layout/SiteSwitcher.tsx` - Header dropdown
- `src/components/sites/SiteManagementDialog.tsx` - Admin management dialog
- `src/components/sites/SiteForm.tsx` - Create/edit form

### Legacy Code to Clean Up
The file `src/types/supabase-models.ts` contains outdated "Branch" terminology that should be renamed to "Site":
- `BranchRole` type
- `Branch` interface
- `BranchMembership` interface
- `Domain.branch_id` field

---

## Implementation Tasks

### Task 1: Update TypeScript Model Types

**File**: `src/types/supabase-models.ts`

**Changes**:

| Current Name | New Name |
|-------------|----------|
| `BranchRole` | `SiteRole` |
| `Branch` | `Site` |
| `BranchMembership` | `SiteMembership` |
| `Domain.branch_id` | `Domain.site_id` |

**Updated Type Definitions**:

```typescript
// Before
export type BranchRole = 'branch_admin' | 'branch_operator' | 'branch_viewer';

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  region: string | null;
  timezone: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchMembership {
  id: string;
  branch_id: string;
  profile_id: string;
  branch_role: BranchRole;
  created_at: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  branch_id: string;  // ← Old name
  created_at: string;
}
```

```typescript
// After
export type SiteRole = 'site_admin' | 'site_operator' | 'site_viewer';

export interface Site {
  id: string;
  name: string;
  code: string;
  city: string | null;
  region: string | null;
  timezone: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteMembership {
  id: string;
  site_id: string;
  profile_id: string;
  site_role: SiteRole;
  created_at: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  site_id: string;  // ← Updated name
  created_at: string;
}
```

---

### Task 2: Database Enum Cleanup (Optional)

The database has both `branch_role` and `site_role` enums. For complete cleanup, a migration should rename the enum:

```sql
-- Rename the enum type
ALTER TYPE branch_role RENAME TO site_role_legacy;

-- Or if you want to keep site_role as the canonical enum, 
-- just drop branch_role if unused
DROP TYPE IF EXISTS branch_role;
```

However, since the Supabase types file is auto-generated, this is a database-level change that would require careful migration planning.

---

### Task 3: Verify No Code Dependencies

Search confirms no active code imports or uses the `Branch`, `BranchRole`, or `BranchMembership` types from `supabase-models.ts`. The only reference to "Branch" in other files is the `GitBranch` icon from Lucide (unrelated).

---

## File Change Summary

| File | Action | Changes |
|------|--------|---------|
| `src/types/supabase-models.ts` | Update | Rename Branch types to Site types |

---

## No Changes Required

The following files are already correctly using "Site" terminology:
- `src/contexts/SiteContext.tsx`
- `src/hooks/useSites.ts`
- `src/components/layout/SiteSwitcher.tsx`
- `src/components/sites/SiteManagementDialog.tsx`
- `src/components/sites/SiteForm.tsx`

---

## Testing Checklist

After implementation:
- [ ] TypeScript compilation passes with no errors
- [ ] Site Switcher dropdown works correctly
- [ ] Can create new sites via "Manage Sites" dialog
- [ ] Can edit existing sites
- [ ] Can delete sites (with dependency check)
- [ ] Site selection persists across page refreshes
- [ ] Changing sites clears hierarchy selection
