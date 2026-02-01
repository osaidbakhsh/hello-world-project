

# خطة تنفيذ الطلبات المتعددة

## نظرة عامة

يتضمن هذا الطلب **5 مهام** يجب تنفيذها:

1. **إصلاح سريع**: تغيير كلمة "النطاقات" إلى "الشبكات" في لوحة التحكم
2. **EPIC B**: نظام المناوبات (On-Call Rotation)
3. **EPIC C**: نوافذ الصيانة وتقويم التغييرات
4. **Lifecycle Center**: صفحة مركز دورة حياة الأصول
5. **اختبار**: التحقق من صفحة ملخص النطاق

---

## 1. إصلاح سريع: تغيير "النطاقات" إلى "الشبكات"

### الملف المطلوب تعديله
| الملف | التغيير |
|-------|---------|
| `src/contexts/LanguageContext.tsx` | تغيير `'dashboard.domains': 'النطاقات'` إلى `'dashboard.domains': 'الشبكات'` |

### الترجمة الحالية (سطر 518):
```typescript
'dashboard.domains': 'النطاقات',  // ← تغيير إلى 'الشبكات'
```

---

## 2. EPIC B: نظام المناوبات (On-Call Rotation)

### هيكل قاعدة البيانات

```text
جداول جديدة:
┌─────────────────────────┐
│    on_call_schedules    │
├─────────────────────────┤
│ id                      │
│ domain_id               │
│ name                    │
│ rotation_type           │ (daily/weekly/custom)
│ start_date              │
│ created_by              │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│   on_call_assignments   │
├─────────────────────────┤
│ id                      │
│ schedule_id             │
│ profile_id              │
│ start_time              │
│ end_time                │
│ role                    │ (primary/secondary)
│ order_index             │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│  escalation_rules       │
├─────────────────────────┤
│ id                      │
│ schedule_id             │
│ level                   │ (1, 2, 3)
│ wait_minutes            │
│ notify_profile_id       │
│ notify_method           │ (email/sms/both)
└─────────────────────────┘
```

### الملفات المطلوب إنشاؤها

| الملف | الوصف |
|-------|-------|
| `src/pages/OnCallSchedule.tsx` | صفحة إدارة جداول المناوبات |
| `src/components/on-call/ScheduleCalendar.tsx` | تقويم المناوبات |
| `src/components/on-call/AssignmentForm.tsx` | نموذج تعيين المناوبين |
| `src/components/on-call/EscalationRules.tsx` | إدارة قواعد التصعيد |

### تحديث ويدجت المناوب الحالي
تحديث `src/components/domain-summary/OnCallWidget.tsx` ليجلب البيانات الفعلية من الجداول الجديدة.

---

## 3. EPIC C: نوافذ الصيانة وتقويم التغييرات

### هيكل قاعدة البيانات

```text
┌─────────────────────────┐
│  maintenance_windows    │
├─────────────────────────┤
│ id                      │
│ domain_id               │
│ title                   │
│ description             │
│ start_time              │
│ end_time                │
│ recurrence              │ (once/weekly/monthly)
│ affected_servers        │ (text[])
│ status                  │ (scheduled/in_progress/completed/cancelled)
│ created_by              │
│ approved_by             │
│ impact_level            │ (low/medium/high/critical)
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│   change_requests       │
├─────────────────────────┤
│ id                      │
│ maintenance_window_id   │
│ title                   │
│ description             │
│ requested_by            │
│ status                  │ (pending/approved/rejected)
│ risk_assessment         │
└─────────────────────────┘
```

### الميزات الرئيسية

1. **كشف التعارضات**: عند جدولة صيانة جديدة، التحقق من:
   - تداخل مع نوافذ صيانة أخرى لنفس السيرفرات
   - تعارض مع إجازات الموظفين المسؤولين
   - تعارض مع مواعيد انتهاء التراخيص

2. **التقويم المرئي**: عرض جميع النوافذ في تقويم تفاعلي

### الملفات المطلوب إنشاؤها

| الملف | الوصف |
|-------|-------|
| `src/pages/MaintenanceWindows.tsx` | صفحة إدارة نوافذ الصيانة |
| `src/components/maintenance/MaintenanceCalendar.tsx` | تقويم الصيانة |
| `src/components/maintenance/MaintenanceForm.tsx` | نموذج إضافة/تعديل صيانة |
| `src/components/maintenance/ConflictDetector.tsx` | كاشف التعارضات |
| `src/hooks/useMaintenanceConflicts.ts` | هوك لكشف التعارضات |

---

## 4. صفحة مركز دورة الحياة (Lifecycle Center)

### الوظائف الرئيسية

```text
┌─────────────────────────────────────────────────────────────┐
│                    Lifecycle Center                          │
├─────────────────────────────────────────────────────────────┤
│  [فلتر: انتهاء الضمان] [فلتر: EOL] [فلتر: EOS] [فلتر: الكل] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ الضمان المنتهي │  │  EOL قريب     │  │  EOS قريب     │ │
│  │      12        │  │       5        │  │       3        │ │
│  │ ■■■■■■■■■      │  │ ■■■■■          │  │ ■■■            │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Timeline View - الجدول الزمني                         │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ Q1 2026 │ Q2 2026 │ Q3 2026 │ Q4 2026 │ Q1 2027     │   │
│  │ ●───────●─────────●─────────●─────────●             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ قائمة السيرفرات المتأثرة                              │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ SERVER01 │ WARRANTY │ 15 يوم │ Dell PowerEdge R740  │   │
│  │ SERVER02 │ EOL      │ 45 يوم │ Windows Server 2012  │   │
│  │ SERVER03 │ EOS      │ 90 يوم │ SQL Server 2014      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### الملفات المطلوب إنشاؤها

| الملف | الوصف |
|-------|-------|
| `src/pages/LifecycleCenter.tsx` | الصفحة الرئيسية |
| `src/components/lifecycle/LifecycleStats.tsx` | بطاقات الإحصائيات |
| `src/components/lifecycle/LifecycleTimeline.tsx` | الجدول الزمني البصري |
| `src/components/lifecycle/LifecycleFilters.tsx` | فلاتر البحث |
| `src/components/lifecycle/LifecycleTable.tsx` | جدول السيرفرات |

### الفلاتر المتاحة

- **حسب الفترة**: 7 أيام / 30 يوم / 90 يوم / السنة
- **حسب النوع**: Warranty / EOL / EOS
- **حسب الدومين**: اختيار نطاق محدد
- **حسب المورد**: Dell / HP / Lenovo / etc.

---

## 5. اختبار صفحة ملخص النطاق

تم إصلاح فلترة البيانات في الجلسة السابقة. الاختبار يتطلب:

1. الانتقال إلى صفحة `/domain-summary`
2. تبديل بين النطاقات المختلفة
3. التحقق من تغير:
   - إجمالي السيرفرات
   - السيرفرات النشطة
   - الأدوار الحرجة
   - حالة النسخ الاحتياطي

---

## التفاصيل التقنية

### هجرات قاعدة البيانات المطلوبة

**EPIC B - On-Call:**
```sql
-- جدول جداول المناوبات
CREATE TABLE on_call_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rotation_type TEXT DEFAULT 'weekly',
  start_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تعيينات المناوبات
CREATE TABLE on_call_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES on_call_schedules(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  role TEXT DEFAULT 'primary',
  order_index INTEGER DEFAULT 0
);

-- جدول قواعد التصعيد
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES on_call_schedules(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  wait_minutes INTEGER DEFAULT 15,
  notify_profile_id UUID REFERENCES profiles(id),
  notify_method TEXT DEFAULT 'email'
);
```

**EPIC C - Maintenance:**
```sql
-- جدول نوافذ الصيانة
CREATE TABLE maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  recurrence TEXT DEFAULT 'once',
  affected_servers TEXT[],
  status TEXT DEFAULT 'scheduled',
  impact_level TEXT DEFAULT 'medium',
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبات التغيير
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_window_id UUID REFERENCES maintenance_windows(id),
  title TEXT NOT NULL,
  description TEXT,
  requested_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  risk_assessment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### تحديثات التوجيه (Routing)

في `src/App.tsx`:
```typescript
<Route path="/on-call" element={<ProtectedRoute><OnCallSchedule /></ProtectedRoute>} />
<Route path="/maintenance" element={<ProtectedRoute><MaintenanceWindows /></ProtectedRoute>} />
<Route path="/lifecycle" element={<ProtectedRoute><LifecycleCenter /></ProtectedRoute>} />
```

### تحديثات القائمة الجانبية

في `src/components/layout/Sidebar.tsx`:
```typescript
{ path: '/on-call', icon: PhoneCall, label: t('nav.onCall') }
{ path: '/maintenance', icon: Wrench, label: t('nav.maintenance') }
{ path: '/lifecycle', icon: Clock, label: t('nav.lifecycle') }
```

---

## ترتيب التنفيذ

| # | المهمة | الأولوية | الوقت المقدر |
|---|--------|----------|--------------|
| 1 | إصلاح "النطاقات" → "الشبكات" | عالية | 1 دقيقة |
| 2 | اختبار صفحة ملخص النطاق | عالية | 5 دقائق |
| 3 | EPIC B - نظام المناوبات | متوسطة | 30 دقيقة |
| 4 | EPIC C - نوافذ الصيانة | متوسطة | 30 دقيقة |
| 5 | Lifecycle Center | متوسطة | 25 دقيقة |

---

## الترجمات المطلوب إضافتها

```typescript
// On-Call
'nav.onCall': 'المناوبات',
'onCall.title': 'إدارة المناوبات',
'onCall.schedule': 'جدول المناوبات',
'onCall.addSchedule': 'إضافة جدول',
'onCall.escalation': 'قواعد التصعيد',

// Maintenance
'nav.maintenance': 'الصيانة',
'maintenance.title': 'نوافذ الصيانة',
'maintenance.add': 'إضافة نافذة صيانة',
'maintenance.conflict': 'يوجد تعارض!',
'maintenance.calendar': 'تقويم الصيانة',

// Lifecycle
'nav.lifecycle': 'دورة الحياة',
'lifecycle.title': 'مركز دورة الحياة',
'lifecycle.warranty': 'الضمان',
'lifecycle.eol': 'نهاية العمر',
'lifecycle.eos': 'نهاية الدعم',
'lifecycle.expiring': 'قريب الانتهاء',
```

