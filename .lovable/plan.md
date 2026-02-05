
# Plan: Connect Vacations, Tasks, and Vault with Sites

## Current State Analysis

### What's Already Working ✓

| Feature | Data Fetching | Site Filtering | Notes |
|---------|---------------|----------------|-------|
| **Vacations** | `useVacations()` | ✓ Already filters by `siteProfileIds` | Data shows site-scoped vacations |
| **Tasks** | `useTasks()` | ✓ Already filters by `siteProfileIds` | Data shows site-scoped tasks |
| **Profiles** | `useProfiles()` | ✓ Already filters by `siteProfileIds` | Dropdowns show site employees |
| **Vault Form** | Uses `useServers()`, `useNetworks()` | ✓ Already site-filtered | Server/network dropdowns are scoped |
| **Vault Share** | Uses `useVisibleEmployees()` | ✓ Already site-filtered | Share dialog shows site employees |

### What's NOT Working ✗

| Feature | Issue | Impact |
|---------|-------|--------|
| **Vault Items** | `useVaultItems()` has NO site filtering | Users see ALL vault items from ALL sites |
| **Vault Shared With Me** | `useVaultSharedWithMe()` has NO site filtering | Users see shares from all sites |
| **Vacations Page** | No auto-select for employee when dialog opens | Minor UX issue |
| **Tasks Page** | No auto-select for employee when dialog opens | Minor UX issue |
| **Employee Filters** | Don't reset when site changes | Shows stale selection from previous site |

---

## Solution Overview

### 1. Fix Vault Site Scoping (Critical)

The `vault_items` table doesn't have a direct `site_id` or `domain_id` column. However, vault items can be linked to:
- `linked_server_id` → Server → Network → Domain → Site
- `linked_network_id` → Network → Domain → Site  
- `linked_application_id` → Web App → Domain → Site

**Strategy A: Filter by Owner's Site Membership**
Since vault items have an `owner_id`, filter vault items where the owner belongs to the selected site (via `domain_memberships`).

**Strategy B: Filter by Linked Resources**
Filter vault items that are linked to servers/networks/applications in the selected site.

**Recommended: Use Strategy A** - Filter by owner's domain membership. This ensures:
- Personal vault items follow the owner's site assignment
- Simpler implementation without complex joins
- Consistent with how Tasks and Vacations work

### 2. Fix Filter State Reset

When site changes, the employee filter dropdowns in Vacations and Tasks retain old values. Need to:
- Reset `filterEmployee` to 'all' when site changes
- Add `useEffect` to watch site changes

### 3. Auto-Select First Employee in Forms (Nice to have)

Pre-select current user in creation dialogs if available.

---

## Implementation Steps

### Step 1: Update `useVaultItems()` Hook

**File:** `src/hooks/useVaultData.ts`

Add site filtering to the main vault items query:

```typescript
import { useSite } from '@/contexts/SiteContext';
import { useSiteProfileIds } from '@/hooks/useSiteDomains';

export function useVaultItems() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  
  return useQuery({
    queryKey: ['vault-items', selectedSite?.id, siteProfileIds],
    queryFn: async () => {
      let query = supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by owners in the selected site
      if (selectedSite && siteProfileIds.length > 0) {
        query = query.in('owner_id', siteProfileIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VaultItem[];
    },
    enabled: !selectedSite || siteProfileIds.length > 0,
  });
}
```

### Step 2: Update `useVaultSharedWithMe()` Hook

**File:** `src/hooks/useVaultData.ts`

Filter shared items by the owner's site membership:

```typescript
export function useVaultSharedWithMe() {
  const { profile } = useAuth();
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();
  
  return useQuery({
    queryKey: ['vault-shared-with-me', profile?.id, selectedSite?.id],
    queryFn: async () => {
      // ... existing permission fetch logic ...
      
      // Additional filter: only show items where owner is in selected site
      if (selectedSite && siteProfileIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('vault_items')
          .select('*')
          .in('id', itemIds)
          .neq('owner_id', profile.id)
          .in('owner_id', siteProfileIds); // NEW: Filter by site
          
        // ...
      }
    },
  });
}
```

### Step 3: Add Cache Invalidation for Vault on Site Change

**File:** `src/contexts/SiteContext.tsx`

Add vault queries to the invalidation list:

```typescript
// In setSelectedSite callback
queryClient.invalidateQueries({ queryKey: ['vault-items'] });
queryClient.invalidateQueries({ queryKey: ['vault-shared-with-me'] });
queryClient.invalidateQueries({ queryKey: ['vault-permissions'] });
```

### Step 4: Reset Filters on Site Change in Vacations Page

**File:** `src/pages/Vacations.tsx`

Add effect to reset employee filter when site changes:

```typescript
import { useSite } from '@/contexts/SiteContext';

// In component:
const { selectedSite } = useSite();

// Reset employee filter when site changes
useEffect(() => {
  setFilterEmployee('all');
}, [selectedSite?.id]);
```

### Step 5: Reset Filters on Site Change in Tasks Page

**File:** `src/pages/Tasks.tsx`

Add effect to reset employee filter when site changes:

```typescript
import { useSite } from '@/contexts/SiteContext';

// In component:
const { selectedSite } = useSite();

// Reset employee/department filter when site changes
useEffect(() => {
  setEmployeeFilter('all');
  setDepartmentFilter('all');
}, [selectedSite?.id]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useVaultData.ts` | Add site filtering to `useVaultItems()` and `useVaultSharedWithMe()` |
| `src/contexts/SiteContext.tsx` | Add vault query invalidation on site change |
| `src/pages/Vacations.tsx` | Reset employee filter on site change |
| `src/pages/Tasks.tsx` | Reset employee/department filters on site change |

---

## Technical Details

### Vault Site Filtering Logic

```text
Site (selected in header)
  └── Domain (site_id = selectedSite.id)
        └── DomainMembership (domain_id)
              └── Profile (profile_id) ← siteProfileIds
                    └── VaultItem (owner_id IN siteProfileIds) ← NEW FILTER
```

### Data Flow After Fix

```text
1. User selects "Site 2" in header
2. SiteContext triggers query invalidation
3. useSiteProfileIds() fetches profile IDs for Site 2
4. useVaultItems() filters: owner_id IN [site2ProfileIds]
5. Only vault items owned by Site 2 employees are shown
6. VaultShareDialog shows only Site 2 employees for sharing
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Vault item linked to Server in different site | Still shows if owner is in current site |
| Admin with access to multiple sites | Sees vault items based on currently selected site |
| Shared vault item from user in different site | Hidden when viewing that site |
| No employees in site | Empty vault list with appropriate message |

---

## Verification Checklist

| Test | Expected |
|------|----------|
| Switch to Site 2, view Vault | Only Site 2 owners' vault items visible |
| Switch to Site 2, view "Shared with me" | Only shares from Site 2 owners visible |
| Switch site on Vacations page | Employee filter resets to "All" |
| Switch site on Tasks page | Employee/department filters reset |
| Open vacation form in Site 2 | Employee dropdown shows Site 2 employees only |
| Share vault item in Site 2 | Employee picker shows Site 2 employees only |
