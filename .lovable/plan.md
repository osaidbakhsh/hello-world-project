

# خطة إصلاح مشكلة صلاحيات الـ Super Admin + إنشاء بيانات تجريبية شاملة

---

## التشخيص الحالي

### 1. سبب اختفاء "صلاحيات المستخدمين" من القائمة

| المشكلة | السبب |
|---------|-------|
| قائمة "صلاحيات المستخدمين" مخفية | تم تحديد أنها تظهر فقط لـ `super_admin` في `Sidebar.tsx` (سطر 133) |
| لا يوجد super_admin | جدول `user_roles` لا يحتوي على أي مستخدم بدور `super_admin` |
| دورك الحالي | `admin` (ليس `super_admin`) |

**الكود المسؤول:**
```typescript
// Sidebar.tsx - line 133
if (item.id === 'employeePermissions') return isSuperAdmin;
```

### 2. ملف seedData.ts

- **الموقع**: `src/utils/seedData.ts`
- **الوظيفة**: إنشاء بيانات تجريبية (domains, networks, servers, licenses, tasks, web apps, vault items)
- **الحالة الحالية**: يوجد زر لتشغيله في `Settings.tsx` (للأدمن فقط)

### 3. حالة البيانات الحالية

| العنصر | الموجود | المطلوب |
|--------|---------|---------|
| **Domains** | `example.local`, `osaidtest1/2/3.com` | `os.com`, `at.com`, `is.com` ✅ |
| **Servers** | 23 | موجود جزئياً |
| **Networks** | 11 | موجود |
| **Licenses** | 4 | يحتاج توسيع |
| **Tasks** | 11 | يحتاج توسيع |
| **Datacenters** | 0 ❌ | مطلوب |
| **Clusters** | 0 ❌ | مطلوب |
| **Cluster Nodes** | 0 ❌ | مطلوب |
| **Maintenance Windows** | ؟ | مطلوب |
| **On-Call Schedules** | ؟ | مطلوب |

---

## الخطة المقترحة

### الخطوة 1: ترقية حسابك إلى Super Admin

**Migration SQL:**
```sql
-- ترقية المستخدم الحالي (osaidbakhsh@os.com) إلى super_admin
UPDATE user_roles 
SET role = 'super_admin' 
WHERE user_id = (
  SELECT user_id FROM profiles WHERE email = 'osaidbakhsh@os.com'
);
```

**النتيجة المتوقعة:**
- ظهور قائمة "صلاحيات المستخدمين" فوراً
- الحصول على صلاحيات كاملة على النظام

---

### الخطوة 2: توسيع seedData.ts ليشمل جميع الموديولات

#### أ) تحديث الـ Domains (حسب طلبك)
```typescript
// استبدال النطاقات القديمة بـ:
const professionalDomains = [
  { name: 'os.com', description: 'Operations & Systems Domain' },
  { name: 'at.com', description: 'Applications & Technology Domain' },
  { name: 'is.com', description: 'Infrastructure & Security Domain' },
];
```

#### ب) إضافة Datacenter Infrastructure
```typescript
// Datacenters (1 per domain)
const professionalDatacenters = [
  { domainName: 'os.com', name: 'DC-RIYADH-01', location: 'Riyadh, KSA' },
  { domainName: 'at.com', name: 'DC-JEDDAH-01', location: 'Jeddah, KSA' },
  { domainName: 'is.com', name: 'DC-DAMMAM-01', location: 'Dammam, KSA' },
];

// Clusters (1-2 per datacenter)
const professionalClusters = [
  { datacenterName: 'DC-RIYADH-01', name: 'OS-NUTANIX-PROD', cluster_type: 'nutanix', ... },
  { datacenterName: 'DC-JEDDAH-01', name: 'AT-VMWARE-PROD', cluster_type: 'vmware', ... },
  { datacenterName: 'DC-DAMMAM-01', name: 'IS-HYPERV-SEC', cluster_type: 'hyper-v', ... },
];

// Nodes (3-4 per cluster)
const professionalNodes = [
  { clusterName: 'OS-NUTANIX-PROD', name: 'OS-NODE-01', cpu_cores: 64, ram_gb: 512, ... },
  // ... المزيد
];
```

#### ج) إضافة Maintenance Windows
```typescript
const professionalMaintenanceWindows = [
  {
    domainName: 'os.com',
    title: 'Windows Server Patching - February 2026',
    description: 'Monthly security patches',
    start_time: '2026-02-15T22:00:00Z',
    end_time: '2026-02-16T06:00:00Z',
    impact_level: 'medium',
    status: 'scheduled',
  },
  // ... المزيد
];
```

#### د) إضافة On-Call Schedules
```typescript
const professionalOnCallSchedules = [
  {
    domainName: 'os.com',
    name: 'OS Infrastructure On-Call',
    rotation_type: 'round_robin',
    is_active: true,
  },
  // ... المزيد
];
```

#### هـ) إضافة File Shares
```typescript
const professionalFileShares = [
  {
    domainName: 'os.com',
    name: 'OS-DATA-SHARE',
    path: '\\\\os-file01\\data',
    share_type: 'smb',
    scan_mode: 'AGENT',
  },
  // ... المزيد
];
```

#### و) إضافة Vacations
```typescript
const professionalVacations = [
  { status: 'pending', vacation_type: 'annual', start_date: '2026-03-01', end_date: '2026-03-05' },
  { status: 'approved', vacation_type: 'annual', start_date: '2026-04-10', end_date: '2026-04-15' },
  { status: 'rejected', vacation_type: 'sick', start_date: '2026-02-20', end_date: '2026-02-21' },
];
```

---

### الخطوة 3: إضافة زر "Reset Demo Data" للـ Super Admin

**في Settings.tsx:**
```typescript
{isSuperAdmin && (
  <Card>
    <CardHeader>
      <CardTitle>Demo Data Management</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <Button onClick={handleSeedData} disabled={isSeeding}>
        <Database className="w-4 h-4 me-2" />
        إنشاء بيانات تجريبية
      </Button>
      <Button 
        variant="destructive" 
        onClick={handleResetDemoData}
        disabled={isResetting}
      >
        <RefreshCw className="w-4 h-4 me-2" />
        إعادة تعيين البيانات التجريبية
      </Button>
    </CardContent>
  </Card>
)}
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | الإجراء |
|-------|---------|
| **SQL Migration** | ترقية حسابك إلى `super_admin` |
| `src/utils/seedData.ts` | توسيع شامل - Datacenter, Maintenance, On-Call, File Shares |
| `src/pages/Settings.tsx` | تحديث UI لـ Super Admin + Reset button |
| `src/contexts/LanguageContext.tsx` | إضافة ترجمات للعناصر الجديدة |

---

## النتيجة المتوقعة بعد التنفيذ

### ✅ صلاحيات المستخدمين
- ستظهر في القائمة الجانبية
- فقط Super Admin يمكنه الوصول إليها

### ✅ البيانات التجريبية الشاملة
| الموديول | البيانات |
|----------|----------|
| Domains | 3 (os.com, at.com, is.com) |
| Networks | 6 (2 لكل domain) |
| Servers | 21+ مع أدوار واضحة |
| Datacenters | 3 (1 لكل domain) |
| Clusters | 3-4 (Nutanix, VMware, Hyper-V) |
| Nodes | 9-12 (3-4 لكل cluster) |
| Licenses | 10+ (بعضها منتهي/قريب الانتهاء) |
| Tasks | 15+ (overdue, in-progress, done) |
| Maintenance | 3-6 windows |
| On-Call | 2-3 schedules |
| Web Apps | 10+ |
| Vault Items | 6+ |
| Vacations | 3-6 |

---

## هل أبدأ بالتنفيذ؟

سأبدأ بـ:
1. ترقية حسابك إلى Super Admin (migration)
2. توسيع seedData.ts ليشمل كل الموديولات
3. تحديث Settings.tsx لإضافة Reset Demo Data

