
# Vault Share Employee Picker + Domain-Scoped Visibility + Translation Fixes

## Summary

This implementation adds domain-scoped employee visibility for vault sharing, with privacy enhancements and translation fixes.

---

## Section 1: Database Migration

### 1.1 Create `list_visible_employees()` RPC Function

**Privacy-aware implementation:**
- Super admin returns: `id`, `full_name`, `email` (global directory)
- Non-admin returns: `id`, `full_name` only (domain-scoped, no email for privacy)

```sql
-- Create the RPC function for visible employees
CREATE OR REPLACE FUNCTION list_visible_employees()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  is_super BOOLEAN;
BEGIN
  current_profile_id := get_my_profile_id();
  
  IF current_profile_id IS NULL THEN
    RETURN;
  END IF;

  is_super := is_super_admin();

  -- Super admin: see ALL employees with email (global directory)
  IF is_super THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.email
    FROM profiles p
    WHERE p.id <> current_profile_id
    ORDER BY p.full_name;
    RETURN;
  END IF;

  -- Non-admin: see only employees in shared domains (no email for privacy)
  RETURN QUERY
  SELECT DISTINCT p.id, p.full_name, NULL::TEXT as email
  FROM profiles p
  JOIN domain_memberships dm_emp ON dm_emp.profile_id = p.id
  JOIN domain_memberships dm_me ON dm_me.domain_id = dm_emp.domain_id
  WHERE dm_me.profile_id = current_profile_id
    AND p.id <> current_profile_id
  ORDER BY p.full_name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION list_visible_employees() TO authenticated;

-- Add performance index for domain membership lookups
CREATE INDEX IF NOT EXISTS idx_domain_memberships_profile_domain 
ON domain_memberships(profile_id, domain_id);
```

---

## Section 2: Frontend Hook

### 2.1 Create `useVisibleEmployees` Hook

**New file:** `src/hooks/useVisibleEmployees.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VisibleEmployee {
  id: string;
  full_name: string;
  email: string | null;
}

export function useVisibleEmployees() {
  return useQuery({
    queryKey: ['visible-employees'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_visible_employees');
      if (error) throw error;
      return (data || []) as VisibleEmployee[];
    },
    // Ensure fresh data for domain membership changes
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
```

---

## Section 3: Invalidate on Domain Membership Changes

### 3.1 Update `EmployeePermissions.tsx`

**Location:** Lines 511-513 (after `await refetchMemberships()`)

**Add import at top:**
```typescript
import { useQueryClient } from '@tanstack/react-query';
```

**Add in component:**
```typescript
const queryClient = useQueryClient();
```

**After line 511 (`await refetchMemberships();`):**
```typescript
await refetchMemberships();
queryClient.invalidateQueries({ queryKey: ['visible-employees'] }); // NEW
```

---

## Section 4: Update VaultShareDialog

### 4.1 Replace `useProfiles` with `useVisibleEmployees`

**File:** `src/components/vault/VaultShareDialog.tsx`

**Key changes:**
1. Import new hook: `import { useVisibleEmployees } from '@/hooks/useVisibleEmployees';`
2. Remove `useProfiles` import
3. Handle loading state for employees
4. Handle empty employee list with translated message
5. Display `full_name` with optional email (only for super admin)
6. Update `getProfileName` to use visible employees list

**Modified structure:**
- Line 4: Change import from `useProfiles` to `useVisibleEmployees`
- Line 42: Change hook call to `useVisibleEmployees()`
- Lines 51-55: Filter using `visibleEmployees`
- Lines 124-126: Update `getProfileName` to use `visibleEmployees`
- Lines 146-152: Add loading and empty state handling

---

## Section 5: Translation Keys

### 5.1 Arabic Translations (add after line 1470)

```typescript
// Vault Sharing
'vault.myVault': 'خزنتي',
'vault.sharedWithMe': 'مشاركة معي',
'vault.share': 'مشاركة',
'vault.shareWith': 'مشاركة مع',
'vault.selectEmployee': 'اختر موظف',
'vault.permissionLevel': 'مستوى الصلاحية',
'vault.viewMetadataOnly': 'عرض البيانات فقط',
'vault.viewSecret': 'عرض كلمة المرور',
'vault.currentShares': 'المشاركات الحالية',
'vault.noShares': 'لا توجد مشاركات',
'vault.shareCreated': 'تمت المشاركة بنجاح',
'vault.shareRevoked': 'تم إلغاء المشاركة',
'vault.revokeAccess': 'إلغاء الصلاحية',
'vault.cannotShareWithSelf': 'لا يمكن المشاركة مع نفسك',
'vault.noEmployeesAvailable': 'لا يوجد موظفون متاحون',
```

### 5.2 English Translations (add after line 3063)

```typescript
// Vault Sharing
'vault.myVault': 'My Vault',
'vault.sharedWithMe': 'Shared with Me',
'vault.share': 'Share',
'vault.shareWith': 'Share with',
'vault.selectEmployee': 'Select Employee',
'vault.permissionLevel': 'Permission Level',
'vault.viewMetadataOnly': 'View Metadata Only',
'vault.viewSecret': 'View Secret',
'vault.currentShares': 'Current Shares',
'vault.noShares': 'No shares yet',
'vault.shareCreated': 'Shared successfully',
'vault.shareRevoked': 'Share revoked',
'vault.revokeAccess': 'Revoke Access',
'vault.cannotShareWithSelf': 'Cannot share with yourself',
'vault.noEmployeesAvailable': 'No available employees',
```

---

## Section 6: Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| Database migration | CREATE | Add `list_visible_employees()` RPC function with GRANT and index |
| `src/hooks/useVisibleEmployees.ts` | CREATE | New hook with staleTime:0, refetchOnMount:'always', refetchOnWindowFocus:true |
| `src/components/vault/VaultShareDialog.tsx` | MODIFY | Use new hook, handle empty/loading states, fix getProfileName |
| `src/pages/EmployeePermissions.tsx` | MODIFY | Add queryClient invalidation after membership save |
| `src/contexts/LanguageContext.tsx` | MODIFY | Add 15 missing translation keys (AR + EN) |

---

## Section 7: Implementation Order

1. Apply database migration (create RPC function with GRANT and index)
2. Create `useVisibleEmployees` hook with React Query freshness settings
3. Update `VaultShareDialog` to use new hook with proper loading/empty states
4. Update `EmployeePermissions` to invalidate visible-employees on membership changes
5. Add all 15 missing translation keys (Arabic + English)
6. Test and verify

---

## Section 8: Technical Details

### React Query Freshness Settings
```typescript
{
  staleTime: 0,           // Always consider data stale
  refetchOnMount: 'always', // Refetch every time component mounts
  refetchOnWindowFocus: true, // Refetch when user returns to tab
}
```

### Translation Key Verification
All vault UI components already use `t('vault.*')` pattern correctly:
- `Vault.tsx` line 139: `{t('vault.myVault')}`
- `Vault.tsx` line 146: `{t('vault.sharedWithMe')}`
- `VaultShareDialog.tsx` line 141: `{t('vault.shareWith')}`
- `VaultShareDialog.tsx` line 155: `{t('vault.permissionLevel')}`

The issue is the translation keys don't exist yet - the `t()` calls are correct but return the key name.

---

## Section 9: Test Report Template

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Super admin opens Share dialog | Sees ALL employees with email, excluding self | PENDING |
| 2 | Employee opens Share dialog | Sees only domain-scoped colleagues, no email | PENDING |
| 3 | Add domain membership via Permissions page | Visible employees list updates without page refresh | PENDING |
| 4 | Employee cannot see employees in unshared domains | Filtered list or empty | PENDING |
| 5 | No raw `vault.*` keys in UI | All text translated | PENDING |
| 6 | Empty employee list | Shows translated "No available employees" | PENDING |
| 7 | Tab labels in Vault page | Shows "My Vault" / "Shared with Me" translated | PENDING |
| 8 | Permission level labels | "View Metadata Only" / "View Secret" translated | PENDING |
