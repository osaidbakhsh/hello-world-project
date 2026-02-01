
# خطة إصلاح صلاحيات Super Admin + توسيع البيانات التجريبية الاحترافية

---

## التشخيص الكامل للمشاكل الحالية

### 1. مشكلة اختفاء "صلاحيات المستخدمين"

| المشكلة | السبب الجذري |
|---------|--------------|
| قائمة "صلاحيات المستخدمين" مخفية | تم ترقية `osaidbakhsh@os.com` إلى `super_admin` لكن حسابك الفعلي هو `osaidbakhsh@gmail.com` |
| حسابك الحالي `osaidbakhsh@gmail.com` ليس `super_admin` | Migration السابق رقّى حساب خاطئ |

**الحل**: ترقية `osaidbakhsh@gmail.com` إلى `super_admin` عبر SQL UPDATE

### 2. ربط المهام بالنطاق

**الوضع الحالي**: المهام مربوطة بـ `server_id` و `linked_network_id` و `linked_server_id` لكن ليس لها `domain_id` مباشر.

**طلبك**: الاستفادة من الربط الموجود (Server → Network → Domain) دون إضافة عمود جديد.

**الحل**: تحسين التقارير والداشبورد لتفلتر المهام عبر السلسلة: `Task → Server/Network → Domain`

### 3. توسيع البيانات التجريبية

| الموديول | الحالة الحالية | المطلوب |
|----------|----------------|---------|
| **Domains** | os.com, at.com, is.com ✅ | موجود |
| **Servers** | 21 سيرفر ✅ | موجود |
| **Datacenters/Clusters/Nodes** | موجود ✅ | موجود |
| **Scan Agents** | ❌ غير موجود | مطلوب إضافة |
| **Vault Items** | 6 ✅ | يحتاج توسيع |
| **File Shares** | 6 ✅ | موجود |
| **On-Call** | 3 ✅ | موجود |
| **حسابات موظفين جديدة** | ❌ | مطلوب إنشاء 3-5 حسابات |
| **أدوار حرجة إضافية** | 12 دور | مطلوب إضافة المزيد |

---

## الخطة التنفيذية المفصلة

### الخطوة 1: ترقية حسابك إلى Super Admin

**SQL Migration:**
```sql
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = (
  SELECT user_id FROM public.profiles 
  WHERE email = 'osaidbakhsh@gmail.com'
);

-- أيضاً تحديث profiles لمطابقة الدور
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'osaidbakhsh@gmail.com';
```

**النتيجة**: ظهور قائمة "صلاحيات المستخدمين" فوراً بعد تسجيل خروج/دخول.

---

### الخطوة 2: إنشاء حسابات موظفين احترافية

سننشئ 4 موظفين جدد مع ربطهم بنطاقات مختلفة وأدوار متنوعة:

| الاسم | البريد | الدور | النطاق | القسم |
|-------|--------|-------|--------|-------|
| أحمد المحمد | ahmed@os.com | Admin | os.com | Network Operations |
| سارة الخالد | sara@at.com | Employee | at.com | Development |
| محمد العلي | mohammed@is.com | Admin | is.com | Security |
| نورة السعيد | noura@os.com | Employee | os.com, at.com | IT Support |

**كلمة المرور الافتراضية**: `Demo@123` (يجب تغييرها عند أول تسجيل دخول)

**تحديثات الكود**:
- توسيع `seedData.ts` ليشمل دالة `createDemoEmployees()` تستخدم Edge Function `create-employee`
- تحديث Edge Function `create-employee` ليدعم `super_admin` role بشكل صحيح
- إضافة Domain Memberships لكل موظف

---

### الخطوة 3: إضافة Scan Agents للنطاقات

```typescript
const professionalScanAgents = [
  { domainName: 'os.com', name: 'OS-SCANNER-01', site_tag: 'Riyadh-DC', status: 'ONLINE' },
  { domainName: 'at.com', name: 'AT-SCANNER-01', site_tag: 'Jeddah-DC', status: 'ONLINE' },
  { domainName: 'is.com', name: 'IS-SCANNER-01', site_tag: 'Dammam-DC', status: 'OFFLINE' },
];
```

---

### الخطوة 4: توسيع الأدوار الحرجة في Domain Summary

| الدور الحالي | الأدوار الجديدة المقترحة |
|--------------|-------------------------|
| DC, DNS, DHCP | **WSUS** (Windows Update) |
| CA, Exchange | **SCCM** (System Center) |
| SQL, File | **NPS** (RADIUS/Network Policy) |
| IIS, Print | **WDS** (Windows Deployment) |
| Backup, Hyper-V, RDS | **ADFS** (Federation Services) |
|  | **NLB** (Network Load Balancing) |
|  | **DFS** (Distributed File System) |
|  | **Failover Cluster** |

**تحديث الكود في `CriticalRolesCard.tsx`**:
```typescript
const CRITICAL_ROLES = [
  // الأدوار الحالية...
  { key: 'WSUS', label: 'domainSummary.roleWSUS', icon: Download, color: 'text-sky-500' },
  { key: 'SCCM', label: 'domainSummary.roleSCCM', icon: Settings, color: 'text-slate-500' },
  { key: 'NPS', label: 'domainSummary.roleNPS', icon: Shield, color: 'text-amber-500' },
  { key: 'WDS', label: 'domainSummary.roleWDS', icon: HardDrive, color: 'text-lime-500' },
  { key: 'ADFS', label: 'domainSummary.roleADFS', icon: Lock, color: 'text-rose-500' },
  { key: 'NLB', label: 'domainSummary.roleNLB', icon: Network, color: 'text-fuchsia-500' },
  { key: 'DFS', label: 'domainSummary.roleDFS', icon: FolderKanban, color: 'text-orange-400' },
  { key: 'Cluster', label: 'domainSummary.roleCluster', icon: Layers, color: 'text-blue-400' },
];
```

---

### الخطوة 5: توسيع بيانات Vault Items

```typescript
const additionalVaultItems = [
  { title: 'Exchange Admin', username: 'exchAdmin', item_type: 'server', url: 'AT-EXCH01' },
  { title: 'Nutanix Prism Admin', username: 'admin', item_type: 'application', url: 'https://prism.os.com' },
  { title: 'VMware vCenter', username: 'administrator@vsphere.local', item_type: 'application', url: 'https://vcenter.at.com' },
  { title: 'Zabbix API Key', username: 'api', item_type: 'api_key', notes: 'Monitoring API' },
  { title: 'AWS Root Account', username: 'root', item_type: 'cloud', url: 'https://console.aws.amazon.com' },
  { title: 'Azure Portal', username: 'admin@company.onmicrosoft.com', item_type: 'cloud', url: 'https://portal.azure.com' },
];
```

---

### الخطوة 6: توسيع التراخيص والإجازات

**تراخيص إضافية**:
```typescript
{ name: 'Nutanix AOS', vendor: 'Nutanix', quantity: 7, expiry_date: '2027-06-15', cost: 55000 },
{ name: 'Zabbix Enterprise', vendor: 'Zabbix', quantity: 1, expiry_date: '2026-04-30', cost: 8000 },
{ name: 'AutoCAD LT', vendor: 'Autodesk', quantity: 5, expiry_date: '2025-12-31', cost: 3500, status: 'expired' },
```

**إجازات متنوعة للموظفين الجدد**:
```typescript
{ profile: 'ahmed@os.com', vacation_type: 'annual', start_date: '2026-03-10', end_date: '2026-03-15', status: 'approved' },
{ profile: 'sara@at.com', vacation_type: 'sick', start_date: '2026-02-25', end_date: '2026-02-26', status: 'pending' },
```

---

### الخطوة 7: تحسين ربط المهام بالتقارير

**تحديث صفحة Reports.tsx**:
- عند اختيار Domain من الفلتر، نجلب كل الـ Networks المرتبطة به
- ثم نجلب كل الـ Servers المرتبطة بهذه Networks  
- ثم نفلتر المهام التي لها `linked_server_id` أو `linked_network_id` أو `server_id` مطابق

```typescript
// تحسين فلترة المهام حسب النطاق
const filteredTasks = useMemo(() => {
  if (!selectedDomainId || selectedDomainId === 'all') return tasks;
  
  const domainNetworks = networks.filter(n => n.domain_id === selectedDomainId);
  const networkIds = new Set(domainNetworks.map(n => n.id));
  const serverIds = new Set(servers.filter(s => networkIds.has(s.network_id)).map(s => s.id));
  
  return tasks.filter(task => 
    (task.linked_network_id && networkIds.has(task.linked_network_id)) ||
    (task.linked_server_id && serverIds.has(task.linked_server_id)) ||
    (task.server_id && serverIds.has(task.server_id))
  );
}, [tasks, networks, servers, selectedDomainId]);
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | الإجراء |
|-------|---------|
| **SQL Migration** | ترقية `osaidbakhsh@gmail.com` إلى `super_admin` |
| `src/utils/seedData.ts` | إضافة Scan Agents + Vault Items + توسيع التراخيص + إضافة دالة إنشاء الموظفين |
| `src/components/domain-summary/CriticalRolesCard.tsx` | إضافة 8 أدوار حرجة جديدة (WSUS, SCCM, NPS, WDS, ADFS, NLB, DFS, Cluster) |
| `src/contexts/LanguageContext.tsx` | إضافة ترجمات للأدوار الجديدة |
| `src/pages/Reports.tsx` | تحسين فلترة المهام حسب النطاق عبر Server/Network |
| `supabase/functions/create-employee/index.ts` | تحديث ليدعم `super_admin` و يتحقق منها بشكل صحيح |
| `src/pages/Settings.tsx` | إضافة زر "إنشاء حسابات تجريبية" يستخدم Edge Function |

---

## النتيجة المتوقعة بعد التنفيذ

### ✅ صلاحيات المستخدمين
- ستظهر في القائمة الجانبية لحسابك `osaidbakhsh@gmail.com`
- يمكنك إدارة أدوار وصلاحيات جميع الموظفين

### ✅ البيانات التجريبية الشاملة

| الموديول | الكمية |
|----------|--------|
| Domains | 3 (os.com, at.com, is.com) |
| Networks | 6 |
| Servers | 21+ |
| **Employees (حسابات دخول)** | 4 جديدة + حسابك |
| Datacenters | 3 |
| Clusters | 4 |
| Cluster Nodes | 14 |
| **Scan Agents** | 3 جديدة |
| File Shares | 6 |
| On-Call Schedules | 3 |
| Maintenance Windows | 6 |
| Licenses | 13+ |
| Tasks | 15+ (مربوطة بـ Servers/Networks) |
| Web Apps | 12 |
| Vault Items | 12+ |
| Vacations | 8+ |

### ✅ الأدوار الحرجة في Domain Summary
- **20 دور** بدلاً من 12
- يشمل: WSUS, SCCM, NPS, WDS, ADFS, NLB, DFS, Failover Cluster

### ✅ ربط المهام بالتقارير
- عند اختيار نطاق معين، ستظهر فقط المهام المرتبطة بسيرفرات/شبكات هذا النطاق

---

## التفاصيل التقنية

### تحديث Edge Function للموظفين

```typescript
// تحقق من صلاحية super_admin أو admin
const { data: callerRole } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (!['super_admin', 'admin'].includes(callerRole?.role)) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}

// التحقق من أن admin لا يمكنه إنشاء super_admin
if (callerRole?.role === 'admin' && role === 'super_admin') {
  return new Response(JSON.stringify({ error: 'Only Super Admin can create Super Admin accounts' }), { status: 403 });
}
```

### إنشاء Domain Memberships تلقائياً

```typescript
// بعد إنشاء الموظف، ربطه بالنطاق المحدد
const { error: membershipError } = await supabaseAdmin
  .from('domain_memberships')
  .insert({
    profile_id: newProfileId,
    domain_id: domainId,
    can_edit: role === 'admin'
  });
```
