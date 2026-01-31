
# خطة الإصلاحات والتحسينات الشاملة

## ملخص المشاكل المكتشفة

| # | المشكلة | السبب | الأولوية |
|---|---------|-------|----------|
| 1 | خطأ "AbortError" عند رفع الإجازة | مشكلة في إلغاء الـ request أو timeout | 🔴 Critical |
| 2 | صفحة التقارير فارغة | تستخدم `useLocalStorage` بدلاً من `useSupabaseData` | 🔴 Critical |
| 3 | عدد السيرفرات والرخص = 0 في التقارير | نفس المشكلة - مصدر بيانات خاطئ | 🔴 Critical |
| 4 | المهام تظهر واحدة فقط | البيانات من localStorage فارغة | 🔴 Critical |
| 5 | اللغة لا تتغير بالكامل | نصوص hardcoded غير مترجمة | 🟡 Medium |
| 6 | لا يوجد فلتر دومين في التقارير | غير مطبق | 🟡 Medium |
| 7 | ترتيب الخانات | غير مطبق | 🟢 Feature |

---

## 1️⃣ إصلاح خطأ "AbortError" في الإجازات

**الملف:** `src/pages/Vacations.tsx`

**المشكلة:** عند إرسال النموذج، يتم إلغاء الـ request بسبب:
- Dialog يُغلق قبل اكتمال الـ request
- أو React strict mode يُعيد render

**الإصلاح:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // إضافة loading state
  setIsSubmitting(true);
  
  if (!formData.start_date || !formData.end_date) {
    toast({
      title: t('common.error'),
      description: 'يرجى ملء جميع الحقول المطلوبة',
      variant: 'destructive',
    });
    setIsSubmitting(false);
    return;
  }

  // التحقق من اختيار موظف للأدمن
  if (isAdmin && !formData.profile_id) {
    toast({
      title: t('common.error'),
      description: 'يرجى اختيار الموظف',
      variant: 'destructive',
    });
    setIsSubmitting(false);
    return;
  }

  try {
    const vacationData = {
      profile_id: isAdmin ? formData.profile_id : profile?.id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      vacation_type: formData.vacation_type,
      status: isAdmin ? formData.status : 'pending',
      notes: formData.notes || null,
      days_count: calculateDays(formData.start_date, formData.end_date),
    };

    const { error } = await supabase.from('vacations').insert([vacationData]);
    
    if (error) throw error;
    
    toast({ title: t('common.success'), description: 'تم إضافة الإجازة بنجاح' });
    resetForm();
    setIsDialogOpen(false);
    refetch();
  } catch (error: any) {
    // تجاهل AbortError
    if (error.name === 'AbortError') return;
    
    toast({
      title: t('common.error'),
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

**إضافة:**
- `isSubmitting` state لمنع الضغط المتكرر
- تعطيل زر الحفظ أثناء الإرسال
- تجاهل أخطاء AbortError

---

## 2️⃣ إصلاح صفحة التقارير (المشكلة الرئيسية)

**الملف:** `src/pages/Reports.tsx`

**المشكلة الجذرية:**
```typescript
// ❌ الكود الحالي - يستخدم localStorage (فارغ!)
import { useServers, useLicenses, useEmployees, useTasks, useNetworks } from '@/hooks/useLocalStorage';
```

**الإصلاح - استخدام Supabase:**
```typescript
// ✅ الكود الصحيح
import { 
  useServers, 
  useLicenses, 
  useTasks, 
  useProfiles, 
  useNetworks, 
  useDomains 
} from '@/hooks/useSupabaseData';
```

**التغييرات المطلوبة:**

### أ. تحديث الـ imports
```typescript
import { 
  useServers, 
  useLicenses, 
  useTasks, 
  useProfiles, 
  useNetworks, 
  useDomains 
} from '@/hooks/useSupabaseData';
```

### ب. تحديث استخدام الـ hooks
```typescript
const { data: servers } = useServers();
const { data: licenses } = useLicenses();
const { data: profiles } = useProfiles(); // بدلاً من employees
const { data: tasks } = useTasks();
const { data: networks } = useNetworks();
const { data: domains } = useDomains();
```

### ج. إضافة فلتر الدومين
```typescript
const [selectedDomainId, setSelectedDomainId] = useState<string>('');

// فلترة البيانات حسب الدومين
const filteredServers = useMemo(() => {
  if (!selectedDomainId) return servers;
  const domainNetworks = networks.filter(n => n.domain_id === selectedDomainId);
  const networkIds = domainNetworks.map(n => n.id);
  return servers.filter(s => networkIds.includes(s.network_id));
}, [servers, networks, selectedDomainId]);

const filteredLicenses = useMemo(() => {
  if (!selectedDomainId) return licenses;
  return licenses.filter(l => l.domain_id === selectedDomainId);
}, [licenses, selectedDomainId]);
```

### د. تحديث دوال التصدير لتستخدم بنية البيانات الصحيحة
```typescript
// تحديث exportReport لتتوافق مع بنية Supabase
const exportReport = (type: string) => {
  let data: any[] = [];
  let filename = '';

  switch (type) {
    case 'servers':
      data = filteredServers.map((s) => ({
        الاسم: s.name,
        'عنوان IP': s.ip_address,
        'نظام التشغيل': s.operating_system,
        البيئة: t(`env.${s.environment}`),
        الحالة: s.status === 'active' ? 'نشط' : 'غير نشط',
        المسؤول: s.responsible_user,
        الشبكة: networks.find(n => n.id === s.network_id)?.name || '',
        ملاحظات: s.notes,
      }));
      filename = 'servers-report.xlsx';
      break;
    case 'licenses':
      data = filteredLicenses.map((l) => ({
        الاسم: l.name,
        المورد: l.vendor,
        'مفتاح الترخيص': l.license_key,
        'تاريخ الشراء': l.purchase_date,
        'تاريخ الانتهاء': l.expiry_date,
        التكلفة: l.cost,
        الكمية: l.quantity,
        الحالة: l.status,
      }));
      filename = 'licenses-report.xlsx';
      break;
    case 'employees':
      data = profiles.map((e) => ({
        الاسم: e.full_name,
        المنصب: e.position,
        'البريد الإلكتروني': e.email,
        القسم: e.department,
        الدور: e.role === 'admin' ? 'مدير' : 'موظف',
      }));
      filename = 'employees-report.xlsx';
      break;
    case 'tasks':
      data = tasks.map((t) => ({
        العنوان: t.title,
        الوصف: t.description,
        المسؤول: profiles.find(p => p.id === t.assigned_to)?.full_name || '',
        التكرار: t.frequency,
        'تاريخ الاستحقاق': t.due_date,
        الحالة: t(`tasks.${t.status}`),
        الأولوية: t.priority,
      }));
      filename = 'tasks-report.xlsx';
      break;
    default:
      return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type);
  XLSX.writeFile(wb, filename);
  toast({ title: t('common.success'), description: `تم تصدير ${t(`nav.${type}`)}` });
};
```

### هـ. إضافة واجهة فلتر الدومين
```tsx
{/* Domain Filter */}
<Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder={t('dashboard.allDomains')} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">جميع النطاقات</SelectItem>
    {domains.map((d) => (
      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 3️⃣ إصلاح الترجمة غير المكتملة

**الملف:** `src/pages/Reports.tsx`

**النصوص الـ Hardcoded التي تحتاج ترجمة:**
```typescript
// ❌ النصوص الحالية
"Export Full Report"
"Infrastructure Summary"
"records"
"Report"
"Export"
"Servers by Environment"
"Tasks Status"

// ✅ استخدام t()
t('reports.exportFull')
t('reports.infrastructureSummary')
t('reports.records')
t('reports.report')
t('common.export')
t('reports.serversByEnv')
t('reports.tasksStatus')
```

**إضافة الترجمات في `LanguageContext.tsx`:**
```typescript
ar: {
  // Reports
  'reports.exportFull': 'تصدير التقرير الكامل',
  'reports.infrastructureSummary': 'ملخص البنية التحتية',
  'reports.records': 'سجل',
  'reports.report': 'تقرير',
  'reports.serversByEnv': 'السيرفرات حسب البيئة',
  'reports.tasksStatus': 'حالة المهام',
  'reports.selectDomain': 'اختر النطاق',
  'reports.allDomains': 'جميع النطاقات',
},
en: {
  'reports.exportFull': 'Export Full Report',
  'reports.infrastructureSummary': 'Infrastructure Summary',
  'reports.records': 'records',
  'reports.report': 'Report',
  'reports.serversByEnv': 'Servers by Environment',
  'reports.tasksStatus': 'Tasks Status',
  'reports.selectDomain': 'Select Domain',
  'reports.allDomains': 'All Domains',
}
```

---

## 4️⃣ إضافة خانة ترتيب الأقسام في الإعدادات

**ملف جديد:** `src/components/settings/SectionOrderSettings.tsx`

**الفكرة:**
- قائمة بأقسام Dashboard قابلة للترتيب
- أزرار ⬆️⬇️ لتحريك كل قسم
- حفظ الترتيب في `app_settings`

```tsx
import React, { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, GripVertical, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Section {
  id: string;
  name: string;
  enabled: boolean;
}

const defaultSections: Section[] = [
  { id: 'stats', name: 'الإحصائيات', enabled: true },
  { id: 'webapps', name: 'تطبيقات الويب', enabled: true },
  { id: 'tasks', name: 'المهام', enabled: true },
  { id: 'progress', name: 'نسبة الإنجاز', enabled: true },
];

const SectionOrderSettings: React.FC = () => {
  const { getSetting, updateSetting } = useAppSettings();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(defaultSections);

  useEffect(() => {
    const loadOrder = async () => {
      const saved = await getSetting('dashboard_order');
      if (saved) {
        try {
          setSections(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse dashboard order');
        }
      }
    };
    loadOrder();
  }, [getSetting]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    
    [newSections[index], newSections[targetIndex]] = 
    [newSections[targetIndex], newSections[index]];
    
    setSections(newSections);
  };

  const handleSave = async () => {
    const success = await updateSetting('dashboard_order', JSON.stringify(sections));
    if (success) {
      toast({ title: 'تم الحفظ', description: 'تم حفظ ترتيب الأقسام' });
    } else {
      toast({ title: 'خطأ', description: 'فشل حفظ الترتيب', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" />
          ترتيب أقسام لوحة التحكم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sections.map((section, index) => (
            <div 
              key={section.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">{section.name}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} className="w-full">
          حفظ الترتيب
        </Button>
      </CardContent>
    </Card>
  );
};

export default SectionOrderSettings;
```

**تحديث Settings.tsx:**
- إضافة تبويب جديد "التخصيص" أو دمجه في "عام"
- عرض `SectionOrderSettings` component

---

## 5️⃣ تحسينات إضافية للموظفين

### أ. لوحة تحكم الموظف الشخصية
- عرض مهامه المسندة
- عرض إجازاته المعتمدة والمعلقة
- عرض تقاريره المرفوعة

### ب. إشعارات تلقائية
- عند اقتراب انتهاء ترخيص
- عند تأخر مهمة
- عند الموافقة/رفض إجازة

### ج. تقرير أداء الموظف
- نسبة إنجاز المهام
- عدد الإجازات المستخدمة
- التقارير المرفوعة

---

## الملفات المطلوب تعديلها

| الملف | التغيير | الأولوية |
|-------|---------|----------|
| `src/pages/Reports.tsx` | تحويل من localStorage إلى Supabase + فلتر دومين | 🔴 Critical |
| `src/pages/Vacations.tsx` | إصلاح AbortError + إضافة validation | 🔴 Critical |
| `src/contexts/LanguageContext.tsx` | إضافة ترجمات التقارير | 🟡 Medium |
| `src/pages/Settings.tsx` | إضافة قسم ترتيب الخانات | 🟢 Feature |
| `src/components/settings/SectionOrderSettings.tsx` | إنشاء جديد | 🟢 Feature |

---

## ترتيب التنفيذ

1. **إصلاح صفحة التقارير** - تحويل إلى Supabase (الأهم)
2. **إصلاح خطأ الإجازات** - AbortError
3. **إضافة فلتر الدومين** للتقارير
4. **إكمال الترجمات** الناقصة
5. **إضافة ترتيب الخانات** في الإعدادات
6. **تحسينات إضافية** (اختياري)

---

## النتيجة المتوقعة

بعد التنفيذ:
- ✅ صفحة التقارير تعرض البيانات الفعلية من Supabase
- ✅ إضافة الإجازات تعمل بدون أخطاء
- ✅ فلتر الدومين يعمل في التقارير
- ✅ جميع النصوص تتغير عند تغيير اللغة
- ✅ إمكانية ترتيب أقسام لوحة التحكم
- ✅ تصدير التقارير يعمل بشكل صحيح
