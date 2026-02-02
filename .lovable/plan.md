
# IT Infrastructure Manager - Production-Grade Implementation Plan

## Executive Summary

This plan implements the approved changes to create a secure, domain-scoped IT Infrastructure Manager with proper RBAC, system health diagnostics, and enhanced modules. The break-glass administrator feature is explicitly **excluded** per user requirements.

---

## Part 1: Findings Summary

### 1.1 Hardcoded URLs/Keys Analysis

| File | Line | Issue | Action |
|------|------|-------|--------|
| `src/lib/supabase.ts` | 6 | Creates duplicate Supabase client | Remove client, keep types |
| `src/pages/Vacations.tsx` | 6 | Imports client from wrong location | Update import |

**No localhost/127.0.0.1/hardcoded production URLs found** - the codebase correctly uses environment variables.

### 1.2 Files Importing Duplicate Client

Files importing from `@/lib/supabase`:
- `src/pages/Vacations.tsx` - imports **client** (must fix)
- `src/pages/EmployeePermissions.tsx` - imports types only
- `src/pages/Employees.tsx` - imports types only
- `src/pages/Licenses.tsx` - imports types only
- `src/pages/Servers.tsx` - imports types only
- `src/contexts/AuthContext.tsx` - imports types only
- `src/hooks/useSupabaseData.ts` - imports types only
- `src/components/domain-summary/ExpiryAlertsCard.tsx` - imports types only

### 1.3 Current Database State

**Existing Tables:**
- `profiles`: id, user_id, email, full_name, role, department, position, phone, skills, certifications
- `user_roles`: id, user_id, role (app_role enum), created_at
- `domain_memberships`: id, profile_id, domain_id, can_edit, created_at (missing `domain_role`)
- `domains`: id, name, description, created_at (missing `code`)

**Missing Tables:**
- `ldap_configs`, `ntp_configs`, `mail_configs`
- `connection_test_runs`
- `system_health_checks`
- `report_uploads`, `report_upload_rows`

### 1.4 Existing RLS Security Issue

Current RLS policies use `is_admin()` which grants access to both super_admin AND admin roles globally, potentially allowing cross-domain access. This needs to be fixed.

---

## Part 2: Implementation Details

### Phase 1: Security & Auth Foundations

#### 1.1 Consolidate Supabase Client

**Files to Modify:**

1. **Create `src/types/supabase-models.ts`** (new file)
   - Move all type definitions from `src/lib/supabase.ts`
   - Export: `AppRole`, `Profile`, `Domain`, `Network`, `Server`, `Task`, `Vacation`, `EmployeeReport`, `License`, `YearlyGoal`, `DomainMembership`

2. **Delete `src/lib/supabase.ts`** or remove client export
   - Remove `createClient` call and `supabase` export

3. **Update imports in:**
   - `src/pages/Vacations.tsx:6` - Change `import { supabase } from '@/lib/supabase'` to `import { supabase } from '@/integrations/supabase/client'`
   - Update type imports in all affected files to use `@/types/supabase-models`

#### 1.2 Domain-Level Role Enhancement

**Database Migration SQL:**

```sql
-- Add domain_role column to domain_memberships
ALTER TABLE domain_memberships 
ADD COLUMN IF NOT EXISTS domain_role text 
DEFAULT 'employee' 
CHECK (domain_role IN ('domain_admin', 'employee'));

-- Add code column to domains for unique identification
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS code text UNIQUE;

-- Create is_domain_admin helper function
CREATE OR REPLACE FUNCTION is_domain_admin(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() 
      AND dm.domain_id = _domain_id
      AND dm.domain_role = 'domain_admin'
  )
$$;
```

**RLS Policy Pattern (for all domain-scoped tables):**

```sql
-- SELECT: super_admin OR domain member
CREATE POLICY "select_policy" ON table_name FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

-- INSERT/UPDATE/DELETE: super_admin OR domain_admin
CREATE POLICY "manage_policy" ON table_name FOR ALL
USING (is_super_admin() OR is_domain_admin(domain_id))
WITH CHECK (is_super_admin() OR is_domain_admin(domain_id));
```

---

### Phase 2: Config Tables & Test Connection

#### 2.1 New Tables Migration

```sql
-- LDAP Configurations
CREATE TABLE IF NOT EXISTS ldap_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  host text NOT NULL,
  port integer DEFAULT 389,
  use_tls boolean DEFAULT false,
  base_dn text,
  bind_dn text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- NTP Configurations
CREATE TABLE IF NOT EXISTS ntp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  servers text[] NOT NULL DEFAULT '{}',
  sync_interval_seconds integer DEFAULT 3600,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mail Configurations
CREATE TABLE IF NOT EXISTS mail_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  smtp_host text NOT NULL,
  smtp_port integer DEFAULT 587,
  use_tls boolean DEFAULT true,
  from_email text,
  from_name text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Connection Test Runs
CREATE TABLE IF NOT EXISTS connection_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) NOT NULL,
  module text NOT NULL CHECK (module IN ('ldap', 'ntp', 'mail', 'fileshare', 'agent', 'storage')),
  ldap_config_id uuid REFERENCES ldap_configs(id) ON DELETE SET NULL,
  ntp_config_id uuid REFERENCES ntp_configs(id) ON DELETE SET NULL,
  mail_config_id uuid REFERENCES mail_configs(id) ON DELETE SET NULL,
  fileshare_id uuid REFERENCES file_shares(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('success', 'fail', 'validation_only')),
  latency_ms integer,
  message text,
  error_details jsonb,
  created_at timestamptz DEFAULT now()
);
```

#### 2.2 Edge Function: test-connection

**File: `supabase/functions/test-connection/index.ts`**

```typescript
// Validates configuration and records test result
// Input: { domain_id, module, config_id }
// Output: { success, status, latency_ms, message, error_details }
```

**Validation Logic:**
- **LDAP**: Validate host format, port (1-65535), DN syntax
- **NTP**: Validate server hostnames format
- **Mail**: Validate SMTP host, port, email format

#### 2.3 UI Updates for Settings.tsx

- Wire "اختبار الاتصال" buttons (lines 552-554, 654-656, 749-751) to call edge function
- Show spinner during test
- Display toast with result (success/fail/validation_only)
- Add test history section showing last 10 results

---

### Phase 3: System Health Page

#### 3.1 New Table

```sql
CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL CHECK (check_type IN ('auth', 'db', 'storage', 'realtime')),
  status text NOT NULL CHECK (status IN ('success', 'fail')),
  latency_ms integer,
  error_message text,
  error_details jsonb,
  checked_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage health checks"
ON system_health_checks FOR ALL
USING (is_super_admin() OR is_admin());
```

#### 3.2 New Page: /system-health

**File: `src/pages/SystemHealth.tsx`**

Features:
- 4 test cards: Auth, Database, Storage, Realtime
- Each shows: Status icon, Latency, Last tested time
- "Run All Tests" and individual test buttons
- Results persist to database

**Test Implementations:**

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Auth | `supabase.auth.getSession()` + `refreshSession()` | Valid session returned |
| Database | `SELECT 1 FROM profiles LIMIT 1` | Query succeeds |
| Storage | Edge function with service role | Returns bucket list |
| Realtime | Subscribe to test channel, wait 3s | Status = 'SUBSCRIBED' |

#### 3.3 Edge Function: storage-health-check

**File: `supabase/functions/storage-health-check/index.ts`**

Purpose: Check storage access using service role (client can't list buckets)

---

### Phase 4: Employee Reports Enhancement

#### 4.1 Storage Bucket

Create bucket: `employee-reports` (private)

#### 4.2 New Tables

```sql
CREATE TABLE IF NOT EXISTS report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id),
  employee_id uuid REFERENCES profiles(id),
  uploaded_by uuid REFERENCES profiles(id),
  file_path text NOT NULL,
  original_filename text NOT NULL,
  version integer DEFAULT 1,
  imported_rows integer DEFAULT 0,
  rejected_rows integer DEFAULT 0,
  import_summary jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_upload_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_upload_id uuid REFERENCES report_uploads(id) ON DELETE CASCADE NOT NULL,
  row_number integer NOT NULL,
  status text CHECK (status IN ('accepted', 'rejected')) NOT NULL,
  errors text[],
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
```

#### 4.3 Updated Upload Flow (EmployeeReports.tsx)

1. User uploads Excel file
2. Store file in Storage: `employee-reports/{domain_id}/{employee_id}/{timestamp}-{filename}`
3. Create `report_uploads` record
4. Parse Excel using `xlsx` library
5. Validate each row against task schema
6. For valid rows: Upsert into `tasks` table
7. For invalid rows: Store in `report_upload_rows` with errors
8. Update `report_uploads` with counts and summary
9. Show import summary with accepted/rejected counts
10. Provide download links for each version
11. Export rejected rows as Excel

---

### Phase 5: Network Scan Improvements

#### 5.1 Domain Filtering (NetworkScan.tsx)

```typescript
// Filter networks by selected domain
const filteredNetworks = useMemo(() => {
  if (!selectedDomainId) return networks;
  return networks.filter(n => n.domain_id === selectedDomainId);
}, [networks, selectedDomainId]);
```

#### 5.2 Auto-populate IP Range

```typescript
// When network selected, auto-fill IP range from subnet
useEffect(() => {
  if (selectedNetworkId) {
    const network = networks.find(n => n.id === selectedNetworkId);
    if (network?.subnet) {
      setIpRange(network.subnet);
    }
  }
}, [selectedNetworkId, networks]);
```

#### 5.3 Pagination

- Add pagination state and controls
- Implement "Load More" button
- Show total count header
- Remove any artificial limits

---

### Phase 6: Data Center Module Fixes

#### 6.1 Translation Fix

Add to `src/contexts/LanguageContext.tsx`:

```typescript
// Arabic
'common.notes': 'ملاحظات',

// English
'common.notes': 'Notes',
```

#### 6.2 RF Level Options

Update `src/components/datacenter/ClusterForm.tsx`:

```typescript
const rfLevels = [
  { value: 'RF1', label: 'RF1 (1 copy)' },
  { value: 'RF2', label: 'RF2 (2 copies)' },
  { value: 'RF3', label: 'RF3 (3 copies)' },
  { value: 'N/A', label: 'N/A' },
];
```

#### 6.3 Datacenter Creation Flow

**Current Issue:** Cluster creation requires selecting a datacenter, but no way to create datacenter inline.

**Solution:**
1. Add "Create Datacenter" button in Datacenter module
2. Create `DatacenterForm.tsx` component
3. Create `useCreateDatacenter` hook in `useDatacenter.ts`
4. Wire up delete buttons for clusters, nodes, VMs (hooks exist but UI not connected)

---

### Phase 7: Form Validation

#### 7.1 Create Validation Schemas

**File: `src/lib/validations.ts`**

```typescript
import { z } from 'zod';

// IPv4 validation
const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export const ipv4Schema = z.string().regex(ipv4Pattern, 'Invalid IPv4 address');

export const portSchema = z.number()
  .int()
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535');

export const serverFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ip_address: z.string().regex(ipv4Pattern, 'Invalid IPv4 address').optional().nullable(),
  // ... other fields
});

export const ldapConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: portSchema,
  base_dn: z.string().optional(),
  // ... other fields
});
```

#### 7.2 Apply to Forms

Update these forms with Zod validation:
- Servers form
- Networks form
- LDAP/NTP/Mail config forms in Settings
- Datacenter node forms

---

### Phase 8: Confirm Self-Registration Removal

**Current State (Already Implemented):**
- `src/App.tsx:56-57`: `/register` redirects to `/login`
- No signup UI exposed

**Verification:** Confirm this remains in place.

---

## Part 3: File Changes Summary

### New Files to Create

| Path | Purpose |
|------|---------|
| `src/types/supabase-models.ts` | Type definitions moved from lib/supabase |
| `src/pages/SystemHealth.tsx` | System health diagnostics page |
| `src/components/system-health/HealthCheckCard.tsx` | Reusable health check card |
| `src/components/datacenter/DatacenterForm.tsx` | Datacenter creation form |
| `src/lib/validations.ts` | Zod validation schemas |
| `supabase/functions/test-connection/index.ts` | Config test edge function |
| `supabase/functions/storage-health-check/index.ts` | Storage health test |

### Files to Modify

| Path | Changes |
|------|---------|
| `src/lib/supabase.ts` | Remove entirely or remove client export |
| `src/pages/Vacations.tsx:6` | Fix import to use official client |
| `src/pages/Settings.tsx:548-556, 650-660, 745-753` | Wire test connection buttons |
| `src/pages/NetworkScan.tsx` | Add domain filtering, auto-populate IP, pagination |
| `src/pages/EmployeeReports.tsx` | Implement storage upload, versioning, parsing |
| `src/App.tsx` | Add /system-health route |
| `src/components/datacenter/ClusterForm.tsx:177` | Fix translation key |
| `src/contexts/LanguageContext.tsx` | Add missing translations |
| `src/components/layout/Sidebar.tsx` | Add System Health nav item (admin only) |
| `src/hooks/useDatacenter.ts` | Add useCreateDatacenter hook |
| `src/pages/Datacenter.tsx` | Add Create Datacenter action |
| Type import files | Update to use new types location |

### Database Migrations Required

1. Add `domain_role` to `domain_memberships`
2. Add `code` to `domains`
3. Create `is_domain_admin()` function
4. Create `ldap_configs`, `ntp_configs`, `mail_configs` tables
5. Create `connection_test_runs` table
6. Create `system_health_checks` table
7. Create `report_uploads`, `report_upload_rows` tables
8. Apply RLS policies to all new tables
9. Create `employee-reports` storage bucket

---

## Part 4: Implementation Order

1. **Database migrations** - Create all new tables, columns, functions, and RLS policies
2. **Supabase client consolidation** - Create types file, remove duplicate client, fix imports
3. **Edge functions** - Create test-connection, storage-health-check
4. **System Health page** - New page with all diagnostics
5. **Settings updates** - Wire up test buttons, add history display
6. **Employee Reports** - Implement storage, parsing, versioning
7. **Network Scan** - Domain filtering, pagination
8. **Data Center** - Translations, RF options, create datacenter flow, delete functionality
9. **Form validation** - Add Zod schemas, apply to forms
10. **Testing** - End-to-end verification of all features

---

## Part 5: Verification Checklist

### Security Verification

| Check | Method | Expected Result |
|-------|--------|-----------------|
| super_admin sees all domains | Login as super_admin, check domains list | All domains visible |
| domain_admin sees only assigned domains | Login as domain_admin, check domains | Only assigned domains visible |
| employee cannot edit configs | Login as employee, try to save LDAP config | Permission denied |
| Cross-domain access blocked | domain_admin tries to access other domain | Access denied |

### Module Verification

| Module | Test | Expected Result |
|--------|------|-----------------|
| System Health | Click "Run All Tests" | All 4 tests complete with results |
| Settings - LDAP Test | Click "Test Connection" | Toast shows result, history updated |
| Employee Reports | Upload Excel | Tasks created, download works |
| Network Scan | Select domain | Networks filtered correctly |
| Data Center | Create datacenter | Success, appears in list |

### UI/UX Verification

| Check | Location | Expected |
|-------|----------|----------|
| No "common.notes" | ClusterForm | Shows "ملاحظات" or "Notes" |
| No infinite spinners | All test buttons | Timeout after 30s with error |
| Clear error messages | All forms | Validation errors shown inline |

---

## Technical Notes

### Edge Function Security Pattern

All edge functions will:
- Validate Authorization header
- Check user role via `user_roles` table
- Use service role client for admin operations
- Return structured JSON responses
- Log to audit if sensitive operation

### RLS Correction Strategy

Replace `is_admin()` with `is_super_admin()` in SELECT policies for domain-scoped tables to prevent cross-domain access by non-super admins.
