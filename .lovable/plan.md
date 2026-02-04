
# Site-Based Data Filtering - Complete Implementation Plan

## Problem Summary

When the user changes the selected site in the Site Switcher, the data across the application does not filter based on the selected site. All data hooks currently fetch all records without considering the site context.

## Current Architecture

### Database Hierarchy

```text
Site (root)
  └── Domain (site_id)
        └── Network (domain_id)
        └── License (domain_id)
        └── VMs (domain_id)
        └── Tasks (via server → network → domain)
        └── Servers (domain_id)
        └── WebApps (domain_id)
        └── File Shares (domain_id)
        └── etc.

Site
  └── Datacenter (site_id)
        └── Cluster (datacenter_id + domain_id)
              └── Node (cluster_id + domain_id)
```

### Tables with `domain_id` (need filtering through site)
- `licenses`, `servers`, `networks`, `website_applications`
- `clusters`, `cluster_nodes`, `vms`, `datacenters`
- `file_shares`, `fileshare_scans`, `scan_agents`, `scan_jobs`, `scan_results`
- `maintenance_windows`, `on_call_schedules`, `procurement_requests`
- `infra_snapshots`, `infrastructure_alerts`
- `ldap_configs`, `mail_configs`, `ntp_configs`
- `connection_test_runs`, `report_uploads`

### Tables with `site_id` directly
- `domains` (has `site_id`)
- `datacenters` (has `site_id`)
- `site_memberships`

### Tables needing filtering through `profile` membership
- `vacations` (profile_id → domain_memberships → domain.site_id)
- `tasks` (assigned_to → profile)
- `employee_reports` (profile_id)

---

## Implementation Strategy

### Phase 1: Update SiteContext Query Invalidation

When site changes, invalidate ALL site-dependent queries:

```typescript
// In SiteContext.tsx setSelectedSite callback
queryClient.invalidateQueries({ queryKey: ['domains'] });
queryClient.invalidateQueries({ queryKey: ['datacenters'] });
queryClient.invalidateQueries({ queryKey: ['clusters'] });
queryClient.invalidateQueries({ queryKey: ['cluster_nodes'] });
queryClient.invalidateQueries({ queryKey: ['vms'] });
queryClient.invalidateQueries({ queryKey: ['servers'] });
queryClient.invalidateQueries({ queryKey: ['networks'] });
queryClient.invalidateQueries({ queryKey: ['licenses'] });
queryClient.invalidateQueries({ queryKey: ['tasks'] });
queryClient.invalidateQueries({ queryKey: ['vacations'] });
queryClient.invalidateQueries({ queryKey: ['website_applications'] });
queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
queryClient.invalidateQueries({ queryKey: ['employee_reports'] });
queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
```

---

### Phase 2: Update Data Hooks to Filter by Site

Each hook must:
1. Import and use `useSite()` context
2. Include `selectedSite?.id` in query key for cache isolation
3. First fetch domains for the selected site
4. Then filter data by those domain IDs

#### 2.1 Create Helper Hook: `useSiteDomains`

Create a reusable hook that returns domain IDs for the selected site:

```typescript
// src/hooks/useSiteDomains.ts
export function useSiteDomains() {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: ['site-domains', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite) return [];
      const { data } = await supabase
        .from('domains')
        .select('id')
        .eq('site_id', selectedSite.id);
      return data?.map(d => d.id) || [];
    },
    enabled: !!selectedSite,
  });
}
```

#### 2.2 Update `useDomains`

```typescript
export function useDomains() {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: ['domains', selectedSite?.id],
    queryFn: async () => {
      let query = supabase.from('domains').select('*').order('name');
      if (selectedSite) {
        query = query.eq('site_id', selectedSite.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

#### 2.3 Update `useServers`

```typescript
export function useServers(domainId?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['servers', selectedSite?.id, domainId],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      let query = supabase.from('servers').select('*');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else {
        query = query.in('domain_id', siteDomainIds);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });
}
```

#### 2.4 Update `useLicenses`

```typescript
export function useLicenses() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['licenses', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .in('domain_id', siteDomainIds)
        .order('expiry_date');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });
}
```

#### 2.5 Update `useTasks`

Tasks are associated with servers which have domain_id, so filter by server's domain:

```typescript
export function useTasks() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['tasks', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      // Get servers in site domains first
      const { data: servers } = await supabase
        .from('servers')
        .select('id')
        .in('domain_id', siteDomainIds);
      
      const serverIds = servers?.map(s => s.id) || [];
      
      // Tasks may not have server_id, so also filter by assigned_to's domain membership
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`server_id.in.(${serverIds.join(',')}),server_id.is.null`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite,
  });
}
```

#### 2.6 Update `useVacations`

Filter by profiles that have domain membership in the site:

```typescript
export function useVacations() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['vacations', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      // Get profiles with domain membership in site
      const { data: memberships } = await supabase
        .from('domain_memberships')
        .select('profile_id')
        .in('domain_id', siteDomainIds);
      
      const profileIds = [...new Set(memberships?.map(m => m.profile_id) || [])];
      
      if (profileIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('vacations')
        .select('*')
        .in('profile_id', profileIds)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });
}
```

#### 2.7 Update `useWebsiteApplications`

```typescript
export function useWebsiteApplications(includeInactive = false) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['website_applications', selectedSite?.id, includeInactive],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      let query = supabase.from('website_applications').select('*');
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      // Include global apps (null domain_id) + site-specific apps
      if (siteDomainIds.length > 0) {
        query = query.or(`domain_id.in.(${siteDomainIds.join(',')}),domain_id.is.null`);
      }
      
      const { data, error } = await query.order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite,
  });
}
```

#### 2.8 Update `useProfiles` (Employees)

Filter by domain membership:

```typescript
export function useProfiles() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['profiles', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      // Get profiles with domain membership in site
      const { data: memberships } = await supabase
        .from('domain_memberships')
        .select('profile_id')
        .in('domain_id', siteDomainIds);
      
      const profileIds = [...new Set(memberships?.map(m => m.profile_id) || [])];
      
      if (profileIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds)
        .order('full_name');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });
}
```

#### 2.9 Update `useEmployeeReports`

```typescript
export function useEmployeeReports() {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['employee_reports', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      // Get profiles in site
      const { data: memberships } = await supabase
        .from('domain_memberships')
        .select('profile_id')
        .in('domain_id', siteDomainIds);
      
      const profileIds = [...new Set(memberships?.map(m => m.profile_id) || [])];
      
      if (profileIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('employee_reports')
        .select('*')
        .in('profile_id', profileIds)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });
}
```

#### 2.10 Update `useDashboardStats`

```typescript
export function useDashboardStats(selectedDomainId?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  // Filter stats by site domains
  // ... (update all queries to use siteDomainIds)
}
```

---

### Phase 3: Update Datacenter Hooks

#### 3.1 Update `useDatacenters`

```typescript
export const useDatacenters = () => {
  const { selectedSite } = useSite();
  
  return useQuery({
    queryKey: ['datacenters', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite) return [];
      
      const { data, error } = await supabase
        .from('datacenters')
        .select('*, domains(name)')
        .eq('site_id', selectedSite.id)
        .order('name');
        
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSite,
  });
};
```

#### 3.2 Update `useClusters`, `useClusterNodes`, `useVMs`

Similar pattern - filter by site's domains.

---

### Phase 4: Update Procurement Hooks

```typescript
export function useProcurementRequests(domainId?: string, status?: string) {
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  
  return useQuery({
    queryKey: ['procurement_requests', selectedSite?.id, domainId, status],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      let query = supabase
        .from('procurement_requests')
        .select('*');
      
      if (domainId) {
        query = query.eq('domain_id', domainId);
      } else {
        query = query.in('domain_id', siteDomainIds);
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });
}
```

---

### Phase 5: Update Vault Hooks

Private vault data is personal (per-user) but infra vault should filter by site.

---

### Phase 6: Update Audit Logs

```typescript
export function useAuditLogs(limit = 100) {
  const { selectedSite } = useSite();
  
  // Note: Audit logs may need domain_id or site_id column for proper filtering
  // For now, filter by user's domain membership
}
```

---

## File Changes Summary

### New Files (1)
| File | Purpose |
|------|---------|
| `src/hooks/useSiteDomains.ts` | Reusable hook to get domain IDs for selected site |

### Modified Files (8)
| File | Changes |
|------|---------|
| `src/contexts/SiteContext.tsx` | Invalidate all site-dependent queries on site change |
| `src/hooks/useSupabaseData.ts` | Update all data hooks with site filtering |
| `src/hooks/useDatacenter.ts` | Filter by site_id for datacenters |
| `src/hooks/useProcurement.ts` | Filter procurement requests by site domains |
| `src/hooks/useVaultData.ts` | Filter infra vault by site |
| `src/hooks/useFileShares.ts` | Filter file shares by site domains |
| `src/hooks/useVisibleEmployees.ts` | Filter by site domain memberships |
| `src/hooks/useVacationBalance.ts` | Filter by user's site domains |

---

## Technical Considerations

### Performance
- Use `useSiteDomains` as a shared query to avoid duplicate domain fetches
- Domain IDs are cached and reused across hooks
- Query invalidation ensures fresh data on site change

### Edge Cases
- When `selectedSite` is null, most hooks return empty arrays
- Global resources (like web apps with `domain_id = null`) are still shown
- Super admins may need to see all data - add override option

### Migration Path
1. Create `useSiteDomains` helper hook
2. Update hooks one by one
3. Test each module after update
4. Verify data changes when site switches

---

## Testing Checklist

After implementation:
- [ ] Changing site updates domains list
- [ ] Servers filter by selected site
- [ ] Licenses filter by selected site  
- [ ] Tasks filter by selected site
- [ ] Vacations filter by selected site
- [ ] Employees filter by selected site
- [ ] Web apps filter by selected site
- [ ] Datacenter data filters by selected site
- [ ] Dashboard stats update when site changes
- [ ] Procurement requests filter by selected site
- [ ] Audit logs filter by selected site
- [ ] No data shown when no site is selected (or show empty state)
