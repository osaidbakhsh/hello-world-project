
# Full Remediation + UI Fix Pack Implementation Plan

## Executive Summary
This plan addresses 5 critical RLS security vulnerabilities, 2 warnings, storage isolation issues, datacenter UI fixes, network scan enhancements, procurement improvements, and sidebar reorganization identified in the audit.

---

## SECTION A: SECURITY REMEDIATION (Critical Fixes)

### A1) Servers Table RLS Fix - NULL network_id Exposure

**Current Policy (Vulnerable):**
```sql
-- Policy "Users can view servers in their networks"
USING: (is_admin() OR can_access_network(network_id) OR (network_id IS NULL))
```

**Issue:** Any authenticated user can see all servers where `network_id IS NULL`.

**Solution (Option 2 - Admin-only for NULL):**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view servers in their networks" ON servers;
DROP POLICY IF EXISTS "Users can add servers to their networks" ON servers;

-- Recreate with proper restrictions
CREATE POLICY "servers_select" ON servers FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

CREATE POLICY "servers_insert" ON servers FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);
```

---

### A2) Licenses Table RLS Fix - NULL domain_id Exposure

**Current Policy (Vulnerable):**
```sql
-- Policy "Users can view licenses in their domains"
USING: (is_admin() OR can_access_domain(domain_id) OR (domain_id IS NULL))
```

**Issue:** Any user can see licenses with NULL `domain_id`.

**Solution:**
```sql
DROP POLICY IF EXISTS "Users can view licenses in their domains" ON licenses;

CREATE POLICY "licenses_select" ON licenses FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);
```

---

### A3) website_applications RLS Fix - Publicly Readable

**Current Policy (Vulnerable):**
```sql
-- Policy "Users can view active website applications"
USING: ((is_active = true) OR is_admin())
```

**Issue:** No `auth.uid()` check - unauthenticated users can read active apps.

**Solution:**
```sql
DROP POLICY IF EXISTS "Users can view active website applications" ON website_applications;

CREATE POLICY "website_applications_select" ON website_applications FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() OR is_active = true
  )
);
```

---

### A4) on_call_schedules + on_call_assignments RLS Fix - USING(true)

**Current Policy (Vulnerable):**
```sql
-- Policy "Users can view on call schedules"
USING: true
-- Policy "Users can view on_call_assignments"
USING: true
```

**Issue:** Unauthenticated access allowed.

**Solution:**
```sql
DROP POLICY IF EXISTS "Users can view on call schedules" ON on_call_schedules;
DROP POLICY IF EXISTS "Users can view on_call_assignments" ON on_call_assignments;

CREATE POLICY "on_call_schedules_select" ON on_call_schedules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "on_call_assignments_select" ON on_call_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);
```

---

### A5) Leaked Password Protection

**Current State:** DISABLED (confirmed by linter)

**Required Action:** Manual configuration in Supabase Dashboard

**Steps for Project Owner:**
1. Open Lovable Cloud → Backend Settings
2. Navigate to Auth → Security
3. Enable "Leaked Password Protection"
4. Save changes

**Note:** This cannot be set programmatically via migrations.

---

## SECTION B: WARNINGS - Audit Log Insert Restrictions

### B1) audit_logs Insert Restriction

**Current Policy:**
```sql
-- Policy "Authenticated users can insert audit logs"
WITH CHECK: (auth.uid() IS NOT NULL)
```

**Issue:** Any authenticated user can insert arbitrary audit logs.

**Solution - Controlled Insert via Trigger:**
```sql
-- Replace permissive insert with actor validation
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

-- Create function to validate audit log inserts
CREATE OR REPLACE FUNCTION validate_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user_id matches current user
  IF NEW.user_id IS NOT NULL AND NEW.user_id != get_my_profile_id() THEN
    RAISE EXCEPTION 'Cannot insert audit log for another user';
  END IF;
  
  -- Set user_id to current user if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := get_my_profile_id();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_log_insert_validator
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_audit_log_insert();

-- New restricted policy
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = get_my_profile_id())
);
```

### B2) vault_audit_logs Insert Restriction

Same approach as audit_logs:
```sql
DROP POLICY IF EXISTS "Authenticated users can insert vault audit logs" ON vault_audit_logs;

CREATE OR REPLACE FUNCTION validate_vault_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.user_id != get_my_profile_id() THEN
    RAISE EXCEPTION 'Cannot insert vault audit log for another user';
  END IF;
  IF NEW.user_id IS NULL THEN
    NEW.user_id := get_my_profile_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vault_audit_log_insert_validator
BEFORE INSERT ON vault_audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_vault_audit_log_insert();

CREATE POLICY "vault_audit_logs_insert" ON vault_audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = get_my_profile_id())
);
```

---

## SECTION C: STORAGE ISOLATION

### C1) employee-reports Domain-Scoped Access

**Current Issue:** Any authenticated user can read/delete any employee report.

**Solution - Storage Policy Enhancement:**
```sql
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read employee reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete employee reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload employee reports" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_delete" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_select" ON storage.objects;

-- Admin-only access for employee reports
CREATE POLICY "employee_reports_select_v2" ON storage.objects FOR SELECT
USING (bucket_id = 'employee-reports' AND is_admin());

CREATE POLICY "employee_reports_insert_v2" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-reports' AND is_admin());

CREATE POLICY "employee_reports_delete_v2" ON storage.objects FOR DELETE
USING (bucket_id = 'employee-reports' AND is_admin());
```

### C2) MIME Type Restrictions

**procurement-quotations bucket:**
```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'procurement-quotations';
```

**employee-reports bucket:**
```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
]
WHERE id = 'employee-reports';
```

---

## SECTION D: DATACENTER UI FIXES

### D1) Cluster Management - Already Implemented ✅

Based on file review:
- `ClusterTable.tsx` already has Edit/Delete with guardrails (lines 79-100)
- `ClusterForm.tsx` already has domain selector as first field (lines 100-117)
- `DatacenterOverview.tsx` has edit/delete on cluster cards (lines 236-250)
- Guardrails check `nodes?.filter()` and `vms?.filter()` for linked items

**No additional changes needed for cluster management.**

### D2) Completeness Section Translations

**Current State:** Translations exist in Arabic (lines 93-98 of LanguageContext.tsx)

**Issue:** English translations may be missing. Need to verify English section.

**Files to Check/Modify:**
| File | Change |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Verify English translations exist |

**English translations to add if missing:**
```javascript
// In English section
'datacenter.nodesWithSerial': 'Nodes with Serial Number',
'datacenter.vmsLinked': 'Linked VMs',
'datacenter.completenessDesc': 'Infrastructure data completeness',
'datacenter.completenessScore': 'Completeness',
'datacenter.clustersTab': 'Clusters',
'datacenter.cannotDeleteCluster': 'Cannot Delete Cluster',
```

### D3) Required Translations Verification

**Arabic (confirmed in LanguageContext.tsx lines 93-99):**
- ✅ `datacenter.clustersTab`: 'الكلسترات'
- ✅ `datacenter.nodesWithSerial`: 'النودات مع الرقم التسلسلي'
- ✅ `datacenter.vmsLinked`: 'الأجهزة الافتراضية المرتبطة'
- ✅ `datacenter.completenessDesc`: 'مستوى اكتمال بيانات البنية التحتية'
- ✅ `nav.systemHealth`: 'صحة النظام' (line 99)

**Action:** Verify English section has matching keys.

---

## SECTION E: NETWORK SCAN - Advanced Mode Without Agent

### Current State Analysis:
From `NetworkScan.tsx`:
- Scan mode selector exists (standard/advanced) - lines 90-93
- `discoverSubnets()` function exists but simulates discovery - lines 183-213
- CSV export implemented - lines 376-396
- Domain scoping via `selectedDomainId` - lines 143-166

### Required Enhancements:

**E1) Use Networks Table for Subnet Discovery**

**Modify `NetworkScan.tsx` around line 183:**
```typescript
const discoverSubnets = async () => {
  // Check for online agents in the selected domain
  const { data: agents } = await supabase
    .from('scan_agents')
    .select('*')
    .eq('status', 'online')
    .eq('domain_id', selectedDomainId)
    .limit(1);
  
  if (agents?.length) {
    // Agent-based discovery - future implementation
    toast({
      title: t('scan.discoverSubnets'),
      description: language === 'ar' 
        ? 'الوكيل سيقوم باكتشاف الشبكات الفرعية'
        : 'Agent will discover available subnets',
    });
    // Create discovery job - placeholder for agent implementation
  } else {
    // Use networks table as source
    const domainNetworks = filteredNetworks
      ?.filter(n => n.subnet)
      .map(n => n.subnet!) || [];
    
    if (domainNetworks.length > 0) {
      setDiscoveredSubnets(domainNetworks);
      toast({
        title: language === 'ar' ? 'الشبكات المحفوظة' : 'Saved Networks',
        description: language === 'ar'
          ? `تم العثور على ${domainNetworks.length} شبكة`
          : `Found ${domainNetworks.length} networks`,
      });
    } else {
      // Fallback to common private subnets
      setDiscoveredSubnets(['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24']);
      toast({
        title: t('scan.noAgent'),
        description: language === 'ar'
          ? 'سيتم عرض الشبكات الافتراضية الخاصة'
          : 'Showing default private subnets',
        variant: 'default',
      });
    }
  }
};
```

**E2) Add Manual Subnet Input**

**Add new state:**
```typescript
const [manualSubnet, setManualSubnet] = useState('');
```

**Add UI section for manual subnet entry:**
```jsx
{scanMode === 'advanced' && (
  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
    {/* Existing content */}
    
    {/* Manual subnet add */}
    <div className="flex gap-2">
      <div className="flex-1">
        <Label>{language === 'ar' ? 'إضافة شبكة يدوياً' : 'Add Subnet Manually'}</Label>
        <Input
          placeholder="e.g., 192.168.50.0/24"
          value={manualSubnet}
          onChange={e => setManualSubnet(e.target.value)}
        />
      </div>
      <Button
        className="mt-6"
        onClick={() => {
          if (manualSubnet && !discoveredSubnets.includes(manualSubnet)) {
            setDiscoveredSubnets([...discoveredSubnets, manualSubnet]);
            setManualSubnet('');
          }
        }}
      >
        {language === 'ar' ? 'إضافة' : 'Add'}
      </Button>
    </div>
  </div>
)}
```

**E3) Guardrails for Large Scans**

Already implemented at line 247-252:
```typescript
if (totalHosts > 1000) {
  setShowLargeRangeWarning(true);
  return;
}
```

**E4) Agent Future Integration Points**

The code is already structured to support agent-based discovery:
- Agent check at line 185-190
- Scan job creation at line 267-280 includes `agent_id` field
- `scan_agents` table exists with `domain_id` for domain scoping

---

## SECTION F: PROCUREMENT ENHANCEMENTS

### Current State (Already Implemented):
- ✅ KPI Dashboard cards - lines 232-263
- ✅ Sample Data Generator (super_admin only) - lines 75-139
- ✅ Employee filter - lines 46-54, 281-293
- ✅ Excel export - lines 141-160
- ✅ "Created By" column in table - lines 340, 354

### Remaining Enhancement: Uploader Name in Quotations

**File:** `src/pages/ProcurementDetail.tsx`

**Current:** Quotation display likely exists but needs verification

**Enhancement needed:** Ensure `profiles(full_name)` is joined in query and displayed

---

## SECTION G: SIDEBAR ORGANIZATION

### Current State (Already Implemented):
From `Sidebar.tsx` lines 58-84:
- ✅ `procurement` at line 79
- ✅ `systemHealth` at line 82
- ✅ `settings` at line 83

From `SidebarOrderSettings.tsx` lines 16-42:
- ✅ All three items included in `defaultMenuItems`

**Translation Check:**
- ✅ `nav.systemHealth`: 'صحة النظام' (line 99 in LanguageContext)
- ✅ `nav.procurement`: 'المشتريات' (line 51)

**No additional changes needed for sidebar.**

---

## SECTION H: FILES TO MODIFY

| File | Changes |
|------|---------|
| `supabase/migrations/XXXXX_security_fixes.sql` | All RLS policy fixes (A1-A4, B1-B2, C1-C2) |
| `src/contexts/LanguageContext.tsx` | Verify English translations for datacenter keys |
| `src/pages/NetworkScan.tsx` | Use networks table for subnet discovery, add manual subnet input |
| `src/pages/ProcurementDetail.tsx` | Verify uploader name display |

---

## SECTION I: DATABASE MIGRATION SQL

```sql
-- ============================================
-- SECURITY REMEDIATION MIGRATION
-- ============================================

-- A1: Fix servers RLS
DROP POLICY IF EXISTS "Users can view servers in their networks" ON servers;
DROP POLICY IF EXISTS "Users can add servers to their networks" ON servers;

CREATE POLICY "servers_select_v2" ON servers FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

CREATE POLICY "servers_insert_v2" ON servers FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

-- A2: Fix licenses RLS
DROP POLICY IF EXISTS "Users can view licenses in their domains" ON licenses;

CREATE POLICY "licenses_select_v2" ON licenses FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

-- A3: Fix website_applications RLS
DROP POLICY IF EXISTS "Users can view active website applications" ON website_applications;

CREATE POLICY "website_applications_select_v2" ON website_applications FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() OR is_active = true
  )
);

-- A4: Fix on_call RLS
DROP POLICY IF EXISTS "Users can view on call schedules" ON on_call_schedules;
DROP POLICY IF EXISTS "Users can view on_call_assignments" ON on_call_assignments;

CREATE POLICY "on_call_schedules_select_v2" ON on_call_schedules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "on_call_assignments_select_v2" ON on_call_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- B1: Fix audit_logs insert
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

CREATE POLICY "audit_logs_insert_v2" ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = get_my_profile_id())
);

-- B2: Fix vault_audit_logs insert  
DROP POLICY IF EXISTS "Authenticated users can insert vault audit logs" ON vault_audit_logs;

CREATE POLICY "vault_audit_logs_insert_v2" ON vault_audit_logs FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = get_my_profile_id())
);

-- C1: Fix employee-reports storage policies
DROP POLICY IF EXISTS "Authenticated users can read employee reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete employee reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload employee reports" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_delete" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_reports_select" ON storage.objects;

CREATE POLICY "employee_reports_admin_select" ON storage.objects FOR SELECT
USING (bucket_id = 'employee-reports' AND is_admin());

CREATE POLICY "employee_reports_admin_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-reports' AND is_admin());

CREATE POLICY "employee_reports_admin_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'employee-reports' AND is_admin());

-- C2: MIME type restrictions
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'procurement-quotations';

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
]
WHERE id = 'employee-reports';
```

---

## SECTION J: TEST REPORT TEMPLATE

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| 1 | Unauthenticated cannot read website_applications | Logout, query website_applications | Empty/Error | PENDING |
| 2 | Unauthenticated cannot read on_call_schedules | Logout, query on_call_schedules | Empty/Error | PENDING |
| 3 | Employee cannot see servers with NULL network_id | Login as employee, query servers | No NULL network_id rows | PENDING |
| 4 | Licenses with NULL domain_id are admin-only | Login as employee, query licenses | No NULL domain_id rows | PENDING |
| 5 | Audit logs cannot be inserted for other users | Try inserting log with different user_id | Error thrown | PENDING |
| 6 | employee-reports cross-domain blocked | Non-admin try to read reports | Access denied | PENDING |
| 7 | super_admin can edit/delete clusters | Edit/Delete cluster | Success | PENDING |
| 8 | Delete blocked if cluster has nodes/VMs | Delete cluster with nodes | Toast with counts shown | PENDING |
| 9 | Completeness shows translated labels | View datacenter in Arabic | Arabic labels displayed | PENDING |
| 10 | Network scan advanced lists saved networks | Enable advanced mode | Networks table subnets shown | PENDING |
| 11 | CSV export works | Export scan results | CSV file downloads | PENDING |
| 12 | Procurement dashboard shows KPIs | View /procurement | 5 KPI cards visible | PENDING |
| 13 | Sample data works (super_admin) | Click sample data button | Request created | PENDING |
| 14 | Employee filter works | Select employee filter | List filtered | PENDING |
| 15 | Excel export respects filters | Apply filter, export | Filtered data exported | PENDING |
| 16 | Sidebar shows translated system health | Check Arabic sidebar | "صحة النظام" displayed | PENDING |
| 17 | Sidebar reorder includes procurement/systemHealth | Open sidebar settings | Both items visible | PENDING |
| 18 | Cross-domain procurement blocked | Try access other domain request | RLS blocks | PENDING |

---

## SECTION K: MANUAL STEPS REQUIRED

1. **Enable Leaked Password Protection:**
   - Navigate to Lovable Cloud Backend Settings
   - Go to Auth → Security
   - Toggle "Leaked Password Protection" ON
   - Save

2. **Verify after deployment:**
   - Run security linter again to confirm no warnings
   - Test all scenarios in test report

---

## Limitations & Notes

1. **Air-Gapped Network Scan:** Without an agent, actual network discovery is not possible from browser. The implementation uses saved networks from the database as the source of subnets.

2. **Agent Future Path:** The code structure supports adding agent-based discovery later. The agent would:
   - Query local interfaces and routes
   - Check ARP cache
   - Report discovered subnets back to the application

3. **SMTP Test Email:** Already implemented in `send-test-email` edge function. In air-gapped environments, SMTP servers must be internal and reachable from the Supabase edge function runtime.
