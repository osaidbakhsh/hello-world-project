
# خطة التنفيذ الشاملة لنظام إدارة البنية التحتية

## ملخص تنفيذي

بناءً على تحليل الكود الحالي، هذه خطة شاملة لتنفيذ جميع الأهداف المطلوبة:

| # | الهدف | الحالة الحالية | المطلوب |
|---|-------|----------------|---------|
| 1 | توحيد مصدر البيانات | ✅ معظم الصفحات تستخدم Supabase | تنظيف `useLocalStorage.ts` |
| 2 | إصلاح الجلسات والمصادقة | ⚠️ لا يوجد "تذكرني" | إضافة Remember Me + تحسينات |
| 3 | تطوير السيرفرات | ⚠️ ناقص | حقول Veeam + المستفيد + فلاتر |
| 4 | Network Scan | ❌ غير موجود | ميزة جديدة كاملة |
| 5 | نظام المهام Pro | ⚠️ بسيط | دورة حياة + SLA + Kanban |
| 6 | Audit Log | ✅ موجود | تحسينات طفيفة |
| 7 | الواجهة RTL/LTR | ✅ موجود | تحسينات |

---

## 1️⃣ توحيد مصدر البيانات (Critical)

### الحالة الحالية
```
الملفات التي تستخدم localStorage:
✅ useAppSettings.ts - للتفضيلات (مسموح)
✅ LanguageContext.tsx - للغة (مسموح)
✅ supabase/client.ts - لجلسة Auth (مطلوب)
⚠️ useLocalStorage.ts - exports قديمة (تحتاج حذف)
```

**أخبار جيدة:** جميع الصفحات الرئيسية تستخدم `useSupabaseData` بالفعل!

### الإجراء المطلوب
```text
- حذف أو إهمال الـ exports في useLocalStorage.ts:
  - useServers, useNetworks, useEmployees, useLicenses, useTasks
  (هذه لم تعد مستخدمة في أي صفحة)
```

---

## 2️⃣ إصلاح المصادقة والجلسات (High Priority)

### المشاكل المكتشفة
1. **لا يوجد خيار "تذكرني"** في صفحة Login
2. **Safety timeout قصير** (8 ثوان) قد يسبب logout مبكر
3. **لا يوجد رسالة واضحة** عند انتهاء الجلسة

### التعديلات المطلوبة

#### أ. إضافة "تذكرني" في Login.tsx
```typescript
// إضافة state
const [rememberMe, setRememberMe] = useState(false);

// تعديل signIn لتمرير الخيار
const { error } = await signIn(email, password, rememberMe);

// إضافة UI
<div className="flex items-center gap-2">
  <Checkbox 
    id="remember" 
    checked={rememberMe} 
    onCheckedChange={setRememberMe} 
  />
  <Label htmlFor="remember">{t('auth.rememberMe')}</Label>
</div>
```

#### ب. تعديل AuthContext.tsx
```typescript
// تحديث signIn function
const signIn = async (email: string, password: string, rememberMe = false) => {
  // تعيين مدة الجلسة حسب rememberMe
  // Supabase يدير هذا تلقائياً عبر persistSession
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  // إذا كان rememberMe = false، نستخدم session storage بدلاً من localStorage
  if (!rememberMe && !error) {
    // Set a flag to clear on tab close
    sessionStorage.setItem('session-only', 'true');
  }
  
  return { error };
};
```

#### ج. تحسين إدارة الجلسات
```typescript
// زيادة timeout الأمان
const safetyTimeout = window.setTimeout(() => {
  console.error('Auth init safety timeout hit');
  setIsLoading(false);
}, 15000); // زيادة من 8 ثوان إلى 15 ثانية

// إضافة رسالة انتهاء الجلسة
if (event === 'TOKEN_REFRESHED') {
  console.log('Session refreshed successfully');
} else if (event === 'SIGNED_OUT') {
  toast({
    title: t('auth.sessionExpired'),
    description: t('auth.pleaseLoginAgain'),
  });
}
```

---

## 3️⃣ تطوير السيرفرات (Medium Priority)

### تغييرات قاعدة البيانات
```sql
-- Migration: Add Veeam and Beneficiary fields to servers
ALTER TABLE servers ADD COLUMN IF NOT EXISTS beneficiary_department TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS primary_application TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS business_owner TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_backed_up_by_veeam BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS backup_frequency TEXT DEFAULT 'none';
ALTER TABLE servers ADD COLUMN IF NOT EXISTS backup_job_name TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_backup_status TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_backup_date TIMESTAMP WITH TIME ZONE;

-- Check constraint for backup validation
ALTER TABLE servers ADD CONSTRAINT check_backup_frequency 
  CHECK (
    (is_backed_up_by_veeam = FALSE) OR 
    (is_backed_up_by_veeam = TRUE AND backup_frequency != 'none')
  );
```

### تحديث ServerFormData في Servers.tsx
```typescript
interface ServerFormData {
  // الحقول الحالية...
  
  // حقول جديدة - المستفيد
  beneficiary_department: string;
  primary_application: string;
  business_owner: string;
  
  // حقول جديدة - Veeam
  is_backed_up_by_veeam: boolean;
  backup_frequency: 'none' | 'daily' | 'weekly';
  backup_job_name: string;
  last_backup_status: string;
  last_backup_date: string;
}
```

### إضافة فلاتر جديدة
```typescript
// في Servers.tsx
const [backupFilter, setBackupFilter] = useState<string>('all');
const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>('all');

// تطبيق الفلاتر
const filteredServers = useMemo(() => {
  let filtered = servers;
  
  // Veeam filter
  if (backupFilter === 'yes') {
    filtered = filtered.filter(s => s.is_backed_up_by_veeam);
  } else if (backupFilter === 'no') {
    filtered = filtered.filter(s => !s.is_backed_up_by_veeam);
  }
  
  // Beneficiary filter
  if (beneficiaryFilter !== 'all') {
    filtered = filtered.filter(s => s.beneficiary_department === beneficiaryFilter);
  }
  
  return filtered;
}, [servers, backupFilter, beneficiaryFilter, /* existing filters */]);
```

---

## 4️⃣ ميزة Network Scan (New Feature)

### نظرة عامة
ميزة لاكتشاف الأجهزة في الشبكة وإضافتها للنظام بشكل اختياري.

### هيكل قاعدة البيانات
```sql
-- جدول وظائف الفحص
CREATE TABLE scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain_id UUID REFERENCES domains(id),
  network_id UUID REFERENCES networks(id),
  ip_range TEXT NOT NULL,
  scan_mode TEXT DEFAULT 'basic', -- 'basic' or 'credentialed'
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  summary JSONB
);

-- جدول نتائج الفحص
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  hostname TEXT,
  os_type TEXT,
  os_version TEXT,
  device_type TEXT, -- Server, Workstation, Network, Printer, Unknown
  open_ports TEXT[],
  vendor TEXT,
  mac_address TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_imported BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scan jobs"
  ON scan_jobs FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage scan results"
  ON scan_results FOR ALL USING (is_admin());
```

### Edge Function للفحص
```typescript
// supabase/functions/network-scan/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { ipRange, scanMode, jobId } = await req.json();
  
  // Parse CIDR or range
  const ips = parseCIDR(ipRange);
  
  const results = [];
  
  for (const ip of ips) {
    // Basic mode: ping + port scan
    const result = await scanIP(ip, scanMode);
    results.push(result);
  }
  
  // Save results to database
  await saveResults(jobId, results);
  
  return new Response(JSON.stringify({ success: true, count: results.length }));
});

async function scanIP(ip: string, mode: string) {
  // Ping check
  const isAlive = await ping(ip);
  if (!isAlive) return null;
  
  // Port scan for device detection
  const openPorts = await scanPorts(ip, [22, 80, 443, 3389, 445, 5985, 135]);
  
  // Detect device type based on ports
  const deviceType = detectDeviceType(openPorts);
  
  // DNS reverse lookup
  const hostname = await reverseDNS(ip);
  
  return {
    ip_address: ip,
    hostname,
    device_type: deviceType,
    open_ports: openPorts,
    os_type: guessOS(openPorts),
  };
}
```

### واجهة المستخدم
```text
صفحة جديدة: /network-scan

1. نموذج بدء الفحص:
   - اسم الفحص
   - اختيار الدومين/الشبكة
   - CIDR أو مدى IP (e.g., 192.168.1.0/24)
   - وضع الفحص (Basic بدون credentials)

2. عرض التقدم:
   - شريط تقدم
   - عداد الأجهزة المكتشفة

3. جدول النتائج:
   - Checkbox لكل صف
   - IP, Hostname, OS, Device Type, Ports
   - زر "استيراد المحدد"

4. خطوة التأكيد:
   - تعبئة الحقول الناقصة (Environment, Owner, Network)
   - مراجعة نهائية
   - زر "إضافة للنظام"
```

---

## 5️⃣ نظام المهام الاحترافي (Major Feature)

### تغييرات قاعدة البيانات
```sql
-- توسيع جدول المهام
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'draft';
-- draft, assigned, in_progress, blocked, in_review, done, closed, cancelled

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_response_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_resolve_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS watchers UUID[];

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_server_id UUID REFERENCES servers(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_network_id UUID REFERENCES networks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_license_id UUID REFERENCES licenses(id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]';

-- جدول قوالب المهام
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  checklist JSONB DEFAULT '[]',
  frequency TEXT, -- daily, weekly, monthly
  priority TEXT DEFAULT 'medium',
  default_assignee_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول التعليقات على المهام
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول المناوبات
CREATE TABLE on_call_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rotation_type TEXT DEFAULT 'round_robin', -- round_robin, manual
  team_members UUID[],
  current_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### SLA حسب الأولوية
```typescript
const SLA_CONFIG = {
  P1: { response: 1, resolve: 4 },   // Critical: 1h response, 4h resolve
  P2: { response: 4, resolve: 24 },  // High: 4h response, 24h resolve
  P3: { response: 8, resolve: 72 },  // Medium: 8h response, 72h resolve
  P4: { response: 24, resolve: 168 }, // Low: 24h response, 1 week resolve
};
```

### واجهات جديدة

#### أ. صفحة "مهامي" (My Tasks)
```text
┌─────────────────────────────────────────────────────────┐
│ 📋 مهامي اليوم                                          │
├─────────────────────────────────────────────────────────┤
│ 🔴 متأخرة (3)                                           │
│ ├─ ✓ فحص Backup يومي                    ⏰ 08:00       │
│ ├─ ✓ مراجعة صلاحيات AD                  ⏰ أمس         │
│ └─ ✓ تحديث السيرفر DC01                 ⏰ منذ 3 أيام  │
├─────────────────────────────────────────────────────────┤
│ 🟡 قيد التنفيذ (2)                                      │
│ ├─ ○ تثبيت تحديثات Windows              ⏱️ 2:30:00     │
│ └─ ○ إعداد VM جديد للقسم المالي          ⏱️ 0:45:00     │
├─────────────────────────────────────────────────────────┤
│ 🔵 القادمة (5)                                          │
│ └─ المزيد...                                             │
└─────────────────────────────────────────────────────────┘
```

#### ب. Kanban Board
```text
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Draft   │ │Assigned │ │Progress │ │ Review  │ │  Done   │
│   (2)   │ │   (5)   │ │   (3)   │ │   (1)   │ │  (12)   │
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤
│ Card 1  │ │ Card 3  │ │ Card 6  │ │ Card 9  │ │ Card 10 │
│ Card 2  │ │ Card 4  │ │ Card 7  │ │         │ │ Card 11 │
│         │ │ Card 5  │ │ Card 8  │ │         │ │   ...   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

#### ج. Calendar View
```text
┌────────────────────────────────────────────────────────────┐
│        يناير 2026                    ◀ ▶                  │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ أحد │ إثن │ ثلا │ أرب │ خمي │ جمع │ سبت │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │     │ 1   │ 2   │ 3   │ 4   │
│     │     │     │ 🔴2 │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 5   │ 6   │ 7   │ 8   │ 9   │ 10  │ 11  │
│     │ 🟡3 │ 🟢1 │     │ 🔴1 │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

### المهام المتكررة
```typescript
// Edge Function لتوليد المهام المتكررة
// يعمل كـ Cron Job يومياً

async function generateRecurringTasks() {
  const templates = await getActiveTemplates();
  
  for (const template of templates) {
    if (shouldGenerate(template.frequency)) {
      const assignee = await getNextAssignee(template);
      
      await createTask({
        title: template.name,
        description: template.description,
        checklist: template.checklist,
        assigned_to: assignee,
        priority: template.priority,
        due_date: calculateDueDate(template.frequency),
        frequency: template.frequency,
      });
    }
  }
}
```

---

## 6️⃣ تحسينات Audit Log

### الحالة الحالية
- ✅ جدول `audit_logs` موجود
- ✅ دالة `logAuditAction` موجودة
- ✅ صفحة عرض موجودة

### التحسينات المطلوبة
```sql
-- إضافة indexes للأداء
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- إضافة عمود للكيان المرتبط
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name TEXT;
```

### تحسين واجهة العرض
```text
إضافات للفلترة:
- فلتر بتاريخ (من - إلى)
- فلتر بالمستخدم
- فلتر بنوع العملية
- تصدير إلى Excel/PDF
```

---

## 7️⃣ نظام الإشعارات (In-App Notifications)

### الإشعارات التلقائية
```typescript
// Triggers للإشعارات

// 1. عند إسناد مهمة
async function onTaskAssigned(task: Task) {
  await createNotification({
    user_id: task.assigned_to,
    title: 'مهمة جديدة',
    message: `تم إسنادك لمهمة: ${task.title}`,
    type: 'task',
    link: `/tasks?id=${task.id}`,
  });
}

// 2. عند اقتراب SLA
async function checkSLABreaches() {
  const tasks = await getTasksNearingSLA();
  for (const task of tasks) {
    await createNotification({
      user_id: task.assigned_to,
      title: 'تنبيه SLA',
      message: `المهمة "${task.title}" قاربت على انتهاء المهلة`,
      type: 'warning',
    });
  }
}

// 3. عند انتهاء ترخيص
async function checkExpiringLicenses() {
  const licenses = await getLicensesExpiringSoon(30); // 30 يوم
  for (const license of licenses) {
    await createNotification({
      user_id: null, // للجميع
      title: 'ترخيص قارب على الانتهاء',
      message: `الترخيص "${license.name}" ينتهي في ${license.expiry_date}`,
      type: 'license',
    });
  }
}
```

---

## ترتيب التنفيذ

### المرحلة 1: Critical (أسبوع 1)
```text
□ 1.1 تنظيف useLocalStorage.ts
□ 1.2 إضافة "تذكرني" في Login
□ 1.3 تحسين إدارة الجلسات
□ 1.4 إضافة حقول Veeam/المستفيد للسيرفرات (DB + UI)
```

### المرحلة 2: High Priority (أسبوع 2)
```text
□ 2.1 إضافة فلاتر السيرفرات الجديدة
□ 2.2 تحديث Excel Import/Export للحقول الجديدة
□ 2.3 بداية نظام المهام Pro (دورة الحياة + SLA)
```

### المرحلة 3: Network Scan (أسبوع 3)
```text
□ 3.1 إنشاء جداول scan_jobs و scan_results
□ 3.2 إنشاء Edge Function للفحص
□ 3.3 صفحة Network Scan UI
□ 3.4 خطوة المراجعة والاستيراد
```

### المرحلة 4: Task System Pro (أسبوع 4-5)
```text
□ 4.1 Kanban Board
□ 4.2 صفحة My Tasks
□ 4.3 قوالب المهام
□ 4.4 المهام المتكررة (Cron)
□ 4.5 التعليقات والمرفقات
□ 4.6 Calendar View
```

### المرحلة 5: Polish (أسبوع 6)
```text
□ 5.1 نظام الإشعارات
□ 5.2 تحسينات Audit Log
□ 5.3 اختبار شامل
□ 5.4 تحسينات الأداء
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/hooks/useLocalStorage.ts` | حذف أو إهمال exports |
| `src/pages/Login.tsx` | إضافة Remember Me |
| `src/contexts/AuthContext.tsx` | تحسين إدارة الجلسات |
| `src/pages/Servers.tsx` | حقول + فلاتر جديدة |
| `src/pages/Tasks.tsx` | إعادة بناء كاملة |
| `src/pages/NetworkScan.tsx` | ملف جديد |
| `supabase/functions/network-scan/` | Edge Function جديدة |
| `supabase/functions/recurring-tasks/` | Edge Function جديدة |
| `src/components/tasks/KanbanBoard.tsx` | مكون جديد |
| `src/components/tasks/TaskCalendar.tsx` | مكون جديد |
| `src/components/tasks/MyTasks.tsx` | مكون جديد |

---

## القسم التقني

### Database Migrations Summary
```sql
-- 1. Servers enhancements
ALTER TABLE servers ADD COLUMN beneficiary_department TEXT;
ALTER TABLE servers ADD COLUMN primary_application TEXT;
ALTER TABLE servers ADD COLUMN business_owner TEXT;
ALTER TABLE servers ADD COLUMN is_backed_up_by_veeam BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN backup_frequency TEXT DEFAULT 'none';
ALTER TABLE servers ADD COLUMN backup_job_name TEXT;
ALTER TABLE servers ADD COLUMN last_backup_status TEXT;
ALTER TABLE servers ADD COLUMN last_backup_date TIMESTAMPTZ;

-- 2. Tasks enhancements
ALTER TABLE tasks ADD COLUMN task_status TEXT DEFAULT 'draft';
ALTER TABLE tasks ADD COLUMN sla_response_hours INTEGER;
ALTER TABLE tasks ADD COLUMN sla_resolve_hours INTEGER;
ALTER TABLE tasks ADD COLUMN sla_breached BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN requester_id UUID;
ALTER TABLE tasks ADD COLUMN reviewer_id UUID;
ALTER TABLE tasks ADD COLUMN watchers UUID[];
ALTER TABLE tasks ADD COLUMN parent_task_id UUID;
ALTER TABLE tasks ADD COLUMN linked_server_id UUID;
ALTER TABLE tasks ADD COLUMN linked_network_id UUID;
ALTER TABLE tasks ADD COLUMN linked_license_id UUID;
ALTER TABLE tasks ADD COLUMN checklist JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN evidence JSONB DEFAULT '[]';

-- 3. New tables
CREATE TABLE scan_jobs (...);
CREATE TABLE scan_results (...);
CREATE TABLE task_templates (...);
CREATE TABLE task_comments (...);
CREATE TABLE on_call_schedules (...);
```

### New Translations Required
```typescript
// LanguageContext.tsx additions
ar: {
  'auth.rememberMe': 'تذكرني',
  'auth.sessionExpired': 'انتهت الجلسة',
  'auth.pleaseLoginAgain': 'يرجى تسجيل الدخول مجدداً',
  
  'servers.beneficiary': 'المستفيد/القسم',
  'servers.primaryApp': 'التطبيق الأساسي',
  'servers.businessOwner': 'مالك الخدمة',
  'servers.veeamBackup': 'نسخ Veeam',
  'servers.isBackedUp': 'يأخذ نسخة؟',
  'servers.backupFrequency': 'تكرار النسخ',
  'servers.backupJobName': 'اسم Job',
  
  'scan.title': 'فحص الشبكة',
  'scan.startScan': 'بدء الفحص',
  'scan.ipRange': 'نطاق IP',
  'scan.scanMode': 'وضع الفحص',
  'scan.basic': 'أساسي',
  'scan.results': 'النتائج',
  'scan.importSelected': 'استيراد المحدد',
  
  'tasks.kanban': 'لوحة Kanban',
  'tasks.myTasks': 'مهامي',
  'tasks.calendar': 'التقويم',
  'tasks.sla': 'مستوى الخدمة',
  'tasks.templates': 'القوالب',
  'tasks.checklist': 'قائمة التحقق',
  'tasks.comments': 'التعليقات',
  'tasks.attachments': 'المرفقات',
}
```
