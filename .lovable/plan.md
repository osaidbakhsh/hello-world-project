

# خطة التطوير الشاملة: Website Applications + ربط النطاقات + تحسينات متعددة

## ملخص الطلبات

### ✅ التوضيحات المهمة:

1. **"النطاقات" (Domains) وليس مجرد تحديث الترجمة** - الدومين هو الأساس:
   - كل سيرفر مرتبط بـ Network → والـ Network مرتبط بـ Domain
   - التراخيص مرتبطة مباشرة بـ Domain
   - الفلترة في Dashboard و Servers و Licenses تكون حسب الدومين
   - إدارة كل دومين بشكل منفصل

2. **Website Applications** - ميزة جديدة:
   - إضافة روابط مواقع (اسم + URL + أيقونة)
   - الموظف يضغط على الرابط ويفتح في تبويب جديد
   - صلاحيات: تحديد من يرى كل تطبيق حسب الدومين

3. **مهام الموظفين للمدير**:
   - في Dashboard يرى المدير جميع مهام الفريق
   - تصفية حسب الموظف أو القسم
   - تقارير بالمهام لكل موظف

4. **إصلاح إضافة الموظف**:
   - الخطأ: "Signups not allowed"
   - الحل: Edge Function مع Admin API

5. **رقم الهاتف**: يبدأ بـ `05` مباشرة (10 أرقام)

---

## التنفيذ التفصيلي

### 1️⃣ Website Applications Widget

```
src/components/dashboard/WebAppsWidget.tsx

الوظائف:
- عرض التطبيقات كـ Tiles (6-8 تطبيقات)
- كل Tile: أيقونة + اسم + وصف مختصر
- عند الضغط: window.open(url, '_blank')
- زر "إدارة" للأدمن

الصلاحيات:
- إضافة حقل visible_domains[] لجدول website_applications
- إذا null = متاح للجميع
- إذا array = متاح فقط للموظفين الذين لديهم صلاحية على هذه الدومينات
```

**Database Migration:**
```sql
ALTER TABLE website_applications 
ADD COLUMN IF NOT EXISTS visible_domains uuid[] DEFAULT NULL;
```

---

### 2️⃣ تحديث الترجمات (Networks → Domains/النطاقات)

```typescript
// src/contexts/LanguageContext.tsx
ar: {
  'nav.networks': 'النطاقات',
  'nav.domains': 'النطاقات', 
  'nav.webApps': 'تطبيقات الويب',
  'dashboard.networks': 'النطاقات',
  'dashboard.allNetworks': 'جميع النطاقات',
  'dashboard.domains': 'النطاقات',
  'dashboard.allDomains': 'جميع النطاقات',
  'dashboard.myTasks': 'مهامي',
  'dashboard.teamTasks': 'مهام الفريق',
  'webApps.title': 'تطبيقات الويب',
  'webApps.add': 'إضافة تطبيق',
  'webApps.manage': 'إدارة التطبيقات',
  'webApps.openLink': 'فتح الرابط',
}

en: {
  'nav.networks': 'Domains',
  'nav.domains': 'Domains',
  'nav.webApps': 'Web Apps',
  'dashboard.networks': 'Domains',
  'dashboard.allNetworks': 'All Domains',
  'dashboard.domains': 'Domains',
  'dashboard.allDomains': 'All Domains',
  'dashboard.myTasks': 'My Tasks',
  'dashboard.teamTasks': 'Team Tasks',
  'webApps.title': 'Web Applications',
  'webApps.add': 'Add Application',
  'webApps.manage': 'Manage Apps',
  'webApps.openLink': 'Open Link',
}
```

---

### 3️⃣ ربط السيرفرات والتراخيص بالدومين

**الوضع الحالي (صحيح في Database):**
```
Domain → Networks → Servers
Domain → Licenses
```

**التحسين المطلوب في الواجهة:**

**صفحة Servers.tsx:**
- فلتر Domain أولاً (الرئيسي)
- فلتر Network ثانياً (يعتمد على الدومين المختار)
- عند اختيار Domain → يظهر فقط سيرفرات هذا الدومين

**صفحة Licenses.tsx:**
- إضافة فلتر Domain 
- عند الاختيار → يظهر فقط تراخيص هذا الدومين

**صفحة Dashboard.tsx:**
- فلتر Domain يؤثر على جميع الإحصائيات
- السيرفرات، التراخيص، المهام كلها مفلترة حسب الدومين

---

### 4️⃣ مهام الفريق للمدير في Dashboard

```tsx
// src/pages/Dashboard.tsx - إضافات

// فلتر نوع المهام
const [taskViewMode, setTaskViewMode] = useState<'my' | 'team' | 'all'>('my');

// جلب المهام مع اسم الموظف
const { data: tasks } = useTasks();
const { data: profiles } = useProfiles();

// عرض المهام حسب الفلتر
const displayedTasks = useMemo(() => {
  if (taskViewMode === 'my') {
    return tasks.filter(t => t.assigned_to === profile?.id);
  }
  if (taskViewMode === 'team' && isAdmin) {
    return tasks; // المدير يرى كل المهام
  }
  return tasks;
}, [tasks, taskViewMode, profile, isAdmin]);

// إظهار اسم الموظف في كل مهمة
const getEmployeeName = (profileId: string) => {
  return profiles.find(p => p.id === profileId)?.full_name || 'غير محدد';
};
```

---

### 5️⃣ Edge Function لإضافة الموظفين

```typescript
// supabase/functions/create-employee/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: corsHeaders 
      })
    }

    // Check if caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        status: 403, headers: corsHeaders 
      })
    }

    const { email, password, full_name, department, position, phone, role } = await req.json()

    // Create user with admin privileges
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name, role }
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { 
        status: 400, headers: corsHeaders 
      })
    }

    // Update profile with additional info
    if (newUser.user) {
      await supabaseAdmin.from('profiles').update({
        department, 
        position, 
        phone
      }).eq('user_id', newUser.user.id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUser.user?.id 
    }), { headers: corsHeaders })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: corsHeaders 
    })
  }
})
```

---

### 6️⃣ تعديل حقل رقم الهاتف

```tsx
// src/pages/EmployeePermissions.tsx

<div className="space-y-2">
  <Label>رقم الهاتف</Label>
  <Input
    value={newEmployeeForm.phone}
    onChange={(e) => {
      // Accept only numbers, max 10 digits, must start with 05
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 10) value = value.slice(0, 10);
      setNewEmployeeForm({ ...newEmployeeForm, phone: value });
    }}
    placeholder="05x xxx xxxx"
    dir="ltr"
    className="text-left font-mono"
    maxLength={10}
  />
  <p className="text-xs text-muted-foreground">مثال: 0512345678</p>
</div>
```

---

## الملفات المطلوب إنشاؤها/تعديلها

```
إنشاء ملفات جديدة:
├── supabase/functions/create-employee/index.ts
├── src/components/dashboard/WebAppsWidget.tsx
├── src/pages/WebApps.tsx (صفحة إدارة التطبيقات)

تعديل ملفات موجودة:
├── src/contexts/LanguageContext.tsx (الترجمات)
├── src/pages/Dashboard.tsx (WebApps Widget + Team Tasks)
├── src/pages/Servers.tsx (فلتر Domain أولاً)
├── src/pages/Licenses.tsx (فلتر Domain)
├── src/pages/EmployeePermissions.tsx (Edge Function + Phone)
├── src/components/layout/Sidebar.tsx (رابط Web Apps)
├── src/App.tsx (مسار Web Apps)
├── src/hooks/useSupabaseData.ts (hooks جديدة)

Database Migration:
└── visible_domains column for website_applications
```

---

## التحسينات الإضافية المقترحة

### 🎨 تحسينات الواجهة:
1. **Dark Mode Toggle** - زر تبديل في Header/Settings
2. **Skeleton Screens** - تحميل سلس للجداول
3. **Empty States** - رسائل واضحة عند عدم وجود بيانات
4. **Toast Notifications** - إشعارات للعمليات الناجحة/الفاشلة

### 📊 تحسينات Dashboard:
1. **Recharts Integration** - رسوم بيانية تفاعلية:
   - Tasks by Status (Pie Chart)
   - Servers by Domain (Bar Chart)
   - Licenses Expiry Timeline (Area Chart)
2. **Recent Activity Widget** - آخر التغييرات من Audit Log
3. **Server Health Summary** - Online/Offline/Unknown
4. **Quick Actions** - أزرار سريعة للإضافة

### 🔔 نظام الإشعارات:
1. **License Expiry Alerts** - 30/14/7 أيام قبل الانتهاء
2. **Overdue Tasks** - المهام المتأخرة
3. **Notification Badge** - في Sidebar
4. **Notification Center** - قائمة الإشعارات

### 📑 التقارير:
1. **PDF Export** - تقارير للطباعة
2. **Server Inventory Report** - حسب Domain
3. **License Status Report** - المنتهية والقريبة
4. **Employee Performance** - المهام المنجزة/المتأخرة

### 💾 Backup & Restore:
1. **Full Data Export** - JSON/Excel
2. **Data Restore** - استعادة من نسخة
3. **Admin-only Access** - في Settings

### 🔐 أمان إضافي:
1. **Session Timeout** - انتهاء الجلسة بعد فترة
2. **Activity Logging** - تسجيل كل العمليات
3. **IP Tracking** - في Audit Log

---

## ترتيب التنفيذ

| الخطوة | المهمة | الأولوية |
|--------|--------|----------|
| 1 | Edge Function لإضافة الموظفين | 🔴 Critical |
| 2 | تحديث EmployeePermissions لاستخدام Edge Function | 🔴 Critical |
| 3 | تحديث الترجمات (Networks → Domains) | 🟡 High |
| 4 | إضافة فلتر Domain في Licenses | 🟡 High |
| 5 | WebAppsWidget للـ Dashboard | 🟡 High |
| 6 | صفحة إدارة Web Apps | 🟢 Medium |
| 7 | Team Tasks في Dashboard | 🟢 Medium |
| 8 | تعديل رقم الهاتف | 🟢 Medium |
| 9 | Recharts في Dashboard | 🔵 Optional |
| 10 | PDF Reports | 🔵 Optional |

---

## النتيجة المتوقعة

بعد التنفيذ:

✅ **إضافة موظف تعمل** - عبر Edge Function مع Admin API
✅ **Website Applications** - روابط سريعة مع صلاحيات
✅ **النطاقات كأساس** - كل شيء مفلتر حسب Domain
✅ **مهام الفريق** - المدير يرى كل المهام
✅ **رقم الهاتف** - صيغة 05xxxxxxxx
✅ **الترجمات محدثة** - Networks → Domains
✅ **Dashboard محسّن** - charts + widgets

