# Site-Based Data Filtering - Implementation Complete ✅

## Summary

All data hooks now filter based on the selected site. When the user changes the selected site in the Site Switcher, all data across the application updates accordingly.

## Completed Changes

### New Files Created
| File | Purpose |
|------|---------|
| `src/hooks/useSiteDomains.ts` | `useSiteDomains()` and `useSiteProfileIds()` helper hooks |

### Files Modified
| File | Changes |
|------|---------|
| `src/contexts/SiteContext.tsx` | Invalidates 20+ query keys when site changes |
| `src/hooks/useSupabaseData.ts` | All hooks filter by site (domains, servers, tasks, vacations, licenses, profiles, etc.) |
| `src/hooks/useDatacenter.ts` | Datacenters filter by site_id; clusters/nodes/VMs by site domains |
| `src/hooks/useProcurement.ts` | Procurement requests filter by site domains |
| `src/hooks/useFileShares.ts` | File shares filter by site domains |
| `src/hooks/useVisibleEmployees.ts` | Employees filter by site domain memberships |

## Filtering Strategy

### Direct site_id filtering
- `domains` → `.eq('site_id', selectedSite.id)`
- `datacenters` → `.eq('site_id', selectedSite.id)`

### Via domain_id (using `useSiteDomains()`)
- servers, networks, licenses, clusters, nodes, VMs, file_shares, procurement_requests, website_applications

### Via profile membership (using `useSiteProfileIds()`)
- tasks, vacations, employee_reports, profiles

## Testing Checklist ✅
- [x] Domains filter by site
- [x] Datacenters filter by site
- [x] Servers filter by site
- [x] Licenses filter by site
- [x] Tasks filter by site
- [x] Vacations filter by site
- [x] Employees filter by site
- [x] Web apps filter by site (+ global apps)
- [x] Dashboard stats filter by site
- [x] Procurement filter by site
- [x] File shares filter by site
