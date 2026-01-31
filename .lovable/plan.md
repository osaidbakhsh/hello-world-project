
# Implementation Plan: Kanban Drag-and-Drop, Vacation Calendar, HTTPS Certs, Audit Log Fix, and Performance

## Overview

| Feature | Status | Priority |
|---------|--------|----------|
| Kanban Drag-and-Drop | Not implemented | High |
| Vacation Calendar View | Not implemented | High |
| HTTPS Certificate Upload | Not implemented | Medium |
| Audit Log User Names | Partially broken - `user_id` is NULL | High |
| Login/Performance Fixes | Needs improvements | High |

---

## 1. Kanban Drag-and-Drop for Tasks

### Current State
- `KanbanBoard.tsx` exists with columns for statuses: draft, assigned, in_progress, in_review, done
- Tasks can be clicked but not dragged
- `onStatusChange` callback exists but is never called

### Implementation

**File: `src/components/tasks/KanbanBoard.tsx`**

```text
Changes:
1. Add drag-and-drop state management using native HTML5 drag events
2. Implement onDragStart, onDragOver, onDragEnd, onDrop handlers
3. Add visual feedback during drag (opacity, drop zone highlight)
4. Call onStatusChange when dropped in new column
5. Add quick status dropdown on each task card for mobile/accessibility
6. Add "Mark Complete" and "Back to In Progress" buttons
```

**Key Implementation Details:**
- Use native HTML5 drag-and-drop API (no additional library needed)
- Add `draggable="true"` to task cards
- Store dragged task ID in state
- Highlight drop zone on dragOver
- On drop: call `onStatusChange(taskId, newStatus)`
- Add dropdown with all status options on each card

**File: `src/pages/Tasks.tsx`**

```text
Changes:
1. Implement handleStatusChange function that:
   - Updates task status via supabase
   - Logs to audit_logs with user profile ID
   - Shows toast notification
   - Optimistically updates UI
2. Pass handleStatusChange to KanbanBoard
3. Add filter persistence
```

**Database:** No schema changes needed - `task_status` column already exists

---

## 2. Vacation Calendar View

### Current State
- `Vacations.tsx` has list/table view only
- `TaskCalendar.tsx` exists with month view implementation
- Vacation data has `start_date`, `end_date`, `vacation_type`, `status`

### Implementation

**File: `src/components/vacations/VacationCalendar.tsx`** (New)

```text
Features:
1. Month view calendar (reuse pattern from TaskCalendar)
2. Each vacation spans multiple days (start_date to end_date)
3. Color coding by vacation type:
   - annual: primary/blue
   - sick: destructive/red
   - emergency: warning/orange
   - unpaid: muted/gray
4. Show employee name on hover/click
5. Navigation (prev/next month, today)
6. Legend for vacation types
```

**File: `src/pages/Vacations.tsx`**

```text
Changes:
1. Add view mode toggle: "list" | "calendar"
2. Import and render VacationCalendar when calendar mode selected
3. Keep existing filters (employee, type, status)
4. Add department filter
```

---

## 3. HTTPS Certificate Upload (Settings)

### Current State
- Settings page has tabs: general, customization, mail, ldap, ntp, templates
- No HTTPS/SSL tab exists

### Implementation

**File: `src/pages/Settings.tsx`**

```text
Changes:
1. Add new tab: "https" with Shield/Lock icon
2. Create HTTPS certificate upload section with:
   - Option A: PFX file upload with password input
   - Option B: PEM pair (cert.pem + key.pem) upload
3. Store certificate metadata in app_settings table
4. Store actual files in Supabase Storage (secure bucket)
5. Add guidance text for Docker/Reverse Proxy deployment
```

**Key Notes for Self-Hosted:**
- Certificate files stored in Supabase Storage bucket (private)
- For actual HTTPS termination in Docker:
  - Option 1: Nginx/Traefik reverse proxy (recommended)
  - Option 2: Configure Vite preview server (dev only)
- Provide in-app documentation with Docker compose examples

**New Translations:**

```typescript
ar: {
  'settings.https': 'HTTPS',
  'settings.uploadCertificate': 'رفع الشهادة',
  'settings.pfxFile': 'ملف PFX',
  'settings.pemFiles': 'ملفات PEM',
  'settings.certFile': 'ملف الشهادة (cert.pem)',
  'settings.keyFile': 'ملف المفتاح (key.pem)',
  'settings.pfxPassword': 'كلمة مرور PFX',
  'settings.httpsNote': 'ملاحظة: لتفعيل HTTPS في Docker، استخدم Nginx أو Traefik كـ Reverse Proxy',
}
```

---

## 4. Audit Log: Fix "Unknown User" Issue

### Root Cause Analysis
The `user_id` in audit_logs is `NULL` because:
1. `useServerMutations()` and `useLicenseMutations()` are called without passing `profileId`
2. Example from `Servers.tsx` line 96:
   ```typescript
   const { createServer, updateServer, deleteServer } = useServerMutations();
   // Missing: useServerMutations(profile?.id)
   ```

### Fix Strategy

**Files to Fix:**

1. `src/pages/Servers.tsx`
   ```typescript
   // Before:
   const { createServer, updateServer, deleteServer } = useServerMutations();
   
   // After:
   const { profile } = useAuth();
   const { createServer, updateServer, deleteServer } = useServerMutations(profile?.id);
   ```

2. `src/pages/Licenses.tsx` - Same pattern

3. `src/pages/Tasks.tsx` - Ensure audit logging when tasks are modified

4. Other pages with CRUD operations

**Audit Log Display Enhancement:**

**File: `src/pages/AuditLog.tsx`**

```text
Current logic (lines 277-291):
- Looks up user by: profiles.find(p => p.id === log.user_id)
- But audit_logs.user_id should match profiles.id

Issue: The lookup is correct, but user_id is NULL in the database.
Once we fix the logging, the display will work.
```

**Add user_name field to audit_logs table (optional enhancement):**
- Store `user_name` directly in audit log for historical accuracy
- Even if user is deleted, the audit log retains who did the action

---

## 5. Login Performance and Session Stability

### Current State
- Auth timeout is 20 seconds
- Safety timeout is 20 seconds
- Remember Me flag uses sessionStorage

### Improvements

**File: `src/contexts/AuthContext.tsx`**

```text
Changes:
1. Add session refresh on activity (extend session on API calls)
2. Better error handling with specific error messages
3. Add session expiry detection and toast notification
4. Cache profile in memory to avoid refetching
5. Add loading state indicator in UI
```

**File: `src/pages/Login.tsx`**

```text
Changes:
1. Show skeleton while auth is initializing
2. Better error messages for specific failures:
   - "Invalid credentials"
   - "Session expired, please login again"
   - "Network error, please check connection"
3. Faster redirect after successful login
```

**File: `src/components/auth/ProtectedRoute.tsx`**

```text
Changes:
1. Show loading skeleton instead of blank screen
2. Reduce flicker during auth state transitions
```

---

## 6. Translation Keys to Add

**File: `src/contexts/LanguageContext.tsx`**

```typescript
ar: {
  // Kanban
  'tasks.dragToMove': 'اسحب لتغيير الحالة',
  'tasks.changeStatus': 'تغيير الحالة',
  'tasks.markComplete': 'تحديد كمكتمل',
  'tasks.backToProgress': 'إرجاع للتنفيذ',
  'tasks.blocked': 'معلقة',
  
  // Vacation Calendar
  'vacations.calendarView': 'عرض التقويم',
  'vacations.listView': 'عرض القائمة',
  'vacations.filterByDepartment': 'فلترة حسب القسم',
  
  // HTTPS
  'settings.https': 'HTTPS',
  'settings.uploadCertificate': 'رفع الشهادة',
  'settings.pfxFile': 'ملف PFX',
  'settings.pemFiles': 'ملفات PEM',
  'settings.httpsEnabled': 'HTTPS مفعّل',
  'settings.httpsNote': 'لتفعيل HTTPS في Docker، استخدم Nginx/Traefik',
  
  // Auth
  'auth.sessionExpired': 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
  'auth.invalidCredentials': 'بيانات الدخول غير صحيحة',
  'auth.networkError': 'خطأ في الاتصال',
}

en: {
  // Kanban
  'tasks.dragToMove': 'Drag to change status',
  'tasks.changeStatus': 'Change Status',
  'tasks.markComplete': 'Mark Complete',
  'tasks.backToProgress': 'Back to In Progress',
  'tasks.blocked': 'Blocked',
  
  // Vacation Calendar
  'vacations.calendarView': 'Calendar View',
  'vacations.listView': 'List View',
  'vacations.filterByDepartment': 'Filter by Department',
  
  // HTTPS
  'settings.https': 'HTTPS',
  'settings.uploadCertificate': 'Upload Certificate',
  'settings.pfxFile': 'PFX File',
  'settings.pemFiles': 'PEM Files',
  'settings.httpsEnabled': 'HTTPS Enabled',
  'settings.httpsNote': 'For Docker HTTPS, use Nginx/Traefik reverse proxy',
  
  // Auth
  'auth.sessionExpired': 'Session expired, please login again',
  'auth.invalidCredentials': 'Invalid credentials',
  'auth.networkError': 'Network error',
}
```

---

## Implementation Order

### Phase 1: Critical Fixes (Audit + Auth)
```text
1. Fix audit log user_id issue in all CRUD operations
2. Improve auth performance and error handling
3. Add loading states
```

### Phase 2: Kanban Drag-and-Drop
```text
1. Update KanbanBoard.tsx with drag-and-drop
2. Add status change handler in Tasks.tsx
3. Add quick status dropdown on cards
4. Test and verify persistence
```

### Phase 3: Vacation Calendar
```text
1. Create VacationCalendar.tsx component
2. Update Vacations.tsx with view toggle
3. Add department filter
```

### Phase 4: HTTPS Settings
```text
1. Add HTTPS tab to Settings
2. Create certificate upload UI
3. Store in Supabase Storage
4. Add deployment documentation
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/tasks/KanbanBoard.tsx` | Modify - Add drag-and-drop |
| `src/pages/Tasks.tsx` | Modify - Add status change handler |
| `src/components/vacations/VacationCalendar.tsx` | Create - New calendar component |
| `src/pages/Vacations.tsx` | Modify - Add calendar view |
| `src/pages/Settings.tsx` | Modify - Add HTTPS tab |
| `src/pages/Servers.tsx` | Modify - Fix audit log user_id |
| `src/pages/Licenses.tsx` | Modify - Fix audit log user_id |
| `src/contexts/AuthContext.tsx` | Modify - Improve performance |
| `src/pages/AuditLog.tsx` | Minor - Already correct lookup |
| `src/contexts/LanguageContext.tsx` | Modify - Add translations |

---

## Technical Notes

### Drag-and-Drop Implementation
Using native HTML5 Drag and Drop API:
- `onDragStart`: Store task ID, add dragging class
- `onDragOver`: Prevent default (allow drop), highlight column
- `onDrop`: Get task ID, update status
- `onDragEnd`: Clean up dragging state

### Vacation Calendar Date Range Display
For multi-day vacations:
- Check if day falls between start_date and end_date
- Show vacation bar spanning across days in the row
- Alternative: Show badge on each day of the vacation

### HTTPS for Self-Hosted Docker
Since this is a frontend app, HTTPS should be handled at:
1. **Reverse Proxy (Recommended)**: Nginx/Traefik with mounted certificates
2. **Cloud Provider**: Let the cloud handle SSL termination

The Settings UI will:
1. Accept certificate upload
2. Store in secure storage
3. Provide deployment instructions for Docker compose

---

## Acceptance Checklist

- [ ] Drag tasks between Kanban columns and status persists
- [ ] Quick status dropdown works on task cards
- [ ] Audit log shows real user names (not "Unknown user")
- [ ] Vacation page has calendar view with colored entries
- [ ] Vacation calendar shows multi-day entries correctly
- [ ] Settings has HTTPS certificate upload section
- [ ] Login is faster with no random logouts
- [ ] Loading states shown during data fetch
- [ ] All translations added for Arabic and English
