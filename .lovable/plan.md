
# Enterprise Backlog Implementation Plan
## IT Infrastructure Manager - Enterprise-Grade Evolution

---

## Executive Summary

This plan outlines the implementation of **12 EPICs** to transform the current IT Infrastructure Manager into an enterprise-grade, offline-first platform. The implementation follows the prioritized order: P0 epics first (A→B→C→D), followed by P1/P2 epics.

---

## Current State Analysis

### What's Already Working
| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | Working | Supabase Auth with profile caching |
| Domain-centric filtering | Partial | Dashboard/Servers have domain filter |
| Servers/Networks/Licenses | Working | Full CRUD with Supabase |
| Tasks (List/Kanban/Calendar) | Working | Drag-drop kanban exists |
| Vault (Encrypted) | Working | AES-256-GCM via Edge Functions |
| Audit Logs | Working | Stores user_name/user_email |
| RLS Policies | Working | is_admin(), can_access_domain() |
| Excel/PDF Export | Partial | Excel works, PDF has Arabic font issues |
| Import with Review | Working | Smart import with dry-run |

### Critical Gaps to Address
| Gap | Priority | Impact | Status |
|-----|----------|--------|--------|
| Role stored in profiles table | P0 | Security vulnerability | ✅ DONE - Migrated to user_roles table |
| No on-call rotation module | P0 | Missing operational feature | 🔄 Next |
| No maintenance windows | P0 | No change management | Pending |
| No asset lifecycle fields | P0 | No warranty/EOL tracking | Pending |
| No certificates table | P1 | No SSL/domain expiry tracking | Pending |
| No runbooks module | P1 | No procedures documentation | Pending |
| No Domain Summary page | P0 | No single-pane view | Pending |
| PDF Arabic fonts broken | P1 | Export quality issue | Pending |
| Task status dual-field confusion | P1 | Data integrity issue | Pending |

---

## ✅ Completed: Phase 1 - Security Foundation

### What was implemented:
1. **Created `user_roles` table** - Separate secure table for role storage
2. **Migrated existing roles** - All profiles.role values copied to user_roles
3. **Created `has_role()` function** - SECURITY DEFINER function to check roles safely
4. **Updated `is_admin()` function** - Now uses user_roles table via has_role()
5. **Created `get_user_role()` function** - Returns user's primary role
6. **Added RLS policies** - Admin can manage, users can view their own
7. **Updated `handle_new_user()` trigger** - Creates both profile AND user_role
8. **Updated `AuthContext.tsx`** - Fetches role from user_roles (not profiles!)
9. **Created `useUserRole.ts` hook** - Reusable hook for role fetching

---

## Database Schema Changes

### New Tables Required

```text
1. user_roles (P0 - Security Critical)
   - id, user_id, role, created_at
   
2. on_call_schedules (P0 - Enhanced)
   - Add: domain_id, primary_user_id, secondary_user_id, 
          start_date, end_date, timezone
   
3. on_call_escalations (P0 - New)
   - domain_id, severity, sla_minutes, escalation_steps, 
     notify_channels
     
4. maintenance_windows (P0 - New)
   - domain_id, title, start_at, end_at, change_type,
     approved_by, related_task_ids, notes, attachments
     
5. certificates (P1 - New)
   - domain_id, server_id, service_type, common_name, 
     sans, issuer, expiry_date, thumbprint, notes
     
6. runbooks (P1 - New)
   - domain_id, service_name, title, content, owner_id,
     last_reviewed_at, review_interval_days
     
7. runbook_evidence (P1 - New)
   - runbook_id, file_url, notes, created_by, created_at
     
8. applications (P1 - New)
   - domain_id, name, type, server_id, database_server_id,
     owner_id, criticality, notes
     
9. asset_relationships (P1 - New)
   - source_type, source_id, target_type, target_id,
     relationship_type
```

### Existing Tables Modifications

```text
servers (Add columns):
  - purchase_date, vendor, model, serial_number
  - warranty_end, contract_id, eol_date, eos_date
  - support_level, server_role (DC/CA/DHCP/File/Exchange/etc)
  - rpo_hours, rto_hours, last_restore_test
  
licenses (Add columns):
  - contract_id, support_level
  
tasks (Modify):
  - Remove 'status' column confusion
  - Add: domain_id, severity, labels, sla_target_hours
  - Add: is_change_request, maintenance_window_id
```

---

## Implementation Phases

### Phase 1: Security Foundation (P0)
**Duration: 3-4 hours**

#### 1.1 Migrate Roles to Separate Table

```sql
-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Migrate existing roles
INSERT INTO user_roles (user_id, role)
SELECT user_id, role FROM profiles;

-- Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update is_admin() to use new table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
```

**Files to Update:**
- `src/contexts/AuthContext.tsx` - Fetch role from user_roles
- `src/hooks/useSupabaseData.ts` - Add useUserRole hook

---

### Phase 2: EPIC A - Domain Summary Page (P0)
**Duration: 4-5 hours**

#### 2.1 New Page: Domain Summary

**File:** `src/pages/DomainSummary.tsx`

```text
Layout:
┌─────────────────────────────────────────────────────────────┐
│  Domain: [Dropdown] ▼                    [Quick Actions ▼]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Servers: 45 │ │ Licenses: 12│ │ Tasks: 8    │ │ Alerts │ │
│  │ Active: 42  │ │ Expiring: 3 │ │ Overdue: 2  │ │   5    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Critical Roles Summary          │  Backup Status           │
│  ┌──────────────────────────┐   │  ┌──────────────────────┐│
│  │ DC: srv-dc01, srv-dc02   │   │  │ Coverage: 89%        ││
│  │ CA: srv-ca01             │   │  │ Last Success: 2h ago ││
│  │ Exchange: srv-exch01     │   │  │ Failed: 2 servers    ││
│  │ File: srv-file01         │   │  └──────────────────────┘│
│  └──────────────────────────┘   │                          │
├─────────────────────────────────┼──────────────────────────┤
│  Expiry Alerts (7)              │  On-Call Now             │
│  ┌──────────────────────────┐   │  ┌──────────────────────┐│
│  │ 🔴 License X - 3 days    │   │  │ Primary: Ahmed       ││
│  │ 🟡 Cert Y - 14 days      │   │  │ Secondary: Omar      ││
│  │ 🟡 Domain Z - 28 days    │   │  │ Escalation: Admin    ││
│  └──────────────────────────┘   │  └──────────────────────┘│
├─────────────────────────────────┴──────────────────────────┤
│  Upcoming Maintenance Windows                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Feb 5: Exchange Update - 02:00-04:00 (Approved)         ││
│  │ Feb 8: Network Switch Upgrade - 22:00-23:00 (Pending)   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- `src/components/domain-summary/CriticalRolesCard.tsx`
- `src/components/domain-summary/BackupStatusCard.tsx`
- `src/components/domain-summary/ExpiryAlertsCard.tsx`
- `src/components/domain-summary/OnCallWidget.tsx`
- `src/components/domain-summary/MaintenanceCalendar.tsx`
- `src/components/domain-summary/QuickActions.tsx`

---

### Phase 3: EPIC B - On-Call Rotation (P0)
**Duration: 4-5 hours**

#### 3.1 Database Schema

```sql
-- Enhance on_call_schedules
ALTER TABLE on_call_schedules 
ADD COLUMN domain_id uuid REFERENCES domains(id),
ADD COLUMN primary_user_id uuid REFERENCES profiles(id),
ADD COLUMN secondary_user_id uuid REFERENCES profiles(id),
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN timezone text DEFAULT 'Asia/Riyadh';

-- Create escalation rules
CREATE TABLE on_call_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) NOT NULL,
  severity text NOT NULL, -- P0, P1, P2, P3, P4
  sla_minutes integer NOT NULL,
  escalation_steps jsonb DEFAULT '[]', -- [{step: 1, notify: 'primary'}, ...]
  notify_channels text[] DEFAULT '{}', -- email, in_app
  created_at timestamptz DEFAULT now()
);
```

#### 3.2 New Page: On-Call Management

**File:** `src/pages/OnCall.tsx`

Features:
- Rotation calendar view
- Current on-call display
- Escalation rules configuration
- Schedule CRUD
- Domain filter

---

### Phase 4: EPIC C - Maintenance Windows (P0)
**Duration: 4-5 hours**

#### 4.1 Database Schema

```sql
CREATE TABLE maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  change_type text DEFAULT 'standard', -- standard, emergency, normal
  status text DEFAULT 'pending', -- pending, approved, in_progress, completed, cancelled
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  related_task_ids uuid[] DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

#### 4.2 Change Calendar Page

**File:** `src/pages/ChangeCalendar.tsx`

Features:
- Calendar view (month/week/day)
- Conflict detection
- Link tasks as "Change Requests"
- Export by domain/date range

---

### Phase 5: EPIC D - Asset Lifecycle (P0)
**Duration: 3-4 hours**

#### 5.1 Extend Servers Table

```sql
ALTER TABLE servers ADD COLUMN IF NOT EXISTS
  purchase_date date,
  vendor text,
  model text,
  serial_number text,
  warranty_end date,
  contract_id text,
  eol_date date,
  eos_date date,
  support_level text DEFAULT 'standard', -- standard, premium, none
  server_role text[], -- DC, CA, DHCP, DNS, File, Exchange, IIS, etc.
  rpo_hours integer,
  rto_hours integer,
  last_restore_test timestamptz;
```

#### 5.2 Lifecycle Center Page

**File:** `src/pages/LifecycleCenter.tsx`

Features:
- Filter: expiring warranty, EOL/EOS, vendor, domain
- Countdown alerts (90/60/30 days)
- Refresh Plan report export

---

### Phase 6: P1 EPICs (E-K)

#### EPIC E: Runbooks Module
**Files:**
- `src/pages/Runbooks.tsx`
- `src/components/runbooks/RunbookEditor.tsx`
- `src/components/runbooks/EvidenceTimeline.tsx`

#### EPIC F: Certificate & Expiry Center
**Files:**
- `src/pages/ExpiryCenterFull.tsx`
- `src/components/expiry/CertificateList.tsx`
- `src/components/expiry/DomainExpiryList.tsx`

#### EPIC G: Jira-like Tasks Enhancement
**Changes:**
- Unify `status` and `task_status` fields
- Add database trigger for sync
- Enhance KanbanBoard with true persistence

```sql
-- Trigger to keep status in sync
CREATE OR REPLACE FUNCTION sync_task_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_status = 'done' THEN
    NEW.status = 'completed';
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF NEW.task_status IN ('draft', 'assigned', 'in_progress', 'blocked', 'in_review') THEN
    NEW.status = 'pending';
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_sync
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION sync_task_status();
```

#### EPIC H: Professional Exports
**Changes:**
- Embed Arabic font (Amiri) in jsPDF
- Standardize export options across all modules
- Add domain scope and generator info

**Files to Update:**
- `src/utils/pdfExport.ts` - Add font embedding
- `src/utils/professionalExport.ts` - Standardize Excel

#### EPIC I: Employee Weekly Import
**Enhance existing:**
- `src/components/employees/EmployeeTaskUpload.tsx`
- `src/hooks/useSmartImport.ts`

#### EPIC J: Web Applications (Existing)
**Status:** Already implemented in `src/pages/WebApps.tsx`
**Enhancement:** Add role-based visibility per domain

#### EPIC K: Impact Analysis
**New Tables:**
- `applications` - Track apps/services
- `asset_relationships` - Track dependencies

**Files:**
- `src/pages/ImpactAnalysis.tsx`
- `src/components/impact/RelationshipGraph.tsx`

---

### Phase 7: EPIC L - CSR Generator Tool (P2)

**File:** `src/components/it-tools/crypto/CsrGenerator.tsx`

Features:
- Client-side key generation (WebCrypto API)
- Inputs: CN, O/OU/C/ST/L, SANs, algorithm
- Outputs: openssl.cnf, commands, CSR
- Download CSR/Key (admin only)
- Link from Certificate Center

---

## File Structure

```text
src/
├── pages/
│   ├── DomainSummary.tsx      [NEW - EPIC A]
│   ├── OnCall.tsx             [NEW - EPIC B]
│   ├── ChangeCalendar.tsx     [NEW - EPIC C]
│   ├── LifecycleCenter.tsx    [NEW - EPIC D]
│   ├── Runbooks.tsx           [NEW - EPIC E]
│   ├── ExpiryCenterFull.tsx   [NEW - EPIC F]
│   ├── ImpactAnalysis.tsx     [NEW - EPIC K]
│   └── ... (existing)
│
├── components/
│   ├── domain-summary/        [NEW - EPIC A]
│   │   ├── CriticalRolesCard.tsx
│   │   ├── BackupStatusCard.tsx
│   │   ├── ExpiryAlertsCard.tsx
│   │   ├── OnCallWidget.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── on-call/               [NEW - EPIC B]
│   │   ├── ScheduleCalendar.tsx
│   │   ├── EscalationRules.tsx
│   │   └── OnCallForm.tsx
│   │
│   ├── maintenance/           [NEW - EPIC C]
│   │   ├── MaintenanceCalendar.tsx
│   │   ├── MaintenanceForm.tsx
│   │   └── ConflictWarning.tsx
│   │
│   ├── lifecycle/             [NEW - EPIC D]
│   │   ├── LifecycleFilters.tsx
│   │   └── RefreshPlanReport.tsx
│   │
│   ├── runbooks/              [NEW - EPIC E]
│   │   ├── RunbookEditor.tsx
│   │   ├── EvidenceTimeline.tsx
│   │   └── RunbookList.tsx
│   │
│   ├── expiry/                [ENHANCE - EPIC F]
│   │   ├── CertificateList.tsx
│   │   └── DomainExpiryList.tsx
│   │
│   ├── impact/                [NEW - EPIC K]
│   │   ├── RelationshipGraph.tsx
│   │   └── ImpactTree.tsx
│   │
│   └── it-tools/crypto/
│       └── CsrGenerator.tsx   [NEW - EPIC L]
│
├── hooks/
│   ├── useSupabaseData.ts     [ENHANCE]
│   ├── useUserRole.ts         [NEW]
│   ├── useOnCall.ts           [NEW]
│   ├── useMaintenance.ts      [NEW]
│   └── useImpactAnalysis.ts   [NEW]
│
└── utils/
    ├── pdfExport.ts           [ENHANCE - Arabic font]
    └── csrGenerator.ts        [NEW - WebCrypto CSR]
```

---

## Sidebar Navigation Update

```typescript
// Add to Sidebar.tsx menuItems array
{ path: '/domain-summary', icon: LayoutDashboard, labelKey: 'nav.domainSummary' },
{ path: '/on-call', icon: PhoneCall, labelKey: 'nav.onCall' },
{ path: '/change-calendar', icon: CalendarClock, labelKey: 'nav.changeCalendar' },
{ path: '/lifecycle', icon: Clock, labelKey: 'nav.lifecycle' },
{ path: '/runbooks', icon: BookOpen, labelKey: 'nav.runbooks' },
{ path: '/expiry-center', icon: AlertTriangle, labelKey: 'nav.expiryCenter' },
{ path: '/impact-analysis', icon: GitBranch, labelKey: 'nav.impactAnalysis' },
```

---

## Translation Keys Required

```typescript
// Arabic
'nav.domainSummary': 'ملخص النطاق',
'nav.onCall': 'المناوبات',
'nav.changeCalendar': 'تقويم التغييرات',
'nav.lifecycle': 'دورة حياة الأصول',
'nav.runbooks': 'الإجراءات التشغيلية',
'nav.expiryCenter': 'مركز الانتهاء',
'nav.impactAnalysis': 'تحليل الأثر',

'domainSummary.title': 'ملخص النطاق',
'domainSummary.criticalRoles': 'الأدوار الحرجة',
'domainSummary.backupStatus': 'حالة النسخ الاحتياطي',
'domainSummary.expiryAlerts': 'تنبيهات الانتهاء',
'domainSummary.onCallNow': 'المناوب الحالي',
'domainSummary.upcomingMaintenance': 'الصيانات القادمة',

'onCall.primary': 'المناوب الأساسي',
'onCall.secondary': 'المناوب الاحتياطي',
'onCall.escalation': 'قواعد التصعيد',
'onCall.schedule': 'جدول المناوبات',

'maintenance.title': 'نوافذ الصيانة',
'maintenance.changeType': 'نوع التغيير',
'maintenance.standard': 'معياري',
'maintenance.emergency': 'طارئ',
'maintenance.conflictWarning': 'تحذير: تعارض مع صيانة أخرى',

'lifecycle.warranty': 'الضمان',
'lifecycle.eol': 'نهاية العمر',
'lifecycle.eos': 'نهاية الدعم',
'lifecycle.refreshPlan': 'خطة التحديث',

// English equivalents...
```

---

## Quality Acceptance Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| No localStorage for entities | Search codebase, verify only UI prefs |
| RLS policies prevent cross-domain access | Test with different user roles |
| Audit logs have correct user attribution | Verify user_name/user_email not null |
| PDF exports work with Arabic | Test PDF generation |
| Session stable with "Remember me" | Test 24h session persistence |
| Fast navigation (<2s domain switch) | Performance testing |
| All claimed features functional | No "Not integrated" labels |

---

## Implementation Order

```text
Week 1:
  Day 1-2: Security Foundation (Role migration)
  Day 3-4: EPIC A - Domain Summary
  Day 5:   EPIC B - On-Call (Part 1)

Week 2:
  Day 1-2: EPIC B - On-Call (Complete)
  Day 3-4: EPIC C - Maintenance Windows
  Day 5:   EPIC D - Asset Lifecycle

Week 3:
  Day 1-2: EPIC G - Tasks Enhancement
  Day 3-4: EPIC H - Professional Exports
  Day 5:   Bug fixes & optimization

Week 4:
  Day 1-2: EPIC E - Runbooks
  Day 3-4: EPIC F - Certificate Center
  Day 5:   EPIC I - Weekly Import

Week 5:
  Day 1-2: EPIC J - Web Apps Enhancement
  Day 3-4: EPIC K - Impact Analysis
  Day 5:   EPIC L - CSR Generator Tool
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Role migration breaks existing users | Create migration script with rollback |
| PDF font embedding increases bundle size | Lazy load font only when needed |
| On-call notifications require realtime | Use Supabase Realtime subscriptions |
| Impact analysis performance | Use indexed views/materialized queries |
