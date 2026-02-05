
# Plan: Fix Site Context for Entity Creation Across the Application

## Problem Analysis

When a user is viewing **Site 2** and creates a new entity (e.g., Domain, Network, Server, License), the entity gets created under **Main Site** (or a default site) instead of the currently selected site. This breaks the multi-site architecture.

### Root Cause

Creation forms do NOT use the `selectedSite` from `SiteContext`. Instead, they either:
1. Lookup a "DEFAULT" site code in the database
2. Use the first available site
3. Allow users to select a domain (but domains shown are already filtered by site, yet the form doesn't enforce the site relationship)

### Impact Analysis

| Entity | Current Behavior | Problem |
|--------|------------------|---------|
| **Domains** | Uses DEFAULT site fallback | New domains go to wrong site |
| **Datacenters** | Linked via `domain_id` only | Inherits issue from domain selection |
| **Clusters** | Linked via `datacenter_id` + `domain_id` | Inherits issue |
| **Networks** | Linked via `domain_id` | Works if domain picker is correct |
| **Servers** | Linked via `network_id` | Works if network/domain is correct |
| **Licenses** | Has optional `domain_id` | No site enforcement |
| **Web Apps** | Has optional `domain_id` | No site enforcement |
| **Maintenance Windows** | Has optional `domain_id` | No site enforcement |
| **On-Call Schedules** | Has optional `domain_id` | No site enforcement |
| **File Shares** | Requires `domain_id` (NOT NULL) | Works via domain picker |
| **Tasks** | Linked via `assigned_to` profile | No direct site link |
| **Vacations** | Linked via `profile_id` | No direct site link |

---

## Solution Overview

### Strategy

Enforce site context at two levels:

1. **Domain Creation**: Use `selectedSite.id` directly instead of looking up DEFAULT site
2. **Domain-Linked Entities**: Ensure domain dropdown only shows domains from the selected site (already working via `useDomains()` hook) and forms pre-select appropriate domains
3. **Profile-Linked Entities**: Tasks, Vacations - filter profile dropdowns to site members only

---

## Implementation Steps

### Step 1: Fix Domain Creation in Networks.tsx

**File:** `src/pages/Networks.tsx`

**Current Code (lines 97-125):**
```typescript
// Get default site (try DEFAULT code first, fallback to first available)
let { data: defaultSite } = await supabase
  .from('sites')
  .select('id')
  .eq('code', 'DEFAULT')
  .maybeSingle();

if (!defaultSite) {
  const { data: firstSite } = await supabase
    .from('sites')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  defaultSite = firstSite;
}
```

**Fix:** Use `selectedSite` from `useSite()` context:
```typescript
import { useSite } from '@/contexts/SiteContext';

// Inside component:
const { selectedSite } = useSite();

// In handleDomainSubmit:
if (!selectedSite?.id) {
  toast({ title: t('common.error'), description: 'Please select a site first', variant: 'destructive' });
  return;
}

const { error } = await supabase
  .from('domains')
  .insert({ 
    name: domainForm.name, 
    description: domainForm.description,
    site_id: selectedSite.id  // Use context directly
  });
```

---

### Step 2: Fix Seed Data Site Lookup

**File:** `src/utils/seedData.ts`

**Current Code (lines 1071-1090):** Uses DEFAULT site lookup

**Fix:** Accept site parameter or use first available site:
- Already fixed via the previous plan (fallback to first site)
- Ensure the refactor properly assigns domains to correct sites

---

### Step 3: Add Site Guard for Entity Creation

Add a reusable guard pattern to prevent entity creation without site context.

**New Helper Function:**
```typescript
// In src/hooks/useSiteDomains.ts or a new utility
export function useSiteGuard() {
  const { selectedSite } = useSite();
  const { toast } = useToast();
  
  const guardedAction = async <T>(
    action: () => Promise<T>,
    message = 'Please select a site first'
  ): Promise<T | null> => {
    if (!selectedSite) {
      toast({ 
        title: 'Site Required', 
        description: message, 
        variant: 'destructive' 
      });
      return null;
    }
    return action();
  };
  
  return { selectedSite, guardedAction };
}
```

---

### Step 4: Update Entity Creation Forms

#### 4.1 Licenses Page (`src/pages/Licenses.tsx`)

**Current Issue:** Domain selector shows site-filtered domains, but no enforcement

**Fix:** Pre-select first domain if available, show warning if no domains exist

```typescript
const { selectedSite } = useSite();

// In form initialization or when dialog opens:
useEffect(() => {
  if (domains.length > 0 && !formData.domain_id) {
    setFormData(prev => ({ ...prev, domain_id: domains[0].id }));
  }
}, [domains]);
```

#### 4.2 Web Apps Page (`src/pages/WebApps.tsx`)

**Current Issue:** Domain is optional, no site enforcement

**Fix:** Same pattern - pre-select first domain or make domain required for site-scoped apps

#### 4.3 Maintenance Windows (`src/pages/MaintenanceWindows.tsx`)

**Current Issue:** Domain selector available but optional

**Fix:** Pre-select first domain from filtered list

#### 4.4 On-Call Schedules (`src/pages/OnCallSchedule.tsx`)

**Current Issue:** Domain selector available but optional

**Fix:** Pre-select first domain from filtered list

---

### Step 5: Ensure Data Hooks Filter Correctly

**Already Working:**
- `useDomains()` - filters by `selectedSite.id`
- `useNetworks()` - filters by `siteDomainIds`
- `useServers()` - filters by `siteDomainIds`
- `useLicenses()` - filters by `siteDomainIds`
- `useProfiles()` - filters by `siteProfileIds`
- `useTasks()` - filters by `siteProfileIds`
- `useVacations()` - filters by `siteProfileIds`

**Need to Verify/Add Filtering:**
- `useWebsiteApplications()` - check if it uses site context
- Maintenance Windows query - add site filtering
- On-Call Schedules query - add site filtering
- File Shares query - add site filtering

---

### Step 6: Update Dashboard and Widgets

Ensure dashboard stats and widgets use site-scoped data:

**Already Fixed:**
- `WebAppsWidget` - uses `useSiteDomains()` for filtering

**Verify:**
- `ExpiryWidget` - check if licenses are site-filtered
- `SecurityDashboardWidget` - check data source
- Dashboard stats in `useDashboardStats` - already uses site context

---

## Files to Modify

| File | Changes Required |
|------|------------------|
| `src/pages/Networks.tsx` | Use `selectedSite` for domain creation, add import |
| `src/pages/Licenses.tsx` | Add site context, pre-select domain |
| `src/pages/WebApps.tsx` | Add site context, pre-select domain |
| `src/pages/MaintenanceWindows.tsx` | Add site filtering to query, pre-select domain |
| `src/pages/OnCallSchedule.tsx` | Add site filtering to query, pre-select domain |
| `src/hooks/useSupabaseData.ts` | Add `useWebsiteApplications` site filtering |
| `src/components/fileshares/FileShareForm.tsx` | Verify domain pre-selection |
| `src/hooks/useSiteDomains.ts` | Add `useSiteGuard()` helper (optional) |

---

## Technical Details

### Key Pattern: Site-Aware Entity Creation

```typescript
// 1. Import site context
import { useSite } from '@/contexts/SiteContext';

// 2. Get selected site
const { selectedSite } = useSite();

// 3. Guard creation if no site selected
if (!selectedSite) {
  toast({ title: 'Error', description: 'Please select a site first', variant: 'destructive' });
  return;
}

// 4a. For direct site_id tables (domains):
await supabase.from('domains').insert({ site_id: selectedSite.id, ... });

// 4b. For domain_id tables (networks, licenses, etc.):
// The domain dropdown already shows only site-filtered domains
// Just ensure a domain is selected before submission
```

### Database Relationship Chain

```text
Site (selected in header)
  └── Domain (site_id = selectedSite.id)
        ├── Network (domain_id = domain.id)
        │     └── Server (network_id = network.id)
        ├── Datacenter (domain_id = domain.id)
        │     └── Cluster (datacenter_id)
        │           └── Node/VM (cluster_id)
        ├── License (domain_id)
        ├── Web App (domain_id)
        ├── Maintenance Window (domain_id)
        ├── On-Call Schedule (domain_id)
        └── File Share (domain_id)

Profile (linked to site via domain_membership)
  ├── Task (assigned_to = profile.id)
  ├── Vacation (profile_id)
  └── Employee Report (profile_id)
```

---

## Verification Checklist

After implementation, verify the following scenarios:

| Test Case | Expected Behavior |
|-----------|-------------------|
| Switch to Site 2, create domain | Domain has `site_id` = Site 2's ID |
| Switch to Site 2, create network | Network linked to Site 2 domain |
| Switch to Site 2, create license | License linked to Site 2 domain |
| Switch to Site 2, view servers | Only Site 2 servers visible |
| Switch sites, check dashboard | Stats update for new site |
| Create task for Site 2 employee | Task visible only in Site 2 |

