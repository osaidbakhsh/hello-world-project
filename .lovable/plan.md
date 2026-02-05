
# Fix: Seed Data "Default Site Not Found" Error

## Problem Analysis

The `seedAllData()` function (line 1061-1071) attempts to find a site with `code = 'DEFAULT'`:

```typescript
const { data: defaultSite } = await supabase
  .from('sites')
  .select('id')
  .eq('code', 'DEFAULT')
  .single();

if (!defaultSiteId) {
  throw new Error('Default site not found. Please run database migrations first.');
}
```

**Current sites in database:**
| Name | Code | City |
|------|------|------|
| Main Site | MAIN | - |
| Site 2 | SIT | Jeddah |
| osaid Site | MAKKAH | Makkah |

None of these have the code `DEFAULT`, causing the error.

---

## Solution

Update the seed data logic to use the **first available site** instead of requiring a specific `DEFAULT` site. This makes the seeding more flexible and robust.

---

## Implementation Steps

### Step 1: Update Site Lookup Logic

Replace the strict `DEFAULT` code lookup with a fallback approach:

**File:** `src/utils/seedData.ts`

```typescript
// BEFORE (lines 1061-1071):
const { data: defaultSite } = await supabase
  .from('sites')
  .select('id')
  .eq('code', 'DEFAULT')
  .single();

const defaultSiteId = defaultSite?.id;
if (!defaultSiteId) {
  throw new Error('Default site not found. Please run database migrations first.');
}

// AFTER:
// Try to find DEFAULT site first, fallback to first available site
let { data: defaultSite } = await supabase
  .from('sites')
  .select('id')
  .eq('code', 'DEFAULT')
  .maybeSingle();

// If no DEFAULT site, use the first available site
if (!defaultSite) {
  const { data: firstSite } = await supabase
    .from('sites')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  defaultSite = firstSite;
}

const defaultSiteId = defaultSite?.id;
if (!defaultSiteId) {
  throw new Error('No sites found. Please create at least one site first.');
}
```

### Step 2: Update Networks.tsx (Same Pattern)

**File:** `src/pages/Networks.tsx`

Apply the same fix to the domain creation logic (around line 98-106):

```typescript
// BEFORE:
const { data: defaultSite } = await supabase
  .from('sites')
  .select('id')
  .eq('code', 'DEFAULT')
  .single();

if (!defaultSite?.id) {
  throw new Error('Default site not found');
}

// AFTER:
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

if (!defaultSite?.id) {
  throw new Error('No sites found. Please create at least one site first.');
}
```

---

## Summary

| File | Change |
|------|--------|
| `src/utils/seedData.ts` | Update site lookup to fallback to first site |
| `src/pages/Networks.tsx` | Same fallback pattern for domain creation |

After this fix, the seed data generator will:
1. First try to find a site with code `DEFAULT`
2. If not found, use the first available site (ordered by creation date)
3. Only error if no sites exist at all
