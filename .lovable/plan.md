

# خطة شاملة لإصلاح المشاكل وإضافة الميزات المطلوبة

---

## ملخص المشاكل والميزات

| # | المشكلة/الميزة | الأولوية |
|---|----------------|----------|
| 1 | خطأ AbortError عند رفع إجازة للموظف (أنس) | حرج |
| 2 | عنوان صفحة الإجازات يظهر translation key | حرج |
| 3 | حسابك يظهر "الموظفون" بدلاً من "مسؤول أعلى" | حرج |
| 4 | نظام Subtasks احترافي مثل Jira | رئيسي |
| 5 | إصلاح تصدير PDF | رئيسي |
| 6 | ربط السيرفر بالدومين ثم الشبكة | رئيسي |
| 7 | نظام موافقات الإجازات (موافقة تلقائية حالياً) | ثانوي |

---

## التحليل التقني المفصل

### 1. خطأ AbortError عند رفع إجازة

**السبب الجذري**: 
- عند إنشاء إجازة بدون تحديد `profile_id` للموظف العادي، يتم إرسال `null` أو `undefined`
- RLS policy في جدول `vacations` تتحقق من: `profile_id = get_my_profile_id()`
- إذا لم يكن `profile_id` موجوداً أو غير متطابق، يفشل الإدراج

**الموقع في الكود** (`src/pages/Vacations.tsx` سطر 133-134):
```typescript
const vacationData = {
  profile_id: isAdmin ? formData.profile_id : profile?.id,
  // ...
};
```

**المشكلة**: `profile?.id` قد يكون `undefined` إذا لم يتم تحميل الـ profile بشكل صحيح

**الحل**:
1. التأكد من وجود `profile.id` قبل الإرسال
2. إضافة validation واضح مع رسالة خطأ مفهومة
3. تغيير الحالة إلى `approved` تلقائياً للموظف (حسب اختيارك)

---

### 2. عنوان صفحة الإجازات

**المشكلة**: الأزرار تظهر `vacations.listView` و `vacations.calendarView` بدلاً من الترجمة

**الموقع** (`src/pages/Vacations.tsx` سطور 333-341):
```typescript
// الأزرار تحتاج ترجمة صحيحة
```

**الحل**: إضافة مفاتيح الترجمة المفقودة في `LanguageContext.tsx`:
- `vacations.listView` → "عرض قائمة" / "List View"
- `vacations.calendarView` → "عرض تقويم" / "Calendar View"

---

### 3. حسابك يظهر "الموظفون" بدلاً من "مسؤول أعلى"

**المشكلة**: في صفحة `EmployeePermissions.tsx`، نظام الفلترة يعرض الأدوار بناءً على `profile.role` من جدول profiles، لكن الصلاحية الحقيقية في `user_roles`.

**المشكلة الثانية**: عند تحديد التبويب "المسؤولون"، لا يتم فلترة `super_admin` بشكل صحيح.

**الموقع** (`src/pages/EmployeePermissions.tsx` سطر 122-127):
```typescript
const filteredProfiles = profiles.filter(profile => {
  // ...
  if (activeTab === 'admins') return matchesSearch && (profile.role === 'admin' || profile.role === 'super_admin');
  // ...
});
```

**الحل**:
1. إضافة تبويب "المسؤولون الأعلى" أو ضم `super_admin` في التبويب الحالي
2. التأكد من أن العرض في الجدول يظهر الدور الصحيح من `user_roles` وليس `profiles.role`

---

### 4. نظام Subtasks احترافي

**الهيكل الحالي**: العمود `parent_task_id` موجود في جدول `tasks`

**المتطلبات حسب اختياراتك**:
- ✅ إخفاء من اللوحة الرئيسية (الكانبان)
- ✅ عدّاد وتقدم (عرض نسبة إنجاز المهام الفرعية)
- ✅ ترتيب Drag&Drop

**التغييرات المطلوبة**:

#### أ) تحديث KanbanBoard.tsx:
```typescript
// فلترة المهام لإظهار الرئيسية فقط (بدون parent_task_id)
const mainTasks = tasks.filter(t => !t.parent_task_id);

// حساب تقدم المهام الفرعية
const getSubtaskProgress = (taskId: string) => {
  const subtasks = tasks.filter(t => t.parent_task_id === taskId);
  if (subtasks.length === 0) return null;
  const completed = subtasks.filter(s => s.status === 'completed').length;
  return { total: subtasks.length, completed, percent: Math.round((completed / subtasks.length) * 100) };
};
```

#### ب) إضافة واجهة Subtasks في Task Dialog:
- زر "إضافة مهمة فرعية"
- قائمة المهام الفرعية مع Checkbox لكل واحدة
- دعم Drag & Drop لإعادة الترتيب

#### ج) تحديث جدول tasks لإضافة عمود order_index:
```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
```

---

### 5. إصلاح تصدير PDF

**المشكلة المحتملة**: الخطوط العربية لا تُعرض بشكل صحيح

**الحل في `pdfExport.ts`**:
- استخدام تضمين الخطوط العربية
- تحديث الاتجاه RTL للجداول

**التحسينات**:
```typescript
// إضافة RTL support للـ PDF
doc.setR2L(isArabic);

// تحسين alignment للخلايا العربية
headStyles: {
  halign: isArabic ? 'right' : 'left',
  // ...
}
```

---

### 6. ربط السيرفر بالدومين ثم الشبكة

**الوضع الحالي**: السيرفر يرتبط بالشبكة مباشرة، والشبكة مرتبطة بالدومين.

**المطلوب**: عند إضافة/تعديل سيرفر:
1. اختيار الدومين أولاً
2. ثم تظهر الشبكات المرتبطة بهذا الدومين فقط

**الموقع** (`src/pages/Servers.tsx` form dialog):

**التغييرات**:
```typescript
// إضافة state للدومين المحدد في الفورم
const [selectedFormDomainId, setSelectedFormDomainId] = useState<string>('');

// فلترة الشبكات في الفورم بناءً على الدومين المحدد
const formNetworks = useMemo(() => {
  if (!selectedFormDomainId) return [];
  return allNetworks.filter(n => n.domain_id === selectedFormDomainId);
}, [allNetworks, selectedFormDomainId]);

// في الفورم: إضافة dropdown للدومين قبل الشبكة
```

---

### 7. نظام موافقات الإجازات (موافقة تلقائية)

**حسب اختيارك**: الإجازات تُصبح `approved` تلقائياً عند إنشائها من الموظف.

**التغيير في** `Vacations.tsx`:
```typescript
const vacationData = {
  // ...
  status: 'approved', // بدلاً من 'pending'
  // ...
};
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | الإجراءات |
|-------|----------|
| `src/pages/Vacations.tsx` | إصلاح AbortError + موافقة تلقائية + تصحيح profile_id |
| `src/contexts/LanguageContext.tsx` | إضافة ترجمات مفقودة (listView, calendarView) |
| `src/pages/EmployeePermissions.tsx` | إصلاح عرض الأدوار + إضافة super_admin في dropdown |
| `src/pages/Servers.tsx` | ربط الدومين بالشبكة في الفورم |
| `src/pages/Tasks.tsx` | إضافة واجهة Subtasks مع progress |
| `src/components/tasks/KanbanBoard.tsx` | إخفاء المهام الفرعية + عرض تقدم |
| `src/utils/pdfExport.ts` | تحسين دعم RTL والخطوط العربية |
| `supabase/functions/update-user-role/index.ts` | دعم super_admin بشكل كامل |

---

## تفاصيل التنفيذ

### التغييرات في Vacations.tsx

```typescript
// سطر 105-166 - تحديث handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (isSubmitting) return;
  
  if (!formData.start_date || !formData.end_date) {
    toast({ title: t('common.error'), description: t('vacations.fillRequired'), variant: 'destructive' });
    return;
  }

  // التحقق الحاسم: التأكد من وجود profile للموظف غير الأدمن
  if (!isAdmin && !profile?.id) {
    toast({ 
      title: t('common.error'), 
      description: 'لم يتم العثور على بيانات حسابك. يرجى تسجيل الخروج والدخول مجدداً.',
      variant: 'destructive' 
    });
    return;
  }

  setIsSubmitting(true);

  try {
    const vacationData = {
      profile_id: isAdmin ? formData.profile_id : profile!.id, // ! بدلاً من ?
      start_date: formData.start_date,
      end_date: formData.end_date,
      vacation_type: formData.vacation_type,
      status: 'approved', // موافقة تلقائية
      notes: formData.notes || null,
      days_count: calculateDays(formData.start_date, formData.end_date),
    };

    const { error } = await supabase.from('vacations').insert([vacationData]);
    
    if (error) throw error;
    
    toast({ title: t('common.success'), description: t('vacations.addSuccess') });
    resetForm();
    setIsDialogOpen(false);
    refetch();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      setIsSubmitting(false);
      return;
    }
    
    console.error('Vacation insert error:', error);
    toast({
      title: t('common.error'),
      description: error.message || 'فشل في إضافة الإجازة',
      variant: 'destructive',
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

### التغييرات في LanguageContext.tsx (إضافة ترجمات)

```typescript
// إضافة للمفاتيح العربية
vacations: {
  // ... existing
  listView: 'عرض قائمة',
  calendarView: 'عرض تقويم',
},

// إضافة للمفاتيح الإنجليزية
vacations: {
  // ... existing
  listView: 'List View',
  calendarView: 'Calendar View',
},
```

### التغييرات في Servers.tsx (ربط الدومين بالشبكة)

```typescript
// إضافة state جديد للدومين في الفورم
const [formDomainId, setFormDomainId] = useState<string>('');

// فلترة الشبكات في الفورم
const formNetworks = useMemo(() => {
  if (!formDomainId) return [];
  return allNetworks.filter(n => n.domain_id === formDomainId);
}, [allNetworks, formDomainId]);

// في الـ form dialog، إضافة dropdown للدومين قبل الشبكة:
<div className="space-y-2">
  <Label>{t('common.domain')}</Label>
  <Select
    value={formDomainId}
    onValueChange={(value) => {
      setFormDomainId(value);
      setFormData({ ...formData, network_id: '' }); // reset network
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="اختر الدومين أولاً" />
    </SelectTrigger>
    <SelectContent>
      {domains.map((d) => (
        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label>{t('servers.network')}</Label>
  <Select
    value={formData.network_id}
    onValueChange={(value) => setFormData({ ...formData, network_id: value })}
    disabled={!formDomainId}
  >
    <SelectTrigger>
      <SelectValue placeholder={formDomainId ? "اختر الشبكة" : "اختر الدومين أولاً"} />
    </SelectTrigger>
    <SelectContent>
      {formNetworks.map((n) => (
        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### التغييرات في KanbanBoard.tsx (Subtasks)

```typescript
// إضافة prop للمهام الفرعية
interface KanbanBoardProps {
  tasks: Task[];
  profiles: Profile[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onCloneTask?: (taskId: string) => void;
  allTasks?: Task[]; // للوصول للمهام الفرعية
}

// فلترة المهام الرئيسية فقط
const mainTasks = useMemo(() => {
  return tasks.filter(t => !t.parent_task_id);
}, [tasks]);

// حساب تقدم المهام الفرعية
const getSubtaskProgress = (taskId: string) => {
  const subtasks = allTasks?.filter(t => t.parent_task_id === taskId) || [];
  if (subtasks.length === 0) return null;
  const completed = subtasks.filter(s => 
    s.status === 'completed' || (s as any).task_status === 'done'
  ).length;
  return { 
    total: subtasks.length, 
    completed, 
    percent: Math.round((completed / subtasks.length) * 100) 
  };
};

// في الـ Card، إضافة عرض التقدم:
{(() => {
  const progress = getSubtaskProgress(task.id);
  if (!progress) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Progress value={progress.percent} className="h-1.5 flex-1" />
      <span className="text-muted-foreground">
        {progress.completed}/{progress.total}
      </span>
    </div>
  );
})()}
```

### التغييرات في Tasks.tsx (واجهة Subtasks)

```typescript
// إضافة state للمهام الفرعية
const [subtaskTitle, setSubtaskTitle] = useState('');
const [viewingTask, setViewingTask] = useState<Task | null>(null);
const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);

// دالة إضافة مهمة فرعية
const handleAddSubtask = async () => {
  if (!viewingTask || !subtaskTitle.trim()) return;
  
  try {
    const { error } = await supabase.from('tasks').insert({
      title: subtaskTitle,
      parent_task_id: viewingTask.id,
      assigned_to: viewingTask.assigned_to,
      server_id: viewingTask.server_id,
      priority: 'medium',
      status: 'pending',
      created_by: profile?.id,
    });
    
    if (error) throw error;
    
    toast({ title: t('common.success'), description: 'تم إضافة المهمة الفرعية' });
    setSubtaskTitle('');
    refetch();
  } catch (error: any) {
    toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
  }
};

// الحصول على المهام الفرعية
const getSubtasks = (taskId: string) => {
  return tasks.filter(t => t.parent_task_id === taskId);
};
```

---

## النتيجة المتوقعة

| الميزة | النتيجة |
|--------|---------|
| إجازات الموظف | تعمل بدون أخطاء + موافقة تلقائية |
| عناوين الصفحات | تظهر بالعربية بشكل صحيح |
| الصلاحيات | Super Admin يظهر بشكل صحيح + يمكنه إنشاء super_admin |
| Subtasks | نظام احترافي مع تقدم + Drag&Drop |
| PDF | يدعم العربية RTL بشكل صحيح |
| السيرفرات | ربط متسلسل: الدومين ← الشبكة ← السيرفر |

---

## ترتيب التنفيذ

1. **إصلاح Vacations.tsx** (الأهم - يحل مشكلة الموظف أنس)
2. **إضافة الترجمات المفقودة**
3. **إصلاح EmployeePermissions.tsx**
4. **تحديث Servers.tsx للربط المتسلسل**
5. **تطوير نظام Subtasks في Tasks.tsx و KanbanBoard.tsx**
6. **تحسين pdfExport.ts**

