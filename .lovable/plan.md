
# Site Switcher & Hierarchy Refactor - Complete Implementation Plan

## Executive Summary

This plan refactors the infrastructure hierarchy to a new 6-level model (`Site → Datacenter → Cluster → Node → Domain → VM`), adds a global Site Switcher dropdown in the header, and implements full Site CRUD capabilities. Domains become logical containers under physical Nodes, and VMs belong to exactly one Domain.

---

## New Confirmed Hierarchy Model

```text
Site (root)
  └── Datacenter (physical facility)
        └── Cluster (compute group)
              └── Node (physical host)
                    └── Domain (logical container)
                          └── VM/Server (workload)
```

### Key Model Changes

| Entity | Current Parent | New Parent |
|--------|---------------|------------|
| Datacenter | Domain | Site |
| Domain | Site | Node |
| Network | Cluster | Removed from hierarchy (optional metadata) |
| VM/Server | Network | Domain |

### Relationship Summary
- **Site** contains **Datacenters** (1:N)
- **Datacenter** contains **Clusters** (1:N)  
- **Cluster** contains **Nodes** (1:N)
- **Node** hosts **Domains** (1:N) - a node can serve multiple domains
- **Domain** contains **VMs/Servers** (1:N) - each VM belongs to exactly one domain

---

## Implementation Phases

### Phase 1: Database Schema Migration

#### 1.1 Add `site_id` to Datacenters

Currently datacenters reference `domain_id`. We need to add `site_id` and migrate data.

```sql
-- Add site_id column to datacenters
ALTER TABLE datacenters ADD COLUMN site_id UUID REFERENCES sites(id);

-- Backfill site_id from existing domain relationship
UPDATE datacenters dc
SET site_id = d.site_id
FROM domains d
WHERE dc.domain_id = d.id;

-- Make site_id NOT NULL after backfill
ALTER TABLE datacenters ALTER COLUMN site_id SET NOT NULL;
```

#### 1.2 Add `node_id` to Domains

Domains currently reference `site_id`. We need to change this to `node_id`.

```sql
-- Add node_id column to domains
ALTER TABLE domains ADD COLUMN node_id UUID REFERENCES cluster_nodes(id);

-- Note: Existing domains will have NULL node_id initially
-- Admin will need to reassign domains to nodes
```

#### 1.3 Add `domain_id` to Servers (VMs)

Currently servers reference `network_id`. We need to add direct `domain_id` reference.

```sql
-- Add domain_id column to servers
ALTER TABLE servers ADD COLUMN domain_id UUID REFERENCES domains(id);

-- Backfill domain_id from network relationship
UPDATE servers s
SET domain_id = n.domain_id
FROM networks n
WHERE s.network_id = n.id;

-- Make domain_id NOT NULL after backfill
ALTER TABLE servers ALTER COLUMN domain_id SET NOT NULL;
```

#### 1.4 Update RLS Policies

Update security functions to reflect new hierarchy path:
- `check_resource_access()` - trace Site → Datacenter → Cluster → Node → Domain → VM
- `can_access_domain()` - check via node membership
- `can_access_server()` - check via domain → node path

---

### Phase 2: Site Context Provider

#### 2.1 Create SiteContext

| File | Action |
|------|--------|
| `src/contexts/SiteContext.tsx` | Create new |

```typescript
interface SiteContextType {
  // Currently selected site
  selectedSite: Site | null;
  setSelectedSite: (site: Site | null) => void;
  
  // All accessible sites
  sites: Site[];
  isLoading: boolean;
  
  // Helpers
  clearSelection: () => void;
  refetchSites: () => Promise<void>;
}
```

Features:
- Fetch sites from `sites` table on mount
- Persist selection to `localStorage` (key: `selected-site-id`)
- Auto-clear child selections when site changes
- Cascading context clearing when parent changes

#### 2.2 Update App.tsx Provider Hierarchy

```text
<AuthProvider>
  <SiteProvider>        ← NEW (global site selection)
    <HierarchyProvider> ← UPDATED (filters by selected site)
      <Layout>
        <App />
      </Layout>
    </HierarchyProvider>
  </SiteProvider>
</AuthProvider>
```

---

### Phase 3: Site Switcher UI

#### 3.1 Create SiteSwitcher Component

| File | Action |
|------|--------|
| `src/components/layout/SiteSwitcher.tsx` | Create new |

UI Specifications:
- **Position**: Header, between logo and search bar
- **Component**: Shadcn `Select` with custom trigger
- **Display**: Site name + code badge (e.g., "Riyadh HQ [RYD]")
- **Footer action**: "Manage Sites" button (admin only)
- **Keyboard shortcut**: `Ctrl+Shift+S` to focus

Visual Layout:
```text
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  [🏢 Riyadh HQ ▼]  [🔍 Search...]       [🔔] [👤 User]│
└──────────────────────────────────────────────────────────────┘
          ↑ Site Switcher Dropdown
```

#### 3.2 Update Layout Component

| File | Action |
|------|--------|
| `src/components/layout/Layout.tsx` | Update |

Add a persistent header bar above the main content area containing:
- Logo
- SiteSwitcher component
- Global search (existing CommandPalette trigger)
- Notifications bell
- User menu

---

### Phase 4: Site Management CRUD

#### 4.1 Create Site Hooks

| File | Action |
|------|--------|
| `src/hooks/useSites.ts` | Create new |

Hooks:
- `useSites()` - Query all accessible sites
- `useCreateSite()` - Mutation to create site
- `useUpdateSite()` - Mutation to update site
- `useDeleteSite()` - Mutation with cascade validation

#### 4.2 Create Site Management UI

| File | Action |
|------|--------|
| `src/components/sites/SiteManagementDialog.tsx` | Create new |
| `src/components/sites/SiteForm.tsx` | Create new |

Site Form Fields:
| Field | Type | Required |
|-------|------|----------|
| `name` | text | Yes |
| `code` | text (unique) | Yes |
| `city` | text | No |
| `region` | text | No |
| `timezone` | select | Yes |
| `notes` | textarea | No |

---

### Phase 5: Hierarchy Context Refactor

#### 5.1 Update HierarchyLevel Type

| File | Action |
|------|--------|
| `src/contexts/HierarchyContext.tsx` | Update |

```typescript
// New level definitions (6 levels instead of 7)
type HierarchyLevel = 
  | 'site'
  | 'datacenter'  // Child of Site
  | 'cluster'     // Child of Datacenter
  | 'node'        // Child of Cluster
  | 'domain'      // Child of Node (NEW POSITION)
  | 'vm';         // Child of Domain
```

Remove `network` from the tree hierarchy (can remain as optional metadata on VMs).

#### 5.2 Update fetchChildren Logic

| Level | Current Query | New Query |
|-------|--------------|-----------|
| `site` | `sites.select()` | `sites.select().eq('id', selectedSiteId)` |
| `datacenter` | `datacenters.eq('domain_id', parentId)` | `datacenters.eq('site_id', parentId)` |
| `cluster` | `clusters.eq('datacenter_id', parentId)` | Same (unchanged) |
| `node` | `cluster_nodes.eq('cluster_id', parentId)` | Same (unchanged) |
| `domain` | `domains.eq('site_id', parentId)` | `domains.eq('node_id', parentId)` |
| `vm` | `servers.eq('network_id', parentId)` | `servers.eq('domain_id', parentId)` |

#### 5.3 Update fetchPathToNode Logic

Trace the new path: VM → Domain → Node → Cluster → Datacenter → Site

---

### Phase 6: TreeView UI Update

#### 6.1 Update HierarchyTree Component

| File | Action |
|------|--------|
| `src/components/hierarchy/HierarchyTree.tsx` | Update |

New tree structure visualization:
```text
🏢 Riyadh HQ (Site)
└── 📍 DC-Riyadh-01 (Datacenter)
      └── 🖥️ Cluster-A (Cluster)
            ├── ⚙️ Node-01 🟢 (Node)
            │     ├── 🌐 Banking (Domain)
            │     │     ├── 💻 VM-Core-DB 🟢
            │     │     └── 💻 VM-App-01 🟢
            │     └── 🌐 HR (Domain)
            │           └── 💻 VM-HR-Portal 🟡
            └── ⚙️ Node-02 🟢 (Node)
                  └── 🌐 IT-Ops (Domain)
                        └── 💻 VM-Monitoring 🟢
```

Updated icon mapping:
| Level | Icon | Color |
|-------|------|-------|
| site | `Building2` | rose |
| datacenter | `MapPin` | amber |
| cluster | `Server` | emerald |
| node | `Cpu` | cyan |
| domain | `Globe` | blue |
| vm | `Monitor` | primary |

---

### Phase 7: Data Filtering by Site

#### 7.1 Update Data Hooks

All data-fetching hooks must filter by the selected Site:

| File | Changes |
|------|---------|
| `src/hooks/useDatacenter.ts` | Filter by site_id via SiteContext |
| `src/hooks/useRealtimeHealth.ts` | Scope health to selected site |
| `src/hooks/useSupabaseData.ts` | Add site filtering |

Query pattern:
```typescript
const { selectedSite } = useSiteContext();

const { data: datacenters } = useQuery({
  queryKey: ['datacenters', selectedSite?.id],
  queryFn: async () => {
    if (!selectedSite) return [];
    const { data } = await supabase
      .from('datacenters')
      .select('*')
      .eq('site_id', selectedSite.id);
    return data || [];
  },
  enabled: !!selectedSite,
});
```

#### 7.2 No Site Selected State

When no site is selected, show an empty state:
```text
┌──────────────────────────────────────┐
│          🏢 Select a Site            │
│                                      │
│   Please select a site from the      │
│   dropdown above to view data.       │
│                                      │
│   [Open Site Switcher]               │
└──────────────────────────────────────┘
```

---

### Phase 8: Page Updates

| Page | Changes |
|------|---------|
| `Dashboard.tsx` | Filter stats by selected site |
| `Datacenter.tsx` | Remove domain selector, use site context |
| `NOCDashboard.tsx` | Scope all health metrics to selected site |
| `Servers.tsx` | Filter VMs by domains in selected site |
| `ResourceDetail.tsx` | Update breadcrumb path resolution |

---

### Phase 9: Breadcrumb Update

#### 9.1 Update HierarchyBreadcrumb

| File | Action |
|------|--------|
| `src/components/hierarchy/HierarchyBreadcrumb.tsx` | Update |

New path format:
```text
Riyadh HQ > DC-01 > Cluster-A > Node-05 > Banking > VM-Core-DB
```

Each segment shows health indicator (green/yellow/red dot).

---

### Phase 10: Translations

#### 10.1 Add Translation Keys

| Key | English | Arabic |
|-----|---------|--------|
| `nav.selectSite` | Select Site | اختر الموقع |
| `nav.manageSites` | Manage Sites | إدارة المواقع |
| `nav.siteSwitcher` | Site Switcher | محول المواقع |
| `sites.create` | Create Site | إنشاء موقع |
| `sites.edit` | Edit Site | تعديل الموقع |
| `sites.delete` | Delete Site | حذف الموقع |
| `sites.code` | Site Code | رمز الموقع |
| `sites.city` | City | المدينة |
| `sites.region` | Region | المنطقة |
| `sites.timezone` | Timezone | المنطقة الزمنية |
| `sites.noSelection` | Please select a site | يرجى اختيار موقع |
| `hierarchy.node` | Node | العقدة |
| `hierarchy.domain` | Domain | النطاق |

---

## File Change Summary

### New Files (8)

| File | Purpose |
|------|---------|
| `src/contexts/SiteContext.tsx` | Global site selection state |
| `src/hooks/useSites.ts` | Site CRUD hooks |
| `src/components/layout/SiteSwitcher.tsx` | Header dropdown |
| `src/components/layout/AppHeader.tsx` | New header component |
| `src/components/sites/SiteManagementDialog.tsx` | Admin CRUD modal |
| `src/components/sites/SiteForm.tsx` | Site create/edit form |
| `src/components/common/NoSiteSelected.tsx` | Empty state component |
| `supabase/migrations/[timestamp]_refactor_hierarchy.sql` | Schema migration |

### Modified Files (12)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add SiteProvider |
| `src/contexts/HierarchyContext.tsx` | New 6-level structure |
| `src/components/hierarchy/HierarchyTree.tsx` | Updated tree rendering |
| `src/components/hierarchy/HierarchyBreadcrumb.tsx` | New path resolution |
| `src/components/layout/Layout.tsx` | Add AppHeader |
| `src/components/layout/Sidebar.tsx` | Filter tree by site |
| `src/pages/Dashboard.tsx` | Site-scoped stats |
| `src/pages/Datacenter.tsx` | Site filtering |
| `src/pages/NOCDashboard.tsx` | Site-scoped health |
| `src/pages/ResourceDetail.tsx` | Updated path resolution |
| `src/contexts/LanguageContext.tsx` | New translations |
| `src/types/datacenter.ts` | Updated type definitions |

---

## Migration Strategy

### Data Migration Steps

1. **Pre-migration backup**: Export current domains and datacenters
2. **Add new columns**: `datacenters.site_id`, `domains.node_id`, `servers.domain_id`
3. **Backfill data**: Populate new columns from existing relationships
4. **Validate data**: Ensure no orphaned records
5. **Apply NOT NULL**: Once all data is populated
6. **Update RLS**: Modify security functions for new paths
7. **Deploy frontend**: Update UI to use new hierarchy

### Admin Actions Required

After migration, admins will need to:
1. Assign existing domains to appropriate nodes
2. Verify VM-domain assignments are correct
3. Test access permissions via new hierarchy

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Backup before migration, test on staging |
| Orphaned domains (no node) | Medium | Allow NULL node_id initially, provide admin UI to reassign |
| Breaking existing queries | High | Update all hooks before removing old FKs |
| RLS policy failures | High | Comprehensive testing with different user roles |
| Performance with deep joins | Low | Add appropriate indexes on new FK columns |

---

## Testing Checklist

After implementation, verify:
- [ ] Site switcher appears in header when logged in
- [ ] Can create/edit/delete sites (admin only)
- [ ] Site selection persists across page refreshes
- [ ] Changing site clears child selections
- [ ] TreeView shows new hierarchy (Site → DC → Cluster → Node → Domain → VM)
- [ ] All pages filter data by selected site
- [ ] Breadcrumbs resolve correctly for new path
- [ ] NOC dashboard shows site-scoped health
- [ ] Empty state shows when no site selected
- [ ] RLS policies work with new hierarchy
- [ ] Mobile responsive design works
