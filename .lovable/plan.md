
# Fix Site Switcher: Rename "Branch" to "Site" & Enable Site Creation

## Issues Identified

### Issue 1: `isAdmin` Check Doesn't Include `super_admin`
The `useUserRole` hook only checks for `role === 'admin'`, but the current user has role `'super_admin'`. This means:
- The "Manage Sites" button is hidden
- The user can't access site management

**Location**: `src/hooks/useUserRole.ts` line 65

```typescript
// Current (broken)
isAdmin: role === 'admin',

// Should be
isAdmin: role === 'admin' || role === 'super_admin',
```

### Issue 2: Database Has "Default Branch" Name
The existing site in the database still has the old name "Default Branch" instead of a proper site name.

**Current data**: `name: "Default Branch", code: "DEFAULT"`

**Fix**: Run a database update to rename the site.

### Issue 3: Add `isSuperAdmin` Flag for Clarity
The hook should also expose `isSuperAdmin` for cases where only super admins can perform actions (like creating new sites).

---

## Implementation Tasks

### Task 1: Update `useUserRole` Hook
**File**: `src/hooks/useUserRole.ts`

Add super_admin to the admin check and expose a new `isSuperAdmin` flag:

```typescript
interface UseUserRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;  // NEW
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// In return statement:
return {
  role,
  isAdmin: role === 'admin' || role === 'super_admin',  // FIXED
  isSuperAdmin: role === 'super_admin',  // NEW
  isLoading,
  error,
  refetch: fetchRole,
};
```

### Task 2: Update SiteSwitcher Component
**File**: `src/components/layout/SiteSwitcher.tsx`

The component already uses `isAdmin` correctly - once the hook is fixed, it will work. No changes needed to this file.

### Task 3: Update Database Site Name
Rename "Default Branch" to a proper site name via migration:

```sql
UPDATE sites 
SET name = 'Main Site', code = 'MAIN'
WHERE name = 'Default Branch';
```

---

## File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/hooks/useUserRole.ts` | Update | Fix `isAdmin` to include `super_admin`, add `isSuperAdmin` flag |
| Database migration | Create | Rename "Default Branch" to "Main Site" |

---

## Testing Checklist

After implementation:
- [ ] User can see "Manage Sites" button in Site Switcher dropdown
- [ ] User can open Site Management dialog
- [ ] User can create new sites
- [ ] User can edit existing sites
- [ ] User can delete sites (if no dependencies)
- [ ] Site name shows as "Main Site" instead of "Default Branch"
