
# IT Infrastructure Manager - Production-Grade Implementation Plan

## Executive Summary

This plan addresses critical security corrections, completes the domain-scoped architecture, and implements comprehensive scanning/inventory, file shares, datacenter management, and agent diagnostics features.

---

## PART 1: MANDATORY CORRECTIONS

### A) RLS / Authorization - Critical Fixes

**Current Problem Identified:**
Analysis of RLS policies shows 40+ policies using `is_admin()` for domain-scoped tables, which grants cross-domain access to global admins. This violates domain isolation.

**Tables Requiring RLS Policy Updates:**

| Table | Current Issue | Required Fix |
|-------|---------------|--------------|
| `cluster_nodes` | Uses `is_admin()` for SELECT | Replace with `is_super_admin() OR can_access_domain(domain_id)` |
| `clusters` | Uses `is_admin()` for SELECT | Replace with `is_super_admin() OR can_access_domain(domain_id)` |
| `datacenters` | Uses `is_admin()` for SELECT | Replace with `is_super_admin() OR can_access_domain(domain_id)` |
| `file_shares` | Uses `is_admin()` for SELECT/ALL | Replace with domain-scoped checks |
| `fileshare_scans` | Uses `is_admin()` for SELECT/ALL | Replace with domain-scoped checks |
| `scan_agents` | Uses `is_admin()` for SELECT/ALL | Replace with domain-scoped checks |
| `connection_test_runs` | Uses `is_admin()` | Replace with domain-scoped checks |
| `system_health_checks` | Uses `is_admin() OR is_super_admin()` | Restrict to `is_super_admin()` ONLY |
| `ldap_configs` | Uses `is_domain_admin()` correctly | Keep as-is |
| `ntp_configs` | Uses `is_domain_admin()` correctly | Keep as-is |
| `mail_configs` | Uses `is_domain_admin()` correctly | Keep as-is |

**New Correct RLS Pattern (Apply to ALL domain-scoped tables):**
```text
SELECT policy:
  USING (is_super_admin() OR can_access_domain(domain_id))

INSERT/UPDATE/DELETE policy:
  USING (is_super_admin() OR is_domain_admin(domain_id))
  WITH CHECK (is_super_admin() OR is_domain_admin(domain_id))
```

**SQL Migration Required:**
```sql
-- Drop and recreate policies for all domain-scoped tables
-- Example for clusters:
DROP POLICY IF EXISTS "Domain members can view clusters" ON clusters;
DROP POLICY IF EXISTS "Admins full access to clusters" ON clusters;

CREATE POLICY "clusters_select" ON clusters FOR SELECT
  USING (is_super_admin() OR can_access_domain(domain_id));

CREATE POLICY "clusters_insert" ON clusters FOR INSERT
  WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "clusters_update" ON clusters FOR UPDATE
  USING (is_super_admin() OR is_domain_admin(domain_id))
  WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));

CREATE POLICY "clusters_delete" ON clusters FOR DELETE
  USING (is_super_admin() OR is_domain_admin(domain_id));

-- Repeat for: datacenters, cluster_nodes, vms, file_shares, fileshare_scans, 
-- scan_agents, folder_stats, scan_snapshots, infra_snapshots
```

**System Health Checks - Super Admin Only:**
```sql
DROP POLICY IF EXISTS "Admins can manage health checks" ON system_health_checks;

CREATE POLICY "system_health_checks_all" ON system_health_checks FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
```

---

### B) Edge Functions Security Enforcement

**test-connection Edge Function - Required Changes:**

Current code reads config without domain access validation. Required fixes:

1. After fetching config, verify caller has domain access:
```typescript
// After getting the config
const { data: hasAccess } = await supabaseAdmin
  .rpc('can_access_domain', { _domain_id: config.domain_id });

if (!hasAccess) {
  return new Response(
    JSON.stringify({ error: 'Access denied to this domain' }),
    { status: 403, headers: corsHeaders }
  );
}
```

2. For writing test results, verify domain_admin:
```typescript
const { data: isDomainAdmin } = await supabaseAdmin
  .rpc('is_domain_admin', { _domain_id: domain_id });

if (!isDomainAdmin && !isSuperAdmin) {
  return new Response(
    JSON.stringify({ error: 'Domain admin access required to run tests' }),
    { status: 403, headers: corsHeaders }
  );
}
```

**storage-health-check Edge Function - Restrict to Super Admin:**

Current code checks for `super_admin` OR `admin`. Change to super_admin only:
```typescript
// Line 44-50: Replace
const { data: roleData } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'super_admin')  // ONLY super_admin
  .limit(1)
  .single();
```

---

### C) Supabase Client Consolidation

**Current State:**
- `src/lib/supabase.ts` creates a duplicate client AND exports types
- `src/types/supabase-models.ts` already exists with proper type definitions
- 7 files still import from `@/lib/supabase`

**Files Requiring Import Updates:**

| File | Current Import | Required Change |
|------|----------------|-----------------|
| `src/pages/Licenses.tsx:5` | `import type { License } from '@/lib/supabase'` | `import type { License } from '@/types/supabase-models'` |
| `src/pages/Servers.tsx:5` | `import type { Server } from '@/lib/supabase'` | `import type { Server } from '@/types/supabase-models'` |
| `src/pages/Employees.tsx:5` | `import type { Profile, Task, Vacation, YearlyGoal } from '@/lib/supabase'` | `import type { ... } from '@/types/supabase-models'` |
| `src/pages/EmployeePermissions.tsx:56` | `import { Profile } from '@/lib/supabase'` | `import type { Profile } from '@/types/supabase-models'` |
| `src/hooks/useSupabaseData.ts:3` | `import type { ... } from '@/lib/supabase'` | `import type { ... } from '@/types/supabase-models'` |
| `src/contexts/AuthContext.tsx:3` | `import type { Profile } from '@/lib/supabase'` | `import type { Profile } from '@/types/supabase-models'` |
| `src/components/domain-summary/ExpiryAlertsCard.tsx:7` | `import type { License } from '@/lib/supabase'` | `import type { License } from '@/types/supabase-models'` |

**After updates:** Delete or empty `src/lib/supabase.ts` (remove client export completely).

---

### D) Validation Consistency (z.coerce.number())

**Current validation file:** `src/lib/validations.ts` exists with good patterns

**Required Enhancements:**

```typescript
// Add CIDR validation
const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
export const cidrSchema = z.string().regex(cidrPattern, 'Invalid CIDR format (e.g., 192.168.1.0/24)');

// Add MAC address validation
const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
export const macAddressSchema = z.string().regex(macPattern, 'Invalid MAC address').optional().nullable();

// Port with coerce for HTML inputs
export const portCoerceSchema = z.coerce.number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535');

// Numeric fields with coerce
export const positiveIntCoerce = z.coerce.number().int().min(0);
```

---

## PART 2: SCANNING + INVENTORY + AGENT + FILE SHARES + DATACENTER

### G) Networks + Scan Model

**Current Table State:**
- `networks`: EXISTS with `subnet`, `gateway`, `dns_servers`, `description`
- `scan_jobs`: EXISTS with `ip_range`, `status`, `summary`
- `scan_results`: EXISTS with `ip_address`, `hostname`, `os_type`, `device_type`, `open_ports`

**Schema Enhancements Required:**

```sql
-- networks: Add missing columns
ALTER TABLE networks ADD COLUMN IF NOT EXISTS cidr text;
ALTER TABLE networks ADD COLUMN IF NOT EXISTS vlan_id integer;

-- Add constraint for unique network name per domain
ALTER TABLE networks ADD CONSTRAINT networks_domain_name_unique 
  UNIQUE (domain_id, name);

-- scan_jobs: Rename to scan_runs for clarity (optional) or add missing columns
ALTER TABLE scan_jobs ADD COLUMN IF NOT EXISTS started_by uuid REFERENCES profiles(id);
ALTER TABLE scan_jobs ADD COLUMN IF NOT EXISTS progress jsonb DEFAULT '{"scanned": 0, "total": 0}'::jsonb;
ALTER TABLE scan_jobs ADD COLUMN IF NOT EXISTS error_details jsonb;

-- scan_results: Add domain_id for direct access control
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES domains(id);
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS mac_address_validated text;
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS rtt_ms integer;
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS is_alive boolean DEFAULT false;

-- Add unique constraint
ALTER TABLE scan_results ADD CONSTRAINT scan_results_job_ip_unique 
  UNIQUE (scan_job_id, ip_address);

-- RLS for scan_jobs
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_jobs_select" ON scan_jobs FOR SELECT
  USING (is_super_admin() OR can_access_domain(domain_id));
CREATE POLICY "scan_jobs_insert" ON scan_jobs FOR INSERT
  WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));
CREATE POLICY "scan_jobs_update" ON scan_jobs FOR UPDATE
  USING (is_super_admin() OR is_domain_admin(domain_id));
CREATE POLICY "scan_jobs_delete" ON scan_jobs FOR DELETE
  USING (is_super_admin() OR is_domain_admin(domain_id));
```

**UI Changes (NetworkScan.tsx):**
1. Filter networks dropdown by selected domain
2. Auto-fill IP range from network.subnet when network selected
3. Add pagination controls to results table
4. Remove simulated scan; show clear "Agent required" message

---

### H) Servers Inventory Enhancement

**Current Table State:**
- `servers`: EXISTS with `ip_address`, `operating_system`, `environment`, `status`, `notes`
- MISSING: `domain_id`, `source` columns for proper domain scoping and import tracking

**Schema Enhancements:**

```sql
-- servers: Add domain_id for direct domain scoping
ALTER TABLE servers ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES domains(id);
ALTER TABLE servers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' 
  CHECK (source IN ('manual', 'scan', 'import'));
ALTER TABLE servers ADD COLUMN IF NOT EXISTS hostname text;

-- Add unique constraint for domain + IP
ALTER TABLE servers ADD CONSTRAINT servers_domain_ip_unique 
  UNIQUE (domain_id, ip_address);

-- Update existing servers to have domain_id from network
UPDATE servers s SET domain_id = n.domain_id 
FROM networks n WHERE s.network_id = n.id AND s.domain_id IS NULL;

-- RLS update for servers (add domain_id based policies)
CREATE POLICY "servers_select_domain" ON servers FOR SELECT
  USING (is_super_admin() OR can_access_domain(domain_id));
```

---

### I) Form Validation - Apply Consistently

**Files Requiring Validation Integration:**

| Component | Fields to Validate |
|-----------|-------------------|
| `ClusterForm.tsx` | IP fields (mgmt_ip) |
| `NodeTable.tsx` | IP fields, numeric fields |
| `VMTable.tsx` | IP fields, vcpu/memory with coerce |
| `FileShareForm.tsx` | Path format, depth as number |
| `NetworkScan.tsx` | IP range/CIDR validation |
| `Settings.tsx` (LDAP/NTP/Mail) | Host, port, DN, email |

**Implementation Pattern:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serverFormSchema } from '@/lib/validations';

const form = useForm({
  resolver: zodResolver(serverFormSchema),
  defaultValues: {...}
});

// Show inline errors
{form.formState.errors.ip_address && (
  <p className="text-sm text-destructive mt-1">
    {form.formState.errors.ip_address.message}
  </p>
)}
```

---

### J) Scan Agent Reliability + Diagnostics

**Current Table State:**
- `scan_agents`: EXISTS with `domain_id`, `name`, `auth_token_hash`, `status`, `last_seen_at`
- MISSING: `agent_events` table for diagnostics

**New Table:**

```sql
CREATE TABLE IF NOT EXISTS agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES scan_agents(id) ON DELETE CASCADE NOT NULL,
  domain_id uuid REFERENCES domains(id),
  event_type text NOT NULL CHECK (event_type IN ('register', 'heartbeat', 'scan_start', 'scan_complete', 'error')),
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_events_select" ON agent_events FOR SELECT
  USING (is_super_admin() OR can_access_domain(domain_id));
CREATE POLICY "agent_events_insert" ON agent_events FOR INSERT
  WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));
```

**New Edge Functions:**

| Function | Purpose |
|----------|---------|
| `agent-register` | Register new agent, validate token, log event |
| `agent-heartbeat` | Update last_seen_at, log heartbeat event |
| `agent-poll-scans` | Return pending scan_jobs for agent's domain |
| `agent-submit-results` | Submit scan results, update progress, log event |

**UI Enhancements (ScanAgents.tsx):**
1. Add "Last Error" column derived from latest error event
2. Add expandable "Recent Events" panel showing last 50 events
3. Surface RLS/permission errors in toast messages

---

### K) File Shares - Verify Flow

**Current Table State:**
- `file_shares`: EXISTS with `domain_id`, `share_type`, `path`, `scan_mode`, `agent_id`
- MISSING: `verify_status`, `last_verified_at`, `server_id`

**Schema Enhancements:**

```sql
ALTER TABLE file_shares ADD COLUMN IF NOT EXISTS verify_status text 
  DEFAULT 'not_tested' CHECK (verify_status IN ('not_tested', 'ok', 'fail'));
ALTER TABLE file_shares ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;
ALTER TABLE file_shares ADD COLUMN IF NOT EXISTS server_id uuid REFERENCES servers(id);
```

**Verify Connection Flow:**

1. User clicks "Verify" button on file share
2. Call `test-connection` edge function with `module='fileshare'`
3. Function validates path format, writes to `connection_test_runs`
4. Update `file_shares.verify_status` and `last_verified_at`
5. Show result toast with clear message

**UI Copy Clarification:**
- Add helper text: "Verification validates path format. Full access testing requires a scan agent in the same network."

---

### L) Data Center / Clusters / Hosts / VMs

**Current Table State:**
- `datacenters`: EXISTS with `domain_id`, `name`, `location`, `notes`
- `clusters`: EXISTS with `datacenter_id`, `cluster_type`, `rf_level`, `notes`
- `cluster_nodes`: EXISTS with `cluster_id`, `mgmt_ip`, `serial_number`
- `vms`: EXISTS with `cluster_id`, `domain_id`, `vcpu`, `ram_gb`, `server_ref_id`

**All tables exist and are properly structured!**

**Schema Enhancements:**

```sql
-- Ensure cluster_type values are correct
ALTER TABLE clusters DROP CONSTRAINT IF EXISTS clusters_cluster_type_check;
ALTER TABLE clusters ADD CONSTRAINT clusters_cluster_type_check 
  CHECK (cluster_type IN ('nutanix', 'hyperv_cluster', 'hyperv_standalone', 'dell_standalone', 'vmware', 'other'));

-- Ensure rf_level includes 'na'
ALTER TABLE clusters DROP CONSTRAINT IF EXISTS clusters_rf_level_check;
ALTER TABLE clusters ADD CONSTRAINT clusters_rf_level_check 
  CHECK (rf_level IN ('RF1', 'RF2', 'RF3', 'N/A'));

-- Ensure unique datacenter name per domain
ALTER TABLE datacenters ADD CONSTRAINT datacenters_domain_name_unique 
  UNIQUE (domain_id, name);

-- Ensure unique cluster name per datacenter
ALTER TABLE clusters ADD CONSTRAINT clusters_datacenter_name_unique 
  UNIQUE (datacenter_id, name);
```

**UI/UX Fixes:**

1. **Translation Fix:** Already fixed - `ClusterForm.tsx:179` uses inline `language === 'ar' ? 'ملاحظات' : 'Notes'`
2. **RF Levels:** Already updated in `ClusterForm.tsx` with RF1/RF2/RF3/N/A options
3. **Create Datacenter:** `DatacenterForm.tsx` exists and is wired to button
4. **Delete Functionality:** Verify delete buttons are connected in `DatacenterOverview.tsx`, `NodeTable.tsx`, `VMTable.tsx`

---

### M) Admin Verification Checklist Page

**New Page: `/verification-checklist`**

**Features:**
- Super Admin only access
- Automated tests for:
  - RBAC verification (test queries as different roles)
  - Domain scoping verification
  - Test button functionality (last test results from `connection_test_runs`)
  - CRUD functionality (create/read/update/delete test records)
  - Validation blocking (test invalid IP submission)
- Pass/fail status for each check
- Export verification report as PDF

**Implementation:**

```typescript
// src/pages/VerificationChecklist.tsx
const verificationTests = [
  {
    name: 'RBAC - Super Admin Access',
    test: async () => { /* query all domains */ },
  },
  {
    name: 'RBAC - Domain Admin Scoping',
    test: async () => { /* verify can only see assigned domains */ },
  },
  {
    name: 'Test Buttons - Last Results',
    test: async () => { /* check connection_test_runs has recent entries */ },
  },
  // ... more tests
];
```

---

## File Changes Summary

### New Files to Create

| Path | Purpose |
|------|---------|
| `src/pages/VerificationChecklist.tsx` | Admin verification page |
| `supabase/functions/agent-register/index.ts` | Agent registration endpoint |
| `supabase/functions/agent-heartbeat/index.ts` | Agent heartbeat endpoint |
| `supabase/functions/agent-poll-scans/index.ts` | Agent scan polling |
| `supabase/functions/agent-submit-results/index.ts` | Agent result submission |

### Files to Modify

| Path | Changes |
|------|---------|
| `src/lib/supabase.ts` | Delete file or remove client export |
| `src/pages/Licenses.tsx` | Update import to `@/types/supabase-models` |
| `src/pages/Servers.tsx` | Update import to `@/types/supabase-models` |
| `src/pages/Employees.tsx` | Update import to `@/types/supabase-models` |
| `src/pages/EmployeePermissions.tsx` | Update import to `@/types/supabase-models` |
| `src/hooks/useSupabaseData.ts` | Update import to `@/types/supabase-models` |
| `src/contexts/AuthContext.tsx` | Update import to `@/types/supabase-models` |
| `src/components/domain-summary/ExpiryAlertsCard.tsx` | Update import |
| `src/pages/NetworkScan.tsx` | Add domain filtering, pagination, validation |
| `src/pages/ScanAgents.tsx` | Add diagnostics panel, error display |
| `src/pages/FileShares.tsx` | Add verify button, status display |
| `src/lib/validations.ts` | Add CIDR, MAC, coerce schemas |
| `supabase/functions/test-connection/index.ts` | Add domain access verification |
| `supabase/functions/storage-health-check/index.ts` | Restrict to super_admin only |
| `src/App.tsx` | Add `/verification-checklist` route |

### Database Migrations Required

1. **Fix RLS policies** - Remove `is_admin()` usage from domain-scoped tables
2. **System health checks** - Restrict to `is_super_admin()` only
3. **Networks** - Add `cidr`, `vlan_id` columns
4. **Servers** - Add `domain_id`, `source`, `hostname` columns
5. **Scan jobs** - Add `started_by`, `progress`, `error_details` columns
6. **Scan results** - Add `domain_id`, `rtt_ms`, `is_alive` columns
7. **Agent events** - Create new table
8. **File shares** - Add `verify_status`, `last_verified_at`, `server_id` columns
9. **Constraints** - Add unique constraints for name/domain combinations

---

## Implementation Order

### Phase 1: Security Corrections (Critical)
1. Run RLS policy migration (fix `is_admin()` usage)
2. Update edge functions with domain access checks
3. Update storage-health-check to super_admin only

### Phase 2: Client Consolidation
1. Update all imports from `@/lib/supabase` to `@/types/supabase-models`
2. Delete or empty `src/lib/supabase.ts`
3. Verify build passes

### Phase 3: Schema Enhancements
1. Run migrations for networks, servers, scan tables
2. Create agent_events table
3. Add file_shares columns

### Phase 4: Edge Functions
1. Create agent-* edge functions
2. Update test-connection with domain checks

### Phase 5: UI Enhancements
1. NetworkScan - domain filtering, pagination
2. ScanAgents - diagnostics panel
3. FileShares - verify flow
4. Validation integration in all forms

### Phase 6: Verification
1. Create VerificationChecklist page
2. Run all tests
3. Document results

---

## Verification Report Template

```text
IT Infrastructure Manager - Verification Report
Date: [DATE]
Verified by: [USER]

SECURITY CHECKS:
[✓] RLS policies use is_super_admin() for global access
[✓] RLS policies use can_access_domain() for domain SELECT
[✓] RLS policies use is_domain_admin() for domain CRUD
[✓] Edge functions verify domain access server-side
[✓] System health restricted to super_admin only
[✓] Single Supabase client in use

FUNCTIONALITY CHECKS:
[✓] LDAP/NTP/Mail test buttons return visible results
[✓] Test results persist to connection_test_runs
[✓] Network scan filters by domain
[✓] Server import from scan works
[✓] File share verify flow works
[✓] Datacenter → Cluster → Host → VM hierarchy works
[✓] Delete operations work with confirmation

VALIDATION CHECKS:
[✓] Invalid IP blocked with error message
[✓] Invalid port blocked with error message
[✓] Required fields enforced
[✓] Numeric fields reject letters

KNOWN LIMITATIONS:
- Network scanning requires external agent (cannot scan from browser)
- LDAP/NTP/Mail connectivity tests are validation-only in hosted environment
- Realtime subscription requires active connection

NEXT RECOMMENDED IMPROVEMENTS:
1. Implement agent binary distribution
2. Add email notifications for test failures
3. Add scheduled health checks
```
