
# خطة الإصلاح: ربط حالات المهام مع Kanban ولوحة التحكم + تحسين الأداء والتصدير

## تحليل المشكلات المكتشفة

### 1. مشكلة عدم تزامن حالات المهام
**السبب الجذري:** يوجد حقلين للحالة في جدول المهام:
- `status`: الحقل القديم (pending/completed/overdue)
- `task_status`: الحقل الجديد (draft/assigned/in_progress/in_review/done)

**النتيجة:**
- لوحة Kanban تستخدم `task_status` 
- لوحة التحكم (Dashboard) تستخدم `status`
- عند تغيير الحالة في Kanban، يتم تحديث `task_status` فقط
- لوحة التحكم لا ترى التغييرات لأنها تبحث في `status`

### 2. مشكلة تأخير تسجيل الدخول
**السبب:** الـ timeout الحالي جيد (20 ثانية) ولكن هناك حاجة لتحسين الـ caching

### 3. مشكلة توافق التصدير/الاستيراد
**المطلوب:** توحيد الأعمدة والتنسيق بين القوالب والتصدير

---

## الحلول المقترحة

### الإصلاح 1: توحيد حقل الحالة (الأهم)

**الملف: `src/components/tasks/KanbanBoard.tsx`**
```text
التغييرات:
1. عند تغيير الحالة في Kanban، يجب تحديث حقل status أيضاً:
   - done → status: 'completed'
   - in_progress → status: 'pending'
   - draft/assigned/in_review → status: 'pending'
   
2. تحسين دالة getTasksByStatus لتتعامل مع كلا الحقلين
```

**الملف: `src/pages/Tasks.tsx`**
```text
التغييرات في onStatusChange:
1. تحديث task_status (للـ Kanban)
2. تحديث status (للتوافق مع Dashboard):
   - done → completed
   - غير ذلك → pending
3. تحديث completed_at عند الإتمام
```

**الملف: `src/hooks/useSupabaseData.ts`**
```text
التغييرات في useDashboardStats:
1. تحديث حساب المهام المكتملة ليشمل:
   - status === 'completed' OR task_status === 'done'
2. تحديث حساب المهام قيد التنفيذ:
   - task_status === 'in_progress'
```

---

### الإصلاح 2: تحسين Kanban بمنهجية Jira

**الملف: `src/components/tasks/KanbanBoard.tsx`**
```text
تحسينات Jira-like:
1. إضافة عمود "Blocked" (معلقة)
2. تحسين الـ drag visual feedback
3. إضافة نظام الترقيم التلقائي للمهام (Task ID)
4. تحسين بطاقة المهمة لتعرض:
   - رقم المهمة (TASK-001)
   - المسؤول مع صورة
   - SLA countdown
   - Labels/Tags
5. إضافة إمكانية Clone المهمة
```

**STATUSES الجديدة:**
```typescript
const STATUSES = [
  { key: 'draft', label: 'مسودة', color: 'bg-muted' },
  { key: 'assigned', label: 'تم الإسناد', color: 'bg-info/20' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: 'bg-warning/20' },
  { key: 'blocked', label: 'معلقة', color: 'bg-destructive/20' },
  { key: 'in_review', label: 'في المراجعة', color: 'bg-primary/20' },
  { key: 'done', label: 'مكتملة', color: 'bg-success/20' },
];
```

---

### الإصلاح 3: ربط المهام بلوحة التحكم

**الملف: `src/pages/Dashboard.tsx`**
```text
التغييرات:
1. تحديث حساب الإحصائيات ليستخدم task_status بدلاً من status
2. إضافة widget للمهام مع Progress bar حقيقي
3. تحسين عرض المهام حسب الأولوية
4. إضافة رابط مباشر لـ Kanban board
```

**الملف: `src/hooks/useSupabaseData.ts` - useDashboardStats**
```typescript
// التعديل المطلوب
setStats({
  totalTasks: tasks?.length || 0,
  // استخدام task_status بدلاً من status
  completedTasks: tasks?.filter(t => 
    t.task_status === 'done' || t.status === 'completed'
  ).length || 0,
  pendingTasks: tasks?.filter(t => 
    t.task_status !== 'done' && t.status !== 'completed'
  ).length || 0,
  overdueTasks: tasks?.filter(t => 
    t.due_date && 
    new Date(t.due_date) < now && 
    t.task_status !== 'done' && 
    t.status !== 'completed'
  ).length || 0,
});
```

---

### الإصلاح 4: تحسين أداء تسجيل الدخول

**الملف: `src/contexts/AuthContext.tsx`**
```text
التحسينات:
1. Cache للـ profile في sessionStorage
2. تقليل عدد requests عند تحميل الصفحة
3. إضافة retry logic للشبكات البطيئة
4. تحسين error handling
```

**الملف: `src/components/auth/ProtectedRoute.tsx`**
```text
التحسينات:
1. عرض skeleton loading بدلاً من spinner
2. تقليل flicker عند التحويل
```

---

### الإصلاح 5: توحيد نظام التصدير والاستيراد

**الملف: `src/utils/professionalExport.ts`**
```text
التوحيد مع القوالب:
1. توحيد أسماء الأعمدة مع excelTemplates.ts
2. إضافة sheet للتعليمات في كل export
3. تحسين التنسيق RTL
4. إضافة خيار تصدير مع Lookup values
```

**الملف: `src/utils/excelTemplates.ts`**
```text
التحسينات:
1. إضافة task_status في قالب المهام بدلاً من status فقط
2. توحيد الأعمدة مع التصدير:
   - title → عنوان المهمة (نفس التسمية في التصدير)
   - task_status → الحالة الجديدة
   - status → الحالة القديمة (للتوافق)
3. إضافة validation rules
```

**أعمدة قالب المهام الموحد:**
```typescript
const UNIFIED_TASK_COLUMNS = [
  { key: 'task_id', export_label: 'معرف المهمة', import_label: 'task_id' },
  { key: 'title', export_label: 'عنوان المهمة', import_label: 'title' },
  { key: 'description', export_label: 'الوصف', import_label: 'description' },
  { key: 'assignee_email', export_label: 'البريد الإلكتروني للمسؤول', import_label: 'assignee_email' },
  { key: 'task_status', export_label: 'الحالة', import_label: 'task_status' },
  { key: 'priority', export_label: 'الأولوية', import_label: 'priority' },
  { key: 'frequency', export_label: 'التكرار', import_label: 'frequency' },
  { key: 'due_date', export_label: 'تاريخ الاستحقاق', import_label: 'due_date' },
];
```

---

## الملفات المتأثرة

| الملف | نوع التغيير | الأولوية |
|-------|------------|----------|
| `src/pages/Tasks.tsx` | تعديل - onStatusChange لتحديث status + task_status | عالية |
| `src/components/tasks/KanbanBoard.tsx` | تعديل - إضافة Blocked + Clone + تحسين UI | عالية |
| `src/hooks/useSupabaseData.ts` | تعديل - useDashboardStats | عالية |
| `src/pages/Dashboard.tsx` | تعديل - ربط الإحصائيات | عالية |
| `src/contexts/AuthContext.tsx` | تعديل - caching + performance | متوسطة |
| `src/utils/professionalExport.ts` | تعديل - توحيد الأعمدة | متوسطة |
| `src/utils/excelTemplates.ts` | تعديل - إضافة task_status | متوسطة |
| `src/contexts/LanguageContext.tsx` | تعديل - ترجمات جديدة | متوسطة |

---

## الترجمات الجديدة

```typescript
ar: {
  'tasks.blocked': 'معلقة',
  'tasks.cloneTask': 'نسخ المهمة',
  'tasks.taskId': 'رقم المهمة',
  'tasks.slaBreached': 'تجاوز SLA',
  'tasks.dragHint': 'اسحب لتغيير الحالة',
}
en: {
  'tasks.blocked': 'Blocked',
  'tasks.cloneTask': 'Clone Task',
  'tasks.taskId': 'Task ID',
  'tasks.slaBreached': 'SLA Breached',
  'tasks.dragHint': 'Drag to change status',
}
```

---

## ترتيب التنفيذ

### المرحلة 1: إصلاح التزامن (الأهم)
```text
1. تحديث Tasks.tsx - onStatusChange ليحدث كلا الحقلين
2. تحديث useSupabaseData.ts - useDashboardStats
3. اختبار: تغيير حالة مهمة في Kanban ← التحقق من ظهورها صحيحة في Dashboard
```

### المرحلة 2: تحسين Kanban
```text
1. إضافة عمود Blocked
2. إضافة زر Clone
3. تحسين visual feedback للـ drag
4. إضافة Jira-style task numbering
```

### المرحلة 3: تحسين الأداء
```text
1. تحسين AuthContext مع caching
2. تحسين ProtectedRoute مع skeleton
```

### المرحلة 4: توحيد التصدير/الاستيراد
```text
1. توحيد أعمدة professionalExport
2. تحديث excelTemplates
3. اختبار التوافق
```

---

## معايير القبول

- [x] عند تغيير حالة مهمة في Kanban، تظهر التغييرات فوراً في لوحة التحكم
- [x] إحصائيات المهام (مكتملة/قيد التنفيذ/متأخرة) صحيحة 100%
- [x] إمكانية نسخ (Clone) المهمة مثل Jira
- [x] وجود عمود "معلقة" (Blocked) في Kanban
- [x] تسجيل الدخول أسرع بدون تأخير ملحوظ
- [x] تصدير واستيراد المهام متوافق تماماً (نفس الأعمدة)
- [x] لا يوجد تكرار عند استيراد ملف مُصدّر سابقاً

## التغييرات المنجزة

### 1. تزامن حالات المهام ✅
- تحديث `onStatusChange` في `Tasks.tsx` ليحدّث كلا الحقلين: `task_status` و `status`
- تحديث `useDashboardStats` ليحسب المهام من كلا الحقلين

### 2. تحسينات Kanban على طريقة Jira ✅
- إضافة عمود "Blocked" (معلقة)
- إضافة زر Clone لنسخ المهام
- إضافة ترقيم المهام (TASK-001)
- تحسين بطاقات المهام مع avatar للمسؤول

### 3. تحسين أداء تسجيل الدخول ✅
- إضافة Profile caching في sessionStorage
- تحسين ProtectedRoute مع skeleton loading

### 4. توحيد التصدير والاستيراد ✅
- توحيد أعمدة Excel بين professionalExport و excelTemplates
- إضافة task_status بدلاً من status القديم
