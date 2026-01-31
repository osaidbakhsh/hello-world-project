

# خطة تطوير شاملة: نظام CMDB لإدارة البنية التحتية (Offline IT Infrastructure)

## ملخص المشكلات الحالية والحلول المقترحة

### 🚨 المشكلة الجذرية: تضارب مصادر البيانات (CRITICAL)

**الوضع الحالي:**
- صفحات `Servers.tsx` و `Employees.tsx` و `Licenses.tsx` تستخدم `localStorage` 
- صفحات `Networks.tsx` و `Dashboard.tsx` و `EmployeePermissions.tsx` تستخدم Supabase
- هذا يسبب عدم تزامن البيانات بين المستخدمين وفقدانها عند تغيير الجهاز

**الحل:**
توحيد جميع الصفحات لاستخدام Supabase كمصدر وحيد للبيانات

---

## مخطط التنفيذ التفصيلي

### المرحلة 1: توحيد مصادر البيانات (الأساس) ⚡

#### 1.1 تحويل صفحة Servers
- إزالة `useServers` من `useLocalStorage`
- استخدام `useServers` من `useSupabaseData.ts` 
- ربط السيرفرات بـ Networks و Domains
- تفعيل فلترة السيرفرات حسب Domain/Network

#### 1.2 تحويل صفحة Employees
- دمج Employees مع profiles الموجودة في Supabase
- صفحة الموظفين تعرض profiles من قاعدة البيانات
- نقل إضافة الموظف وLDAP import لصفحة الموظفين
- الموظف المضاف يظهر تلقائياً في صفحة الصلاحيات

#### 1.3 تحويل صفحة Licenses
- استخدام `useLicenses` من Supabase بدلاً من localStorage
- ربط الترخيص بـ Domain و Server

---

### المرحلة 2: إنشاء بيانات تجريبية (Seed Data)

#### جداول البيانات التجريبية:
```
Domains:
├── osaidtest1.com (الدومين الأول)
├── osaidtest2.com (الدومين الثاني)  
└── osaidtest3.com (الدومين الثالث)

Networks (لكل Domain):
├── LAN (10.0.x.0/24)
├── DMZ (172.16.x.0/24)
└── MGMT (192.168.x.0/24)

Servers:
├── DC01, DC02 (Domain Controllers)
├── CA01 (Certificate Authority)
├── DHCP01 (DHCP Server)
├── FILESERVER01
├── WEB-DEV-01, WEB-PROD-01
└── DB-DEV-01, DB-PROD-01

Employees (Profiles):
├── Admin User (role: admin)
├── IT Staff 1 (role: employee)
└── IT Staff 2 (role: employee)

Tasks:
├── مهام صيانة يومية
├── تحديثات أسبوعية
└── مراجعات شهرية

Licenses:
├── Windows Server (منتهية قريباً)
├── Microsoft 365 (نشطة)
└── VMware vSphere (منتهية)
```

---

### المرحلة 3: ميزات جديدة

#### 3.1 Website Applications (روابط سريعة)
```sql
CREATE TABLE website_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  icon TEXT,
  description TEXT,
  domain_id UUID REFERENCES domains(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- ويدجت في Dashboard يعرض 6-8 تطبيقات كـ tiles
- عند النقر يفتح الرابط في تبويب جديد
- الأدمن يمكنه إضافة/تعديل/حذف الروابط

#### 3.2 نظام الإشعارات (Notifications)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT, -- 'license_expiring', 'task_overdue', 'maintenance'
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Badge إشعارات في Sidebar
- ويدجت تنبيهات في Dashboard
- إشعارات تلقائية عند:
  - اقتراب انتهاء التراخيص (30/14/7 أيام)
  - تأخر المهام
  - مواعيد الصيانة

#### 3.3 Audit Log (سجل التغييرات)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout'
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- صفحة Audit Log جديدة
- عرض "Recent Activity" في Dashboard
- تسجيل تلقائي عبر Trigger functions

---

### المرحلة 4: تحسينات الواجهة

#### 4.1 تحسين Dashboard
- إضافة رسوم بيانية تفاعلية (Recharts):
  - Tasks by Status (Pie Chart)
  - Servers by Domain (Bar Chart)  
  - Licenses Expiry Timeline (Line Chart)
- ويدجت "Recent Activity" من Audit Log
- ويدجت "Server Health" (حالة السيرفرات)
- ويدجت "Website Applications"

#### 4.2 تحسين تجربة تسجيل الدخول
- إضافة "Remember me" checkbox
- تخزين الجلسة لفترة أطول (30 يوم مع remember me)
- حل مشكلة loops/flicker عند تحميل الملف الشخصي
- إظهار Spinner واضح أثناء التحميل

#### 4.3 Dark Mode / Light Mode Toggle
- إضافة زر تبديل في Settings وفي Navbar
- حفظ التفضيل في localStorage

#### 4.4 تحسين Loading States
- Skeleton screens للجداول والبطاقات
- Empty states واضحة مع أيقونات
- Error toasts مفصلة

---

### المرحلة 5: التقارير والتصدير

#### 5.1 تقارير PDF احترافية
- تقرير جرد السيرفرات (حسب Domain/Network)
- تقرير التراخيص المنتهية
- تقرير حالة المهام
- تقرير أداء الموظفين (المهام المنجزة/المتأخرة)

#### 5.2 تحسين Excel Import/Export
- استيراد السيرفرات مع ربطها بـ Domain/Network
- استيراد الموظفين
- معاينة البيانات قبل الاستيراد
- تنبيهات الأخطاء التفصيلية

---

### المرحلة 6: النسخ الاحتياطي والاستعادة

#### 6.1 Backup & Restore
- تصدير كامل للبيانات (JSON/SQL)
- استعادة البيانات من نسخة احتياطية
- قسم خاص في Settings للأدمن

---

## التفاصيل التقنية

### الملفات التي سيتم تعديلها:

```
src/pages/
├── Servers.tsx          → تحويل لـ Supabase + فلاتر Domain/Network
├── Employees.tsx        → تحويل لـ Supabase + نقل Add Employee هنا
├── Licenses.tsx         → تحويل لـ Supabase
├── Dashboard.tsx        → إضافة charts + widgets جديدة
├── EmployeePermissions.tsx → تبسيط (employees تُجلب من Employees page)
├── AuditLog.tsx         → صفحة جديدة
├── Login.tsx            → إضافة Remember Me
└── Settings.tsx         → إضافة Backup/Restore + Dark Mode

src/hooks/
├── useSupabaseData.ts   → إضافة hooks جديدة
├── useNotifications.ts  → جديد
└── useAuditLog.ts       → جديد

src/components/
├── dashboard/
│   ├── ChartsWidget.tsx → جديد
│   ├── WebAppsWidget.tsx → جديد
│   └── AlertsWidget.tsx → جديد
├── layout/
│   ├── Sidebar.tsx      → إضافة notification badge
│   └── ThemeToggle.tsx  → جديد
└── notifications/
    └── NotificationCenter.tsx → جديد
```

### Database Migrations:

```sql
-- 1. Website Applications table
-- 2. Notifications table
-- 3. Audit Logs table
-- 4. Triggers for audit logging
-- 5. Seed data for demo
```

---

## ترتيب التنفيذ (Priority Order)

| المرحلة | الأولوية | الوقت المقدر |
|---------|----------|--------------|
| توحيد مصادر البيانات | 🔴 حرجة | أولاً |
| Seed Data | 🔴 حرجة | مع المرحلة 1 |
| تحسين Login | 🟡 عالية | ثانياً |
| Website Applications | 🟢 متوسطة | ثالثاً |
| Notifications | 🟢 متوسطة | رابعاً |
| Audit Log | 🟢 متوسطة | خامساً |
| Dashboard Charts | 🟢 متوسطة | سادساً |
| PDF Reports | 🔵 اختيارية | سابعاً |
| Backup/Restore | 🔵 اختيارية | ثامناً |

---

## النتيجة المتوقعة

بعد تنفيذ هذه الخطة:

✅ **بيانات موحدة** - جميع الصفحات تستخدم Supabase  
✅ **بيانات تجريبية** - 3 domains، شبكات، سيرفرات، مهام، تراخيص تظهر فوراً  
✅ **Dashboard متكامل** - charts + widgets + filters  
✅ **Login سريع ومستقر** - بدون loops أو تأخير  
✅ **نظام إشعارات** - تنبيهات التراخيص والمهام  
✅ **Audit Log** - تتبع جميع التغييرات  
✅ **Website Apps** - روابط سريعة للتطبيقات  
✅ **تقارير PDF** - تقارير احترافية للطباعة  
✅ **Backup** - نسخ احتياطي واستعادة

