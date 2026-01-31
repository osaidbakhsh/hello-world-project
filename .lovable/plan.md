
# Implementation Plan: IT Infrastructure Manager Enhancements

## Analysis Summary

Based on the codebase analysis, the application has a solid foundation with:
- **Kanban Board**: Already exists with drag-and-drop but needs smooth animation and touch support
- **Vacation Calendar**: Component exists (`VacationCalendar.tsx`) but not integrated into Vacations page  
- **HTTPS Settings**: Tab exists but file upload is not functional (no actual upload/storage logic)
- **Audit Log**: Shows "Unknown user" because `user_id` is sometimes NULL in the DB
- **Auth**: Has profile caching but needs performance improvements
- **i18n**: Good coverage but some hardcoded Arabic strings remain

---

## Phase 1: Tasks - Jira-like Drag & Drop Enhancements

### 1.1 Enhance KanbanBoard Component

**File: `src/components/tasks/KanbanBoard.tsx`**

```text
Current State: Has HTML5 drag-and-drop but lacks:
- Touch support for mobile
- Smooth CSS transitions during drag
- "Overdue" status auto-detection

Changes:
1. Add touch event handlers (onTouchStart, onTouchMove, onTouchEnd)
2. Add CSS transitions for smooth card movement
3. Add "overdue" column that auto-populates based on due_date < now
4. Improve drop zone visual feedback with animation
5. Add "tags" display on cards if present
6. Add "linked server" badge on cards
7. Better mobile responsiveness for columns
```

### 1.2 Update Tasks.tsx Status Change Handler

**File: `src/pages/Tasks.tsx`**

```text
Current State: Has onStatusChange but update logic needs improvement

Changes:
1. Fix dual-field update (both task_status AND status for Dashboard sync)
2. Add optimistic UI update with rollback on error
3. Add audit log entry when status changes
4. Ensure filters work correctly with new statuses
5. Keep list/calendar views synchronized with Kanban changes
```

### 1.3 Status Field Synchronization

```text
Mapping Logic:
- task_status: 'done' → status: 'completed'
- task_status: 'in_progress' → status: 'pending'
- task_status: other → status: 'pending'

This ensures Dashboard stats remain accurate.
```

---

## Phase 2: Vacations - Calendar View Integration

### 2.1 Integrate VacationCalendar Component

**File: `src/pages/Vacations.tsx`**

```text
Current State: Has viewMode toggle but calendar may not be fully working

Changes:
1. Ensure VacationCalendar component receives proper data
2. Add click handler to open vacation details
3. Add filter by department
4. Ensure color coding by vacation type is visible
5. Ensure status indicators (approved/pending/rejected) show in calendar
6. Fix any date range display issues
```

### 2.2 Vacation Calendar Component Improvements

**File: `src/components/vacations/VacationCalendar.tsx`**

```text
Current State: Exists and has basic implementation

Changes:
1. Ensure multi-day vacations span correctly
2. Add tooltip showing employee name and vacation type
3. Improve legend visibility
4. Add navigation buttons with correct RTL support
```

---

## Phase 3: Settings - HTTPS Certificate Upload

### 3.1 Create Functional Certificate Upload

**File: `src/pages/Settings.tsx`**

```text
Current State: Has UI for file inputs but no upload logic

Changes:
1. Create state for certificate files
2. Implement file upload to Supabase Storage bucket
3. Store certificate metadata in app_settings table
4. Add validation for file types (.pfx, .p12, .pem, .crt, .key)
5. Add password field validation for PFX
6. Never log private key content
7. Show current certificate status (uploaded/not uploaded)
8. Add "Remove Certificate" option for admins
```

### 3.2 Create Certificates Storage Bucket

**Database Migration:**
```sql
-- Create private bucket for certificates
-- (handled via Supabase Storage API)
```

### 3.3 Docker Guidance Enhancement

```text
Add detailed instructions panel:
1. Nginx reverse proxy example (complete)
2. Traefik example
3. Direct Kestrel/Node HTTPS setup
4. Volume mounting for persistent storage
```

---

## Phase 4: Audit Log - Show Real User Names

### 4.1 Fix Audit Log User ID Issue

**Root Cause Analysis:**
The `user_id` in audit_logs is sometimes NULL because:
1. Mutations don't always pass `profileId`
2. Some pages call hooks without the profile ID parameter

**Files to Fix:**

1. **`src/pages/Servers.tsx`** - Pass profile?.id to mutations
2. **`src/pages/Licenses.tsx`** - Pass profile?.id to mutations
3. **`src/pages/Tasks.tsx`** - Ensure audit logging includes user
4. **`src/pages/Vacations.tsx`** - Ensure audit logging includes user
5. All other CRUD operations

### 4.2 Enhance Audit Log Display

**File: `src/pages/AuditLog.tsx`**

```text
Current State: Already looks up user by profiles.find(p => p.id === log.user_id)

Changes:
1. Add email display alongside name
2. Add fallback text for missing users
3. Improve diff display for before/after data
4. Add export to PDF/Excel for audit logs
```

### 4.3 Optional: Add user_name Column

**Database Enhancement (optional):**
```sql
-- Store user_name directly in audit_logs for historical accuracy
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
```

---

## Phase 5: Performance & Session Stability

### 5.1 Auth Context Improvements

**File: `src/contexts/AuthContext.tsx`**

```text
Current State: Has caching but can be improved

Changes:
1. Increase cache TTL from 5 minutes to 15 minutes for session
2. Add debounced session refresh on API activity
3. Improve error handling with specific error messages
4. Add session expiry detection with toast notification
5. Fix "Remember me" to properly persist session
6. Add retry logic for slow networks
```

### 5.2 Protected Route Enhancement

**File: `src/components/auth/ProtectedRoute.tsx`**

```text
Changes:
1. Show skeleton layout instead of blank/spinner
2. Reduce flicker during auth state transitions
3. Add timeout handling with user feedback
```

### 5.3 Data Fetching Optimization

**File: `src/hooks/useSupabaseData.ts`**

```text
Changes:
1. Add debounced fetch for filter changes
2. Implement stale-while-revalidate pattern
3. Add pagination for large datasets (servers, tasks)
4. Memoize query results to prevent duplicate requests
```

---

## Phase 6: Language Switch Consistency (i18n)

### 6.1 Fix Remaining Hardcoded Strings

**File: `src/contexts/LanguageContext.tsx`**

```text
Add missing translations:
1. "غير محدد" → 'common.notSpecified'
2. "مرة واحدة" → 'tasks.once'
3. Form placeholders like "أدخل عنوان المهمة"
4. Confirmation dialogs like "هل أنت متأكد من حذف"
5. Error messages
6. Settings page labels
```

### 6.2 Audit All Pages for Hardcoded Text

**Pages to Check:**
- `src/pages/Tasks.tsx` - Several Arabic strings
- `src/pages/Servers.tsx` - Form labels
- `src/pages/Vacations.tsx` - Status labels
- `src/pages/Settings.tsx` - Many hardcoded labels
- `src/pages/AuditLog.tsx` - Mostly good
- `src/pages/Employees.tsx` - Some hardcoded text
- Dialog components

### 6.3 RTL/LTR Switch Verification

```text
Ensure:
1. All dir={dir} attributes are present
2. Icons flip correctly (chevrons, arrows)
3. Form layouts work in both directions
4. Tables display correctly in RTL
```

---

## Phase 7: Per-Employee Weekly Excel Upload

### 7.1 Create Task Upload Component

**File: `src/components/employees/EmployeeTaskUpload.tsx`** (New)

```text
Features:
1. Employee selector dropdown
2. File upload zone (drag & drop + click)
3. Excel parsing with validation
4. Preview table with:
   - Green rows: New tasks
   - Yellow rows: Updates
   - Red rows: Errors
5. Column mapping validation
6. Confirm import button
7. Import progress indicator
8. Summary report after import
```

### 7.2 Create Task Import Template

**Update: `src/utils/excelTemplates.ts`**

```text
Current State: downloadTaskTemplate() exists

Ensure columns match exactly:
- TaskTitle (required)
- Description
- DueDate (YYYY-MM-DD)
- Priority (Low/Medium/High/Critical)
- Status (Draft/Assigned/In Progress/In Review/Done/Blocked)
- Recurrence (None/Daily/Weekly/Monthly)
- Tags (comma separated)
- LinkedServerName (optional)
- Network/Domain (optional)
- EvidenceRequired (Yes/No)
```

### 7.3 Import Batch Tracking

**Database Migration:**
```sql
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by UUID REFERENCES profiles(id),
  entity_type TEXT NOT NULL, -- 'tasks', 'servers', etc.
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  import_data JSONB, -- Store imported IDs for rollback
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 Rollback Functionality

```text
Features:
1. Store created/updated record IDs in batch
2. Admin can view import batches
3. "Rollback" button deletes created records and reverts updates
4. Confirmation dialog before rollback
```

---

## Phase 8: Employee Profile Enrichment

### 8.1 Skills & Certifications UI

**File: `src/pages/Employees.tsx`**

```text
Current State: Shows skills/certifications badges

Changes:
1. Add edit modal for admins
2. Skill entry: name, level (Beginner/Intermediate/Expert), notes
3. Certification entry: name, vendor, issue date, expiry date, attachment URL
4. Display expiring certifications with warning
```

### 8.2 Additional Profile Fields

**File: `src/pages/EmployeePermissions.tsx`**

```text
Add to employee creation/edit form:
1. Phone (with validation)
2. Location/Office
3. Shift/On-call status
4. Manager (dropdown from other profiles)
5. Department (standardized dropdown)
```

### 8.3 Permissions Enforcement

```text
Rules:
- Only admins can edit employee profiles
- Employees can view their own profile
- Hide sensitive fields from non-admins
- Protect phone/personal data display
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/employees/EmployeeTaskUpload.tsx` | Weekly task import |
| `src/components/employees/SkillsEditor.tsx` | Skills management |
| `src/components/employees/CertificationsEditor.tsx` | Certifications management |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/KanbanBoard.tsx` | Touch support, animations, overdue column |
| `src/pages/Tasks.tsx` | Fix status sync, add audit logging |
| `src/pages/Vacations.tsx` | Fix calendar integration |
| `src/pages/Settings.tsx` | Functional certificate upload |
| `src/pages/Servers.tsx` | Fix audit user_id |
| `src/pages/Licenses.tsx` | Fix audit user_id |
| `src/pages/AuditLog.tsx` | Show email, improve diff display |
| `src/contexts/AuthContext.tsx` | Performance improvements |
| `src/components/auth/ProtectedRoute.tsx` | Skeleton loading |
| `src/hooks/useSupabaseData.ts` | Debouncing, pagination |
| `src/contexts/LanguageContext.tsx` | Add missing translations |
| `src/pages/Employees.tsx` | Profile enrichment |
| `src/pages/EmployeePermissions.tsx` | Additional fields |
| `src/utils/excelTemplates.ts` | Update task template |

---

## Database Migrations Required

1. **import_batches table** - For tracking and rollback of imports
2. **Storage bucket: certificates** - Private bucket for TLS certificates
3. **Optional: audit_logs.user_name** - Store user name for history

---

## Translation Keys to Add

```typescript
ar: {
  'common.notSpecified': 'غير محدد',
  'tasks.enterTitle': 'أدخل عنوان المهمة',
  'common.confirmDelete': 'هل أنت متأكد من الحذف؟',
  'import.uploadEmployeeTasks': 'رفع مهام الموظف',
  'import.selectEmployee': 'اختر الموظف',
  'import.parsePreview': 'معاينة البيانات',
  'import.rollback': 'التراجع',
  'import.batchHistory': 'سجل عمليات الاستيراد',
  'skills.add': 'إضافة مهارة',
  'skills.level': 'المستوى',
  'certifications.issueDate': 'تاريخ الإصدار',
  'certifications.expiryDate': 'تاريخ الانتهاء',
  'certifications.vendor': 'جهة الإصدار',
}
```

---

## Implementation Order

### Week 1: Critical Fixes
1. Fix audit log user_id in all CRUD operations
2. Fix task status synchronization (task_status ↔ status)
3. Improve auth performance and session stability

### Week 2: Drag & Drop + Calendar
1. Enhance Kanban with touch support and animations
2. Fix Vacation calendar integration
3. Test and verify all views are synchronized

### Week 3: Import/Export + HTTPS
1. Build per-employee task upload workflow
2. Add import batch tracking and rollback
3. Implement functional HTTPS certificate upload
4. Add detailed Docker guidance

### Week 4: i18n + Profile Enrichment
1. Audit and fix all hardcoded strings
2. Add skills/certifications editor
3. Add additional profile fields
4. Final testing and polish

---

## Acceptance Criteria

- [ ] Drag-and-drop works smoothly on desktop and mobile
- [ ] Task status persists after refresh and shows in Dashboard
- [ ] Vacation calendar displays entries correctly with colors
- [ ] HTTPS certificates can be uploaded and stored securely
- [ ] Audit log shows real user names (not "Unknown user")
- [ ] Login completes in under 2 seconds on LAN
- [ ] No random logouts with "Remember me" enabled
- [ ] All UI text switches correctly between Arabic and English
- [ ] Weekly task Excel upload works with preview and validation
- [ ] Import batches can be rolled back
- [ ] Employee profiles show skills and certifications
- [ ] All changes respect RLS and role-based permissions
