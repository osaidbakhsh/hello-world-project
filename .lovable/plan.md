
# خطة شاملة لإصلاح المشاكل وإضافة الميزات المطلوبة

---

## ملخص المشاكل والميزات المطلوبة

| # | المشكلة/الميزة | الحالة |
|---|----------------|--------|
| 1 | إضافة Testing و Under Development لأدوار السيرفر | جديد |
| 2 | إضافة Super Admin في صلاحيات المستخدمين | جديد |
| 3 | إضافة فلتر Domain في صفحة التراخيص | جديد |
| 4 | خطأ `clusters_storage_type_check` في البيانات التجريبية | إصلاح |
| 5 | تعديل المهارات/الشهادات بواسطة الموظف نفسه | جديد |
| 6 | Super Admin يعدل اسم الموظف والقسم | جديد |
| 7 | نظام Sub-tasks مثل Jira | جديد |
| 8 | خطأ AbortError عند طلب إجازة للموظف | إصلاح |
| 9 | إضافة صفحات للموظف (المناوبات، الصيانة، تطبيقات الويب) | جديد |

---

## التفاصيل التقنية

### 1. إضافة Testing و Under Development لأدوار السيرفر

**الملف**: `src/pages/Servers.tsx`

**التغيير**: إضافة خيارات جديدة في dropdown أدوار السيرفر

```typescript
// سطر 756-769 - إضافة خيارات جديدة
<SelectItem value="Testing">Testing Server</SelectItem>
<SelectItem value="Development">Under Development</SelectItem>
<SelectItem value="Staging">Staging Server</SelectItem>
```

---

### 2. إضافة Super Admin في صلاحيات المستخدمين

**الملفات المتأثرة**:
- `src/pages/EmployeePermissions.tsx`
- `supabase/functions/update-user-role/index.ts`

**التغييرات**:

أ) تحديث dropdown الأدوار عند إضافة موظف جديد:
```typescript
// سطر 747-761
<SelectContent>
  <SelectItem value="employee">{t('employees.employee')}</SelectItem>
  <SelectItem value="admin">{t('employees.admin')}</SelectItem>
  {isSuperAdmin && (
    <SelectItem value="super_admin">{t('employees.superAdmin')}</SelectItem>
  )}
</SelectContent>
```

ب) تحديث Role Change Dialog ليشمل Super Admin:
```typescript
// سطر 1100-1140 - إضافة خيار super_admin
<div className={cn(...)}>
  <RadioGroupItem value="super_admin" id="role-super-admin" />
  <Label htmlFor="role-super-admin">
    <div>
      <p className="font-medium">مسؤول أعلى (Super Admin)</p>
      <p className="text-xs">صلاحيات كاملة غير مقيدة على النظام بالكامل</p>
    </div>
  </Label>
</div>
```

ج) تحديث Edge Function `update-user-role`:
```typescript
// التحقق من أن فقط super_admin يمكنه إنشاء super_admin آخر
if (new_role === 'super_admin' && callerRole !== 'super_admin') {
  return new Response(JSON.stringify({ 
    error: 'Only Super Admin can assign Super Admin role' 
  }), { status: 403 });
}
```

---

### 3. إضافة فلتر Domain في صفحة التراخيص

**الملف**: `src/pages/Licenses.tsx`

**التغييرات**:

أ) إضافة state للفلتر:
```typescript
const [domainFilter, setDomainFilter] = useState<string>('all');
```

ب) إضافة dropdown فلتر الدومين في الـ UI:
```typescript
<Select value={domainFilter} onValueChange={setDomainFilter}>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue placeholder={t('common.domain')} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">{t('common.all')}</SelectItem>
    {domains.map((d) => (
      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

ج) تحديث filteredLicenses:
```typescript
const filteredLicenses = useMemo(() => {
  return licenses.filter((license) => {
    // ... existing filters
    const matchesDomain = domainFilter === 'all' || license.domain_id === domainFilter;
    return matchesSearch && matchesStatus && matchesDomain;
  });
}, [licenses, searchQuery, statusFilter, domainFilter]);
```

---

### 4. إصلاح خطأ البيانات التجريبية (clusters_storage_type_check)

**المشكلة**: قيم `storage_type` في الـ seed data غير متوافقة مع CHECK constraint

**القيود الحالية في قاعدة البيانات**:
- `all-flash`
- `hybrid`
- `hdd`

**القيم الخاطئة في الكود**:
- `'Hybrid (SSD+HDD)'` ← يجب أن تكون `'hybrid'`
- `'All-Flash'` ← يجب أن تكون `'all-flash'`
- `'vSAN'` ← يجب أن تكون `'all-flash'` أو `'hybrid'`
- `'S2D (Storage Spaces Direct)'` ← يجب أن تكون `'hybrid'`

**الملف**: `src/utils/seedData.ts`

```typescript
// تصحيح القيم في professionalClusters
{ 
  datacenterName: 'DC-RIYADH-01', 
  name: 'OS-NUTANIX-PROD', 
  storage_type: 'hybrid',  // بدلاً من 'Hybrid (SSD+HDD)'
  ...
},
{ 
  datacenterName: 'DC-RIYADH-01', 
  name: 'OS-NUTANIX-DR', 
  storage_type: 'all-flash',  // بدلاً من 'All-Flash'
  ...
},
{ 
  datacenterName: 'DC-JEDDAH-01', 
  name: 'AT-VMWARE-PROD', 
  storage_type: 'all-flash',  // بدلاً من 'vSAN'
  ...
},
{ 
  datacenterName: 'DC-DAMMAM-01', 
  name: 'IS-HYPERV-SEC', 
  storage_type: 'hybrid',  // بدلاً من 'S2D...'
  ...
},
```

---

### 5. تعديل المهارات والشهادات بواسطة الموظف

**الملفات المتأثرة**:
- `src/pages/Employees.tsx`

**المنطق**:
- الموظف يمكنه تعديل مهاراته وشهاداته الخاصة
- Super Admin يمكنه تعديل أي موظف

**التغييرات**:

أ) إضافة state لوضع التعديل:
```typescript
const [isEditingSkills, setIsEditingSkills] = useState(false);
const [editedSkills, setEditedSkills] = useState<string[]>([]);
const [editedCertifications, setEditedCertifications] = useState<string[]>([]);
const [newSkill, setNewSkill] = useState('');
const [newCertification, setNewCertification] = useState('');
```

ب) إضافة دالة الحفظ:
```typescript
const handleSaveSkills = async () => {
  if (!selectedEmployee) return;
  
  const { error } = await supabase
    .from('profiles')
    .update({
      skills: editedSkills,
      certifications: editedCertifications,
    })
    .eq('id', selectedEmployee.id);
  
  if (!error) {
    toast({ title: 'تم الحفظ بنجاح' });
    refetchProfiles();
    setIsEditingSkills(false);
  }
};
```

ج) تحديث UI في تاب المهارات:
```typescript
<TabsContent value="skills">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>المهارات</CardTitle>
      {(canEdit) && (
        <Button size="sm" variant="outline" onClick={() => setIsEditingSkills(true)}>
          <Edit className="w-4 h-4 me-2" />
          تعديل
        </Button>
      )}
    </CardHeader>
    <CardContent>
      {isEditingSkills ? (
        // واجهة التعديل مع Input لإضافة مهارات جديدة وأزرار حذف
      ) : (
        // العرض الحالي
      )}
    </CardContent>
  </Card>
</TabsContent>
```

**شرط السماح بالتعديل**:
```typescript
const canEdit = isSuperAdmin || selectedEmployee?.id === profile?.id;
```

---

### 6. Super Admin يعدل اسم الموظف والقسم

**الملف**: `src/pages/Employees.tsx` أو `src/pages/EmployeePermissions.tsx`

**التغييرات**:

أ) إضافة dialog لتعديل بيانات الموظف:
```typescript
<Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>تعديل بيانات الموظف</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>الاسم الكامل</Label>
        <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
      </div>
      <div>
        <Label>القسم</Label>
        <Select value={editingDepartment} onValueChange={setEditingDepartment}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="IT">تكنولوجيا المعلومات</SelectItem>
            <SelectItem value="DevOps">DevOps</SelectItem>
            <SelectItem value="Security">أمن المعلومات</SelectItem>
            <SelectItem value="Network">الشبكات</SelectItem>
            <SelectItem value="Support">الدعم الفني</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <DialogFooter>
      <Button onClick={handleUpdateProfile}>حفظ التغييرات</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 7. نظام Sub-tasks مثل Jira

**SQL Migration**: إضافة جدول فرعي أو استخدام العمود الموجود `parent_task_id`

**الملفات المتأثرة**:
- `src/pages/Tasks.tsx`
- `src/components/tasks/KanbanBoard.tsx`

**التغييرات**:

أ) تحديث UI المهمة ليشمل Sub-tasks:
```typescript
// عند عرض المهمة، نضيف قسم للمهام الفرعية
<Card>
  <CardHeader>
    <CardTitle>{task.title}</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Sub-tasks section */}
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <Label>المهام الفرعية</Label>
        <Button size="sm" variant="outline" onClick={() => setAddingSubtask(true)}>
          <Plus className="w-3 h-3 me-1" />
          إضافة
        </Button>
      </div>
      {subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 p-2 border rounded">
          <Checkbox checked={sub.status === 'completed'} />
          <span>{sub.title}</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

ب) استخدام `parent_task_id` لربط المهام الفرعية:
```typescript
// عند إنشاء subtask
const { error } = await supabase.from('tasks').insert({
  title: subtaskTitle,
  parent_task_id: parentTaskId,
  assigned_to: parentTask.assigned_to,
  status: 'pending',
});
```

---

### 8. إصلاح خطأ AbortError عند طلب إجازة

**المشكلة**: الخطأ `AbortError: signal is aborted without reason`

**السبب المحتمل**: 
1. إما أن الـ component يتم إلغاء تحميله قبل إكمال الطلب
2. أو أن هناك مشكلة في RLS policy للـ vacations

**الملف**: `src/pages/Vacations.tsx`

**التغييرات**:

أ) تحديث handleSubmit لتجاهل AbortError (موجود جزئياً):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // منع الإرسال المزدوج
  if (isSubmitting) return;
  
  setIsSubmitting(true);

  // إذا كان الموظف (غير admin)، نضبط profile_id تلقائياً
  const vacationData = {
    profile_id: profile?.id, // استخدام profile_id الخاص بالمستخدم الحالي مباشرة
    start_date: formData.start_date,
    end_date: formData.end_date,
    vacation_type: formData.vacation_type,
    status: 'pending', // دائماً pending للموظف
    notes: formData.notes || null,
    days_count: calculateDays(formData.start_date, formData.end_date),
  };

  try {
    const { error } = await supabase.from('vacations').insert([vacationData]);
    if (error) throw error;
    // ...
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // تجاهل AbortError لأنه يحدث عند إغلاق الـ dialog
      return;
    }
    // ...
  }
};
```

ب) التأكد من RLS Policy:
```sql
-- التحقق من أن الموظف يمكنه إضافة إجازة لنفسه
-- السياسة الحالية: profile_id = get_my_profile_id()
-- يجب التأكد من أن get_my_profile_id() تعمل بشكل صحيح
```

---

### 9. إضافة صفحات للموظف (المناوبات، الصيانة، تطبيقات الويب)

**المنطق**:
- الموظف يرى فقط البيانات المرتبطة بالدومينات التي لديه صلاحية عليها
- المناوبات: للاطلاع فقط (read-only)
- الصيانة: يمكنه طلب نافذة صيانة جديدة
- تطبيقات الويب: للاطلاع فقط

**الملفات المتأثرة**:
- `src/components/layout/Sidebar.tsx`
- `src/pages/OnCallSchedule.tsx` (تحديث)
- `src/pages/MaintenanceWindows.tsx` (تحديث)
- `src/pages/WebApps.tsx` (تحديث)

**التغييرات في Sidebar.tsx**:
```typescript
// إزالة adminOnly من بعض العناصر أو إضافة شرط خاص
const allMenuItems = [
  // ...
  { id: 'onCall', title: 'onCallSchedule.title', icon: Clock, path: '/on-call', adminOnly: false },
  { id: 'maintenance', title: 'maintenance.title', icon: Calendar, path: '/maintenance', adminOnly: false },
  { id: 'webApps', title: 'webApps.title', icon: Globe, path: '/web-apps', adminOnly: false },
];
```

**التغييرات في OnCallSchedule.tsx**:
```typescript
// فلترة حسب الدومينات المتاحة للموظف
const visibleSchedules = useMemo(() => {
  if (isAdmin) return schedules;
  
  // جلب domain_memberships للموظف الحالي
  const myDomainIds = memberships
    .filter(m => m.profile_id === profile?.id)
    .map(m => m.domain_id);
  
  return schedules.filter(s => myDomainIds.includes(s.domain_id));
}, [schedules, memberships, profile, isAdmin]);
```

**التغييرات في MaintenanceWindows.tsx**:
```typescript
// الموظف يمكنه طلب صيانة جديدة
{!isAdmin && (
  <Button onClick={() => setIsRequestDialogOpen(true)}>
    <Plus className="w-4 h-4 me-2" />
    طلب نافذة صيانة
  </Button>
)}

// Dialog لطلب صيانة (status = 'pending')
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | الإجراءات |
|-------|----------|
| `src/pages/Servers.tsx` | إضافة Testing, Development, Staging لأدوار السيرفر |
| `src/pages/EmployeePermissions.tsx` | إضافة Super Admin في dropdown + Role Change dialog |
| `src/pages/Licenses.tsx` | إضافة فلتر Domain |
| `src/utils/seedData.ts` | إصلاح قيم storage_type |
| `src/pages/Employees.tsx` | تعديل المهارات/الشهادات + تعديل الاسم/القسم |
| `src/pages/Vacations.tsx` | إصلاح AbortError + تبسيط إضافة الإجازة للموظف |
| `src/pages/Tasks.tsx` | إضافة نظام Sub-tasks |
| `src/pages/OnCallSchedule.tsx` | فلترة حسب صلاحيات الموظف |
| `src/pages/MaintenanceWindows.tsx` | طلب صيانة للموظف |
| `src/pages/WebApps.tsx` | عرض للموظف حسب الدومين |
| `src/components/layout/Sidebar.tsx` | تحديث عرض القوائم للموظف |
| `supabase/functions/update-user-role/index.ts` | دعم super_admin |
| `src/contexts/LanguageContext.tsx` | ترجمات جديدة |

---

## النتيجة المتوقعة

| الميزة | النتيجة |
|--------|---------|
| أدوار السيرفر | Testing, Under Development, Staging متاحة |
| صلاحيات المستخدمين | Super Admin متاح في الـ dropdown |
| التراخيص | فلترة حسب الدومين |
| البيانات التجريبية | تعمل بدون أخطاء |
| المهارات/الشهادات | الموظف يعدل بياناته + Super Admin يعدل الكل |
| المهام الفرعية | نظام احترافي مثل Jira |
| الإجازات | الموظف يطلب إجازة بسهولة |
| صفحات الموظف | يرى المناوبات والصيانة وتطبيقات الويب الخاصة بدوميناته |
