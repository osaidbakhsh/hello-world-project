
# Final Corrections Implementation Plan

## Delta Summary (Changes from Previous Migration)

This plan addresses the remaining gaps and corrections from the approved remediation:

| Area | Previous State | Correction Needed |
|------|----------------|-------------------|
| servers RLS | SELECT/INSERT fixed | Add UPDATE/DELETE policies with NULL protection |
| licenses RLS | SELECT fixed | Add UPDATE/DELETE policies with NULL protection |
| website_applications | Authenticated-only | Make domain-scoped (has domain_id column) |
| on_call_* | Authenticated-only | Make domain-scoped (has domain_id column) |
| audit_logs | Policy-only restriction | Add BEFORE INSERT trigger to force user_id |
| vault_audit_logs | Policy-only restriction | Add BEFORE INSERT trigger to force user_id |
| employee-reports storage | Admin-only | Confirm correct model (matches intended UX) |
| nav.systemHealth translation | "صحة النظام" | Change to "فحص صحة النظام" |
| Network Scan | Uses fallback subnets | Remove auto-discovery fallback; require explicit selection |
| SMTP Test Email | Attempts real send | Document air-gapped limitations |

---

## Section 1: Complete RLS Gaps (Servers + Licenses UPDATE/DELETE)

### 1.1 Servers - Add UPDATE and DELETE Policies

**Current State:** UPDATE policy still uses `can_access_network(network_id)` without NULL check

**SQL to Apply:**
```sql
-- Drop existing vulnerable UPDATE policy
DROP POLICY IF EXISTS "Users can update servers in their networks" ON servers;

-- Create hardened UPDATE policy
CREATE POLICY "servers_update_v2" ON servers FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

-- Create DELETE policy (currently missing)
CREATE POLICY "servers_delete_v2" ON servers FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);
```

### 1.2 Licenses - Add UPDATE and DELETE Policies

**SQL to Apply:**
```sql
-- Create UPDATE policy with NULL protection
CREATE POLICY "licenses_update_v2" ON licenses FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

-- Create DELETE policy with NULL protection
CREATE POLICY "licenses_delete_v2" ON licenses FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);
```

---

## Section 2: Tighten Sensitive Tables (Domain-Scoped Access)

### 2.1 website_applications - Domain-Scoped Access

The table has `domain_id` column (nullable). Enforce domain-scoped access:

**SQL to Apply:**
```sql
-- Drop current authenticated-only policy
DROP POLICY IF EXISTS "website_applications_select_v2" ON website_applications;

-- Create domain-scoped policy
CREATE POLICY "website_applications_select_v3" ON website_applications FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
    OR (domain_id IS NULL AND is_active = true)  -- NULL domain_id treated as public if active
  )
);

-- Add UPDATE policy (domain-scoped)
CREATE POLICY "website_applications_update_v2" ON website_applications FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_edit_domain(domain_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_edit_domain(domain_id))
  )
);

-- Add DELETE policy (admin-only)
CREATE POLICY "website_applications_delete_v2" ON website_applications FOR DELETE
USING (
  auth.uid() IS NOT NULL AND is_admin()
);
```

### 2.2 on_call_schedules + on_call_assignments - Domain-Scoped

Both tables have `domain_id`. Enforce domain scoping:

**SQL to Apply:**
```sql
-- Drop current authenticated-only policies
DROP POLICY IF EXISTS "on_call_schedules_select_v2" ON on_call_schedules;
DROP POLICY IF EXISTS "on_call_assignments_select_v2" ON on_call_assignments;

-- Create domain-scoped SELECT for on_call_schedules
CREATE POLICY "on_call_schedules_select_v3" ON on_call_schedules FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
    OR domain_id IS NULL  -- Global schedules visible to all authenticated
  )
);

-- Create domain-scoped SELECT for on_call_assignments (via schedule)
CREATE POLICY "on_call_assignments_select_v3" ON on_call_assignments FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM on_call_schedules s 
      WHERE s.id = on_call_assignments.schedule_id 
      AND (s.domain_id IS NULL OR can_access_domain(s.domain_id))
    )
    OR profile_id = get_my_profile_id()  -- Users can always see their own assignments
  )
);
```

---

## Section 3: Audit Logs - Trigger-Based Validation

### 3.1 audit_logs - BEFORE INSERT Trigger

**SQL to Apply:**
```sql
-- Create validation trigger function
CREATE OR REPLACE FUNCTION validate_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Force user_id to be the current user's profile ID
  NEW.user_id := get_my_profile_id();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS audit_log_insert_validator ON audit_logs;
CREATE TRIGGER audit_log_insert_validator
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_audit_log_insert();
```

### 3.2 vault_audit_logs - BEFORE INSERT Trigger

**SQL to Apply:**
```sql
-- Create validation trigger function
CREATE OR REPLACE FUNCTION validate_vault_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Force user_id to be the current user's profile ID
  NEW.user_id := get_my_profile_id();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS vault_audit_log_insert_validator ON vault_audit_logs;
CREATE TRIGGER vault_audit_log_insert_validator
BEFORE INSERT ON vault_audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_vault_audit_log_insert();
```

---

## Section 4: Employee-Reports Storage Access Model

**Current State:** Admin-only access is implemented (employee_reports_admin_select/insert/delete)

**Confirmation:** The current admin-only model is correct for the intended UX:
- Employee Reports page is admin-only (`adminOnly: true` in sidebar)
- Reports are uploaded BY admins FOR employees
- Employees don't need direct storage access

**No changes needed** - current model is correct. The UI already restricts the page to admins.

---

## Section 5: Network Scan - Remove Auto-Discovery Fallback

### 5.1 Modify discoverSubnets() to Not Auto-Populate

**File:** `src/pages/NetworkScan.tsx`

**Change the `discoverSubnets()` function to:**
- Use ONLY networks table subnets
- If no networks defined, show empty list (not fallback subnets)
- Require user to add subnets manually

**Code Change:**
```typescript
const discoverSubnets = async () => {
  const { data: agents } = await supabase
    .from('scan_agents')
    .select('*')
    .eq('status', 'online')
    .eq('domain_id', selectedDomainId)
    .limit(1);
  
  if (agents?.length) {
    toast({
      title: t('scan.discoverSubnets'),
      description: language === 'ar' 
        ? 'الوكيل سيقوم باكتشاف الشبكات الفرعية'
        : 'Agent will discover available subnets',
    });
    // Future: Create discovery job for agent
  }
  
  // Use ONLY networks table - no fallback to default subnets
  const domainNetworks = filteredNetworks
    ?.filter(n => n.subnet)
    .map(n => n.subnet!) || [];
  
  setDiscoveredSubnets(domainNetworks);
  
  if (domainNetworks.length > 0) {
    toast({
      title: t('scan.savedNetworks') || (language === 'ar' ? 'الشبكات المحفوظة' : 'Saved Networks'),
      description: language === 'ar'
        ? `تم العثور على ${domainNetworks.length} شبكة`
        : `Found ${domainNetworks.length} networks from saved data`,
    });
  } else {
    // No fallback - inform user to add subnets manually
    toast({
      title: language === 'ar' ? 'لا توجد شبكات محفوظة' : 'No Saved Networks',
      description: language === 'ar'
        ? 'أضف شبكات من صفحة الشبكات أو أدخلها يدوياً'
        : 'Add networks from the Networks page or enter them manually',
      variant: 'default',
    });
  }
};
```

---

## Section 6: Translation Correction

### 6.1 Change nav.systemHealth Arabic Translation

**File:** `src/contexts/LanguageContext.tsx`

**Current (line 99):**
```javascript
'nav.systemHealth': 'صحة النظام',
```

**Change to:**
```javascript
'nav.systemHealth': 'فحص صحة النظام',
```

---

## Section 7: SMTP Test Email - Air-Gapped Limitations

### 7.1 Documentation of Limitations

**Current Implementation:** The `send-test-email` edge function attempts real SMTP connections.

**Air-Gapped Limitation:** 
- Edge functions run in Deno Deploy (cloud runtime)
- They cannot reach internal SMTP servers in air-gapped networks
- The test will fail with connection timeout/unreachable errors

**Recommended Actions:**
1. Keep `test-connection` edge function as validation-only
2. Add UI warning label explaining this limitation
3. Future: When agent support is added, route SMTP tests through the agent

**UI Enhancement (optional):**
Add a note in the Mail Settings UI:
```
"Note: Real send tests require the SMTP server to be reachable from the cloud.
For internal/air-gapped SMTP servers, the test may fail even with correct settings."
```

---

## Section 8: Quotation Uploader Name Display

### 8.1 Add Uploader Name to Quotation Cards

**File:** `src/pages/ProcurementDetail.tsx`

The hook already fetches `profiles(full_name)` for quotations. Add display in the quotation card.

**Location:** Around line 397-400, after vendor name display

**Add:**
```jsx
{q.profiles?.full_name && (
  <div className="text-sm text-muted-foreground">
    {t('procurement.uploadedBy')}: {q.profiles.full_name}
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| New Migration SQL | All RLS policy updates + triggers |
| `src/contexts/LanguageContext.tsx` | Change nav.systemHealth Arabic translation |
| `src/pages/NetworkScan.tsx` | Remove fallback subnet discovery |
| `src/pages/ProcurementDetail.tsx` | Add uploader name display |

---

## Complete SQL Migration

```sql
-- ============================================
-- FINAL CORRECTIONS MIGRATION
-- Addresses remaining RLS gaps and triggers
-- ============================================

-- 1.1: Servers UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users can update servers in their networks" ON servers;

CREATE POLICY "servers_update_v2" ON servers FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

CREATE POLICY "servers_delete_v2" ON servers FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (network_id IS NOT NULL AND can_access_network(network_id))
  )
);

-- 1.2: Licenses UPDATE/DELETE policies
CREATE POLICY "licenses_update_v2" ON licenses FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

CREATE POLICY "licenses_delete_v2" ON licenses FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
  )
);

-- 2.1: website_applications domain-scoped
DROP POLICY IF EXISTS "website_applications_select_v2" ON website_applications;

CREATE POLICY "website_applications_select_v3" ON website_applications FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
    OR (domain_id IS NULL AND is_active = true)
  )
);

CREATE POLICY "website_applications_update_v2" ON website_applications FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_edit_domain(domain_id))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_edit_domain(domain_id))
  )
);

CREATE POLICY "website_applications_delete_v2" ON website_applications FOR DELETE
USING (auth.uid() IS NOT NULL AND is_admin());

-- 2.2: on_call_schedules domain-scoped
DROP POLICY IF EXISTS "on_call_schedules_select_v2" ON on_call_schedules;

CREATE POLICY "on_call_schedules_select_v3" ON on_call_schedules FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() 
    OR (domain_id IS NOT NULL AND can_access_domain(domain_id))
    OR domain_id IS NULL
  )
);

-- 2.3: on_call_assignments domain-scoped via schedule
DROP POLICY IF EXISTS "on_call_assignments_select_v2" ON on_call_assignments;

CREATE POLICY "on_call_assignments_select_v3" ON on_call_assignments FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin()
    OR profile_id = get_my_profile_id()
    OR EXISTS (
      SELECT 1 FROM on_call_schedules s 
      WHERE s.id = on_call_assignments.schedule_id 
      AND (s.domain_id IS NULL OR can_access_domain(s.domain_id))
    )
  )
);

-- 3.1: audit_logs trigger
CREATE OR REPLACE FUNCTION validate_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := get_my_profile_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_insert_validator ON audit_logs;
CREATE TRIGGER audit_log_insert_validator
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_audit_log_insert();

-- 3.2: vault_audit_logs trigger
CREATE OR REPLACE FUNCTION validate_vault_audit_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := get_my_profile_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vault_audit_log_insert_validator ON vault_audit_logs;
CREATE TRIGGER vault_audit_log_insert_validator
BEFORE INSERT ON vault_audit_logs
FOR EACH ROW EXECUTE FUNCTION validate_vault_audit_log_insert();
```

---

## Test Report Template

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| 1 | Employee cannot see NULL network_id servers | Login as employee, query servers | No NULL network rows visible | PENDING |
| 2 | Employee cannot UPDATE servers outside network | Attempt update | RLS blocks | PENDING |
| 3 | Employee cannot DELETE servers | Attempt delete | RLS blocks | PENDING |
| 4 | Licenses NULL domain_id admin-only | Login as employee, query | No NULL domain rows | PENDING |
| 5 | website_applications domain-scoped | Employee queries | Only domain-assigned apps visible | PENDING |
| 6 | on_call_schedules domain-scoped | Employee queries | Only domain schedules visible | PENDING |
| 7 | on_call_assignments user can see own | Employee queries | Own assignments visible | PENDING |
| 8 | Audit log insert forced to current user | Insert with fake user_id | Trigger overrides to actual user | PENDING |
| 9 | Network scan no fallback subnets | Advanced mode with no networks | Empty list, manual add only | PENDING |
| 10 | nav.systemHealth shows correct Arabic | Switch to Arabic | Shows "فحص صحة النظام" | PENDING |
| 11 | Quotation shows uploader name | View quotation detail | Shows profile name | PENDING |

---

## Manual Steps Required

1. **Enable Leaked Password Protection:**
   - Lovable Cloud Backend Settings → Auth → Security
   - Toggle "Leaked Password Protection" ON

2. **Add SMTP limitation note to UI** (optional enhancement):
   - Add info tooltip in Mail Settings explaining cloud runtime limitations

---

## Technical Notes

### Air-Gapped SMTP Limitation
The `send-test-email` edge function runs in Deno Deploy cloud runtime. It cannot reach internal SMTP servers in air-gapped environments. For production use in such environments:
- Use the validation-only approach (test-connection) 
- Future: Route SMTP tests through on-premise agents

### Employee-Reports Storage Model
Current admin-only model is correct:
- Bucket is private
- Only admins can upload/download
- Employees view reports through the admin-controlled UI
- No cross-domain access possible (admin sees all, but uploads are domain-tagged in DB)
