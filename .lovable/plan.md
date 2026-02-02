

# خطة شاملة لإصلاح المشاكل وإضافة الميزات المطلوبة

---

## ملخص المشاكل المكتشفة

| # | المشكلة | الملف المتأثر | الأولوية |
|---|---------|--------------|----------|
| 1 | خطأ AbortError عند رفع إجازة للموظف (أنس) - لا يزال موجوداً | `Vacations.tsx` | حرج |
| 2 | لا يوجد نظام رصيد إجازات | جديد - تحتاج جدول جديد | رئيسي |
| 3 | `common.domain` لا يظهر بالشكل الصحيح في فورم السيرفرات | `Servers.tsx`, `LanguageContext.tsx` | متوسط |
| 4 | الجدول لا يعرض عمود "النطاق" في السيرفرات | `Servers.tsx` | متوسط |
| 5 | `common.allDomains` لا يظهر بالشكل الصحيح في التراخيص | `LanguageContext.tsx` | متوسط |
| 6 | الموظف يمكنه تصدير Excel لجميع الموظفين (مشكلة أمنية) | `Employees.tsx` | حرج |

---

## التفاصيل التقنية

### 1. خطأ AbortError عند رفع إجازة للموظف

**التحليل المعمّق**:

الكود الحالي في `Vacations.tsx` (سطر 143-155) يبدو صحيحاً:
```typescript
const vacationData = {
  profile_id: isAdmin ? formData.profile_id : profile!.id,
  // ...
  status: isAdmin ? formData.status : 'approved',
  // ...
};
```

**المشكلة الحقيقية**: 

السياسة RLS للـ `vacations` تتحقق من:
```sql
(profile_id = get_my_profile_id())
```

لكن الدالة `get_my_profile_id()` تبحث في جدول `profiles` باستخدام `auth.uid()`. إذا كان هناك أي تأخير في الـ session أو مشكلة في الربط، قد تفشل العملية.

**الحل المقترح**:

أ) إضافة تأكيد إضافي قبل الإدراج:
```typescript
// التحقق من صحة profile_id قبل الإرسال
const targetProfileId = isAdmin ? formData.profile_id : profile?.id;

if (!targetProfileId) {
  toast({
    title: t('common.error'),
    description: t('vacations.profileNotFound'),
    variant: 'destructive',
  });
  return;
}

// التأكد من أن الموظف العادي يستخدم معرفه فقط
if (!isAdmin) {
  console.log('Creating vacation for profile:', profile?.id, 'user_id:', user?.id);
}
```

ب) استخدام `.single()` بدلاً من مصفوفة في الـ insert:
```typescript
// قبل (حالياً)
await supabase.from('vacations').insert([vacationData]);

// بعد (أفضل)
await supabase.from('vacations').insert(vacationData).select().single();
```

ج) إضافة retry logic للتعامل مع أخطاء الشبكة المؤقتة.

---

### 2. نظام رصيد الإجازات

**المطلوب**:
- الموظف يرى رصيد إجازاته
- Super Admin يضيف/يعدل رصيد الإجازات للموظفين

**الحل**:

#### أ) إنشاء جدول جديد `vacation_balances`:
```sql
CREATE TABLE public.vacation_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  annual_balance integer DEFAULT 21,
  sick_balance integer DEFAULT 15,
  emergency_balance integer DEFAULT 5,
  used_annual integer DEFAULT 0,
  used_sick integer DEFAULT 0,
  used_emergency integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, year)
);

-- Enable RLS
ALTER TABLE public.vacation_balances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own balance"
ON public.vacation_balances FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());

CREATE POLICY "Super Admin can manage all balances"
ON public.vacation_balances FOR ALL
USING (is_super_admin());
```

#### ب) تحديث `Vacations.tsx`:
- إضافة عرض رصيد الإجازات للموظف في أعلى الصفحة
- التحقق من الرصيد المتاح قبل إنشاء إجازة جديدة
- خصم الأيام من الرصيد عند الموافقة

#### ج) إضافة واجهة إدارة الرصيد في `EmployeePermissions.tsx`:
```typescript
// زر لإدارة رصيد الإجازات
<Button onClick={() => openBalanceDialog(employee)}>
  إدارة الرصيد
</Button>

// Dialog لتعديل الأرصدة
<Dialog>
  <DialogContent>
    <Label>الرصيد السنوي</Label>
    <Input type="number" value={annualBalance} />
    
    <Label>الرصيد المرضي</Label>
    <Input type="number" value={sickBalance} />
    
    <Label>الرصيد الطارئ</Label>
    <Input type="number" value={emergencyBalance} />
  </DialogContent>
</Dialog>
```

---

### 3. إصلاح ترجمة `common.domain`

**المشكلة**: في `Servers.tsx` سطر 540، يُستخدم `{t('common.domain')}` لكن المفتاح غير موجود.

**الحل**: إضافة المفتاح في `LanguageContext.tsx`:

```typescript
// في الترجمات العربية
'common.domain': 'النطاق',
'common.allDomains': 'جميع النطاقات',

// في الترجمات الإنجليزية  
'common.domain': 'Domain',
'common.allDomains': 'All Domains',
```

---

### 4. إضافة عمود "النطاق" في جدول السيرفرات

**الملف**: `Servers.tsx` (سطور 971-1037)

**التغييرات**:

أ) إضافة عمود جديد في الـ header:
```typescript
<TableHead>{t('servers.name')}</TableHead>
<TableHead>{t('servers.ip')}</TableHead>
<TableHead>{t('servers.os')}</TableHead>
<TableHead>{t('servers.environment')}</TableHead>
<TableHead>Status</TableHead>
<TableHead>{t('common.domain')}</TableHead>  // جديد
<TableHead>{t('servers.network')}</TableHead>
<TableHead className="text-center">{t('common.actions')}</TableHead>
```

ب) إضافة بيانات العمود في الـ body:
```typescript
<TableCell>
  {/* الحصول على اسم الدومين من الشبكة المرتبطة */}
  {(() => {
    const network = allNetworks.find(n => n.id === server.network_id);
    const domain = domains.find(d => d.id === network?.domain_id);
    return domain?.name || '-';
  })()}
</TableCell>
```

ج) توسيط المحتوى في الخلايا:
```typescript
<TableHead className="text-center">{t('servers.name')}</TableHead>
// ... etc

<TableCell className="text-center">...</TableCell>
```

---

### 5. منع الموظف من تصدير بيانات جميع الموظفين

**الملف**: `Employees.tsx`

**التحليل**: يجب التحقق مما إذا كانت هناك وظيفة Export Excel في الصفحة ومنع الموظف غير الـ Admin من استخدامها.

**الحل**:
```typescript
// التحقق من الصلاحية قبل عرض زر التصدير
{isAdmin && (
  <Button onClick={handleExportExcel}>
    <Download className="w-4 h-4 me-2" />
    Export Excel
  </Button>
)}
```

**أو** إذا كان المقصود أن الموظف يمكنه تصدير بياناته الخاصة فقط:
```typescript
const handleExportExcel = () => {
  const dataToExport = isAdmin 
    ? filteredEmployees 
    : filteredEmployees.filter(e => e.id === currentUserProfile?.id);
  
  // ... export logic
};
```

---

### 6. تنظيم وتوسيط جدول السيرفرات

**الملف**: `Servers.tsx`

**التغييرات في الـ CSS/Classes**:

```typescript
<Table>
  <TableHeader>
    <TableRow className="text-center">
      <TableHead className="text-center">{t('servers.name')}</TableHead>
      <TableHead className="text-center">{t('servers.ip')}</TableHead>
      <TableHead className="text-center">{t('servers.os')}</TableHead>
      <TableHead className="text-center">{t('servers.environment')}</TableHead>
      <TableHead className="text-center">Status</TableHead>
      <TableHead className="text-center">{t('common.domain')}</TableHead>
      <TableHead className="text-center">{t('servers.network')}</TableHead>
      <TableHead className="text-center">{t('common.actions')}</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {sortedServers.map((server) => (
      <TableRow key={server.id}>
        <TableCell className="text-center">...</TableCell>
        {/* تكرار لجميع الخلايا */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | الإجراءات |
|-------|----------|
| `src/pages/Vacations.tsx` | إصلاح AbortError + إضافة عرض الرصيد + التحقق من الرصيد قبل الإنشاء |
| `src/pages/Servers.tsx` | إضافة عمود النطاق + توسيط الجدول |
| `src/pages/Employees.tsx` | التحقق من صلاحية التصدير |
| `src/pages/EmployeePermissions.tsx` | إضافة واجهة إدارة رصيد الإجازات للـ Super Admin |
| `src/contexts/LanguageContext.tsx` | إضافة `common.domain`, `common.allDomains` + ترجمات رصيد الإجازات |
| `supabase migration` | إنشاء جدول `vacation_balances` مع RLS |
| `src/hooks/useSupabaseData.ts` | إضافة hook لجلب رصيد الإجازات |

---

## Migration SQL المطلوبة

```sql
-- Create vacation_balances table
CREATE TABLE IF NOT EXISTS public.vacation_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  annual_balance integer DEFAULT 21,
  sick_balance integer DEFAULT 15,
  emergency_balance integer DEFAULT 5,
  used_annual integer DEFAULT 0,
  used_sick integer DEFAULT 0,
  used_emergency integer DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, year)
);

-- Enable RLS
ALTER TABLE public.vacation_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own balance"
ON public.vacation_balances FOR SELECT
USING (profile_id = get_my_profile_id() OR is_admin());

CREATE POLICY "Super Admin can manage all balances"
ON public.vacation_balances FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Function to auto-create balance for new year
CREATE OR REPLACE FUNCTION create_annual_vacation_balance()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.vacation_balances (profile_id, year)
  VALUES (NEW.id, EXTRACT(YEAR FROM CURRENT_DATE))
  ON CONFLICT (profile_id, year) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create balance when profile is created
DROP TRIGGER IF EXISTS create_vacation_balance_on_profile ON public.profiles;
CREATE TRIGGER create_vacation_balance_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_annual_vacation_balance();
```

---

## الترجمات المطلوب إضافتها

```typescript
// العربية
'common.domain': 'النطاق',
'common.allDomains': 'جميع النطاقات',
'vacations.balance': 'رصيد الإجازات',
'vacations.annualBalance': 'الرصيد السنوي',
'vacations.sickBalance': 'الرصيد المرضي',
'vacations.emergencyBalance': 'الرصيد الطارئ',
'vacations.usedDays': 'الأيام المستخدمة',
'vacations.remainingDays': 'الأيام المتبقية',
'vacations.manageBalance': 'إدارة الرصيد',
'vacations.insufficientBalance': 'رصيد الإجازات غير كافٍ',
'vacations.balanceUpdated': 'تم تحديث الرصيد بنجاح',

// الإنجليزية
'common.domain': 'Domain',
'common.allDomains': 'All Domains',
'vacations.balance': 'Vacation Balance',
'vacations.annualBalance': 'Annual Balance',
'vacations.sickBalance': 'Sick Balance',
'vacations.emergencyBalance': 'Emergency Balance',
'vacations.usedDays': 'Used Days',
'vacations.remainingDays': 'Remaining Days',
'vacations.manageBalance': 'Manage Balance',
'vacations.insufficientBalance': 'Insufficient vacation balance',
'vacations.balanceUpdated': 'Balance updated successfully',
```

---

## النتيجة المتوقعة

| الميزة | النتيجة |
|--------|---------|
| إجازات الموظف | تعمل بدون أخطاء + عرض الرصيد المتبقي |
| رصيد الإجازات | الموظف يرى رصيده + Super Admin يديره |
| ترجمة النطاق | تظهر "النطاق" بالعربية و "Domain" بالإنجليزية |
| جدول السيرفرات | يعرض عمود النطاق + محتوى موسط |
| أمان التصدير | الموظف لا يستطيع تصدير بيانات الآخرين |

---

## ترتيب التنفيذ

1. **إصلاح Vacations.tsx** - إصلاح الـ AbortError
2. **إضافة الترجمات المفقودة** في `LanguageContext.tsx`
3. **تحديث Servers.tsx** - إضافة عمود النطاق + توسيط
4. **إنشاء Migration** لجدول `vacation_balances`
5. **تحديث Vacations.tsx** - إضافة عرض الرصيد
6. **تحديث EmployeePermissions.tsx** - إدارة الرصيد
7. **تحديث Employees.tsx** - تقييد صلاحية التصدير

