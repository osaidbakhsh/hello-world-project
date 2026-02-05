
# Plan: Auto-Select First Domain When Switching Sites

## Problem Analysis

When switching sites in the global site selector, pages with domain dropdowns (Datacenter, Servers, Settings, etc.) don't automatically update the selected domain. The domain selector shows domains from the new site, but the `selectedDomainId` state retains the old value (from the previous site), causing:

1. Empty/mismatched data display
2. Forms potentially creating entities with wrong domain associations
3. Confusing user experience

### Affected Pages/Components

| File | Domain Selector State | Issue |
|------|----------------------|-------|
| `src/pages/Datacenter.tsx` | `selectedDomainId` | Not reset on site switch |
| `src/pages/Servers.tsx` | `selectedDomainId` | Not reset on site switch |
| `src/pages/Settings.tsx` | `selectedDomainId` | Not reset on site switch |
| `src/components/datacenter/ClusterForm.tsx` | `selectedDomainId` | Uses domains from props, not updated on site switch |
| `src/components/datacenter/NodeTable.tsx` | Cluster selector | Should auto-select first cluster |
| `src/components/datacenter/VMTable.tsx` | Cluster selector | Should auto-select first cluster |

---

## Solution

Add a `useEffect` hook in each affected component that monitors the `domains` list (already filtered by site via `useDomains()`) and automatically selects the first available domain when:
1. The domains list changes (site switch)
2. The current `selectedDomainId` is not in the new domains list

---

## Implementation Steps

### Step 1: Fix Datacenter.tsx

Add effect to reset domain selection when site changes:

```typescript
// Current:
React.useEffect(() => {
  if (domains?.length && !selectedDomainId) {
    setSelectedDomainId(domains[0].id);
  }
}, [domains, selectedDomainId]);

// Fixed - also reset when current selection is invalid:
React.useEffect(() => {
  if (domains?.length) {
    const currentDomainValid = domains.some(d => d.id === selectedDomainId);
    if (!selectedDomainId || !currentDomainValid) {
      setSelectedDomainId(domains[0].id);
    }
  } else {
    setSelectedDomainId('');
  }
}, [domains]);
```

### Step 2: Fix Servers.tsx

Same pattern - auto-select first domain and reset network filter:

```typescript
// Add effect after selectedDomainId state declaration
useEffect(() => {
  if (domains?.length) {
    const currentDomainValid = domains.some(d => d.id === selectedDomainId);
    if (selectedDomainId === 'all') {
      // Keep "all" selection valid
    } else if (!currentDomainValid) {
      setSelectedDomainId('all');
      setSelectedNetworkId('all');
    }
  }
}, [domains]);
```

### Step 3: Fix Settings.tsx

Auto-select first domain for connection tests:

```typescript
useEffect(() => {
  if (domains?.length) {
    const currentDomainValid = domains.some(d => d.id === selectedDomainId);
    if (!selectedDomainId || !currentDomainValid) {
      setSelectedDomainId(domains[0].id);
    }
  } else {
    setSelectedDomainId('');
  }
}, [domains]);
```

### Step 4: Fix ClusterForm.tsx

The ClusterForm receives `domainId` as a prop but also has its own `selectedDomainId` state. Need to:
1. Sync with the passed `domainId` prop when it changes
2. Auto-select first domain if no valid selection

```typescript
// Update existing logic:
const [selectedDomainId, setSelectedDomainId] = useState(
  editingCluster?.domain_id || domainId || ''
);

// Add effect to handle prop changes:
useEffect(() => {
  if (!editingCluster) {
    // For new clusters, sync with parent domainId
    if (domainId && domains?.some(d => d.id === domainId)) {
      setSelectedDomainId(domainId);
    } else if (domains?.length && !domains.some(d => d.id === selectedDomainId)) {
      // Current selection invalid, select first
      setSelectedDomainId(domains[0].id);
    }
  }
}, [domainId, domains, editingCluster]);
```

### Step 5: Fix NodeTable.tsx and VMTable.tsx

These components need to auto-select the first cluster when clusters list changes:

```typescript
// In NodeTable.tsx (around cluster selector)
useEffect(() => {
  if (clusters?.length && formData.cluster_id) {
    const clusterValid = clusters.some(c => c.id === formData.cluster_id);
    if (!clusterValid) {
      setFormData(prev => ({ ...prev, cluster_id: clusters[0].id }));
    }
  }
}, [clusters]);

// Also auto-fill when opening new form:
const openForm = () => {
  setFormData({
    ...defaultFormData,
    cluster_id: clusters?.[0]?.id || '',
  });
  setShowForm(true);
};
```

### Step 6: Fix DatacenterForm.tsx

This form receives `domainId` as a required prop, so it should work correctly. However, we should verify the parent passes the correct domain.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Datacenter.tsx` | Update useEffect to reset domain on site switch |
| `src/pages/Servers.tsx` | Add useEffect to reset domain/network filters |
| `src/pages/Settings.tsx` | Add useEffect to auto-select first domain |
| `src/components/datacenter/ClusterForm.tsx` | Sync selectedDomainId with prop and domains list |
| `src/components/datacenter/NodeTable.tsx` | Auto-select first cluster in form |
| `src/components/datacenter/VMTable.tsx` | Auto-select first cluster in form |

---

## Key Pattern

Each component should implement this pattern:

```typescript
import { useDomains } from '@/hooks/useSupabaseData';

// Inside component:
const { data: domains } = useDomains();
const [selectedDomainId, setSelectedDomainId] = useState<string>('');

// Auto-select first domain when domains change (site switch)
useEffect(() => {
  if (domains?.length) {
    const isCurrentValid = domains.some(d => d.id === selectedDomainId);
    if (!selectedDomainId || !isCurrentValid) {
      setSelectedDomainId(domains[0].id);
    }
  } else {
    setSelectedDomainId('');
  }
}, [domains]); // Only depend on domains, not selectedDomainId
```

---

## Verification Checklist

After implementation:

| Test | Expected Result |
|------|-----------------|
| Switch site in header while on Datacenter page | Domain dropdown updates to first domain of new site |
| Switch site while on Servers page | Domain filter resets, shows servers from new site |
| Open Cluster form after site switch | Domain is pre-selected to current site's domain |
| Open Node form after site switch | Cluster is pre-selected to first available cluster |
| Switch site on Settings page | Domain for connection tests updates |
