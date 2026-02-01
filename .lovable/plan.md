

# خطة تنفيذ المتطلبات المتعددة

## نظرة عامة

يتضمن هذا الطلب **6 مهام رئيسية**:

1. إضافة بيانات lifecycle للسيرفرات (warranty_end, eol_date, eos_date)
2. اختبار نوافذ الصيانة وكشف التعارضات
3. اختبار نظام المناوبات
4. اختبار صفحة ملخص النطاق
5. إصلاح ترجمة "جميع النطاقات" → "جميع الشبكات" في فلتر الشبكات
6. إضافة ميزة تغيير صلاحية الموظف (admin/employee)

---

## 1. إضافة بيانات Lifecycle للسيرفرات

### الإجراء المطلوب
تحديث بيانات السيرفرات الموجودة بإضافة قيم لحقول:
- `warranty_end` - تاريخ انتهاء الضمان
- `eol_date` - تاريخ نهاية العمر (End of Life)
- `eos_date` - تاريخ نهاية الدعم (End of Support)

### خطة التنفيذ
1. فتح صفحة السيرفرات
2. تعديل بعض السيرفرات وإضافة تواريخ مختلفة:
   - بعضها بضمان منتهي (تاريخ في الماضي)
   - بعضها بضمان قريب الانتهاء (30 يوم)
   - بعضها بـ EOL/EOS قريب (90 يوم)
3. التحقق من ظهور البيانات في صفحة Lifecycle Center

---

## 2. اختبار نوافذ الصيانة وكشف التعارضات

### الخطوات
1. إنشاء نافذة صيانة جديدة
2. التحقق من كشف التعارضات مع:
   - إجازات الموظفين المسؤولين
   - نوافذ صيانة أخرى متداخلة

### وظائف التحقق منها
- إضافة نافذة صيانة جديدة
- اختيار السيرفرات المتأثرة
- مستوى التأثير (low/medium/high/critical)
- حالة الصيانة (scheduled/in_progress/completed/cancelled)

---

## 3. اختبار نظام المناوبات

### الخطوات
1. إضافة جدول مناوبات جديد
2. تحديد نوع التدوير (يومي/أسبوعي)
3. إضافة أعضاء الفريق
4. إضافة قواعد التصعيد

---

## 4. اختبار صفحة ملخص النطاق

### الخطوات
1. الانتقال إلى صفحة Domain Summary
2. تبديل بين النطاقات
3. التحقق من تغير:
   - إجمالي السيرفرات
   - السيرفرات النشطة
   - الأدوار الحرجة
   - حالة النسخ الاحتياطي

---

## 5. إصلاح ترجمة فلتر الشبكات

### المشكلة الحالية
في صفحة السيرفرات، الفلتر الثاني (الشبكات) يستخدم `t('dashboard.allNetworks')` الذي يترجم إلى "جميع النطاقات" بدلاً من "جميع الشبكات".

```text
الفلتر الأول: جميع النطاقات ← صحيح (للدومين)
الفلتر الثاني: جميع النطاقات ← خطأ (يجب أن يكون "جميع الشبكات")
```

### الحل
تحديث الترجمة في `src/contexts/LanguageContext.tsx`:

| المفتاح | القيمة الحالية | القيمة الجديدة |
|---------|----------------|----------------|
| `dashboard.allNetworks` (AR) | جميع النطاقات | جميع الشبكات |
| `dashboard.allNetworks` (EN) | All Domains | All Networks |

### الملف المطلوب تعديله
`src/contexts/LanguageContext.tsx` - السطور 620 و 1886

---

## 6. إضافة ميزة تغيير صلاحية الموظف

### الوضع الحالي
- الأدوار مخزنة في جدول `user_roles` الآمن (منفصل عن profiles)
- يمكن تحديد الدور عند إضافة موظف جديد
- **لا يمكن** تغيير دور الموظف الحالي

### الحل المقترح
إضافة نافذة حوار جديدة لتغيير الدور مع Edge Function آمنة.

```text
العملية:
┌─────────────────────────┐
│  صفحة صلاحيات الموظفين  │
├─────────────────────────┤
│ [زر جديد: تغيير الدور]  │
│           ↓             │
│ ┌─────────────────────┐ │
│ │ Dialog: تغيير الدور │ │
│ │ ─────────────────── │ │
│ │ الموظف: أحمد محمد    │ │
│ │ الدور الحالي: موظف  │ │
│ │                      │ │
│ │ الدور الجديد:       │ │
│ │ ○ موظف              │ │
│ │ ● مدير              │ │
│ │                      │ │
│ │ [إلغاء] [حفظ]        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### التغييرات المطلوبة

#### 1. إنشاء Edge Function جديدة: `update-user-role`

```typescript
// supabase/functions/update-user-role/index.ts
// التحقق من:
// 1. المستخدم مسجل دخول
// 2. المستخدم admin (من user_roles)
// 3. تحديث الدور في user_roles
```

#### 2. تحديث صفحة EmployeePermissions.tsx

| التغيير | الوصف |
|---------|-------|
| حالة جديدة | `isRoleChangeOpen` - لفتح/إغلاق النافذة |
| حالة جديدة | `selectedNewRole` - الدور الجديد المحدد |
| دالة جديدة | `handleChangeRole()` - لتغيير الدور |
| زر جديد | في أزرار الإجراءات لكل موظف |
| نافذة حوار | لاختيار الدور الجديد |

#### 3. تحديث الترجمات

```typescript
// إضافة للعربية
'permissions.changeRole': 'تغيير الصلاحية',
'permissions.newRole': 'الصلاحية الجديدة',
'permissions.roleChanged': 'تم تغيير الصلاحية بنجاح',
'permissions.changeRoleDesc': 'اختر الصلاحية الجديدة لهذا الموظف',

// إضافة للإنجليزية
'permissions.changeRole': 'Change Role',
'permissions.newRole': 'New Role',
'permissions.roleChanged': 'Role changed successfully',
'permissions.changeRoleDesc': 'Select the new role for this employee',
```

---

## التفاصيل التقنية

### Edge Function: update-user-role

```typescript
// supabase/functions/update-user-role/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // 1. التحقق من المصادقة
  const authHeader = req.headers.get('Authorization');
  // ...
  
  // 2. التحقق من أن المتصل admin
  const { data: callerRole } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', callerUserId)
    .single();
    
  if (callerRole?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  
  // 3. تحديث الدور
  const { target_user_id, new_role } = await req.json();
  
  const { error } = await supabaseAdmin
    .from('user_roles')
    .update({ role: new_role })
    .eq('user_id', target_user_id);
    
  // 4. إرجاع النتيجة
});
```

### تحديثات EmployeePermissions.tsx

```typescript
// حالات جديدة
const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);
const [selectedNewRole, setSelectedNewRole] = useState<'admin' | 'employee'>('employee');
const [isChangingRole, setIsChangingRole] = useState(false);

// دالة تغيير الدور
const handleChangeRole = async () => {
  if (!selectedProfile || !selectedNewRole) return;
  
  setIsChangingRole(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-role`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          target_user_id: selectedProfile.user_id,
          new_role: selectedNewRole,
        }),
      }
    );
    
    if (!response.ok) throw new Error('Failed to change role');
    
    // مسح الكاش وإعادة التحميل
    sessionStorage.removeItem(`user_role_${selectedProfile.user_id}`);
    await refetchProfiles();
    
    toast({ title: 'تم بنجاح', description: t('permissions.roleChanged') });
    setIsRoleChangeOpen(false);
  } catch (error) {
    toast({ title: 'خطأ', description: 'فشل في تغيير الصلاحية', variant: 'destructive' });
  } finally {
    setIsChangingRole(false);
  }
};
```

### زر تغيير الدور في الجدول

```tsx
// إضافة زر جديد في أزرار الإجراءات
<Button
  size="sm"
  variant="ghost"
  onClick={() => {
    setSelectedProfile(profile);
    setSelectedNewRole(profile.role === 'admin' ? 'employee' : 'admin');
    setIsRoleChangeOpen(true);
  }}
  title={t('permissions.changeRole')}
>
  <UserCog className="w-4 h-4" />
</Button>
```

### نافذة حوار تغيير الدور

```tsx
<Dialog open={isRoleChangeOpen} onOpenChange={setIsRoleChangeOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('permissions.changeRole')}</DialogTitle>
      <DialogDescription>{t('permissions.changeRoleDesc')}</DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <User className="w-5 h-5" />
        <div>
          <p className="font-medium">{selectedProfile?.full_name}</p>
          <Badge>{selectedProfile?.role}</Badge>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>{t('permissions.newRole')}</Label>
        <RadioGroup value={selectedNewRole} onValueChange={setSelectedNewRole}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="employee" />
            <Label>موظف</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="admin" />
            <Label>مدير</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsRoleChangeOpen(false)}>
        {t('common.cancel')}
      </Button>
      <Button onClick={handleChangeRole} disabled={isChangingRole}>
        {t('common.save')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | التغيير |
|-------|---------|
| `src/contexts/LanguageContext.tsx` | تصحيح ترجمة `allNetworks` + إضافة ترجمات تغيير الدور |
| `src/pages/EmployeePermissions.tsx` | إضافة ميزة تغيير الدور |
| `supabase/functions/update-user-role/index.ts` | إنشاء Edge Function جديدة |

---

## ترتيب التنفيذ

| # | المهمة | الأولوية |
|---|--------|----------|
| 1 | إصلاح ترجمة "جميع الشبكات" | عالية |
| 2 | إنشاء Edge Function لتغيير الدور | عالية |
| 3 | تحديث صفحة صلاحيات الموظفين | عالية |
| 4 | اختبار الصفحات الجديدة (Browser Testing) | متوسطة |
| 5 | إضافة بيانات lifecycle للسيرفرات | متوسطة |

