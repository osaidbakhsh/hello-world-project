
# خطة تنفيذ EPIC: ENT-PLAT-001 — Enterprise RBAC + بيانات تجريبية + تحسين CSR

## نظرة عامة على المشروع

هذا EPIC يتضمن 4 قصص (Stories) رئيسية:
1. **ENT-RBAC-001**: نظام RBAC المؤسسي (Super Admin / Admin / Employee)
2. **ENT-SEED-001**: بيانات تجريبية احترافية شاملة
3. **ENT-CSR-001**: توسيع أداة CSR Generator
4. **ENT-DOMAINS-001**: تنظيف وتوحيد أسماء النطاقات

---

## تحليل الوضع الحالي

### النظام الحالي
| العنصر | الحالة الحالية | ما نحتاجه |
|--------|---------------|-----------|
| `app_role` enum | `['admin', 'employee']` | `['super_admin', 'admin', 'employee']` |
| `user_roles` table | موجود | تحديث للدور الجديد |
| `is_admin()` function | تحقق من admin فقط | تحديث ليشمل super_admin |
| Domain Scoping | `can_access_domain()` / `can_edit_domain()` | إضافة `can_manage_domain()` للأدمن |
| Employee view-only | غير موجود | تطبيق SELECT only للموظفين |
| CSR Tool | أساسي | توسيع الأوامر + PowerShell |
| Seed Data | موجود جزئياً | توسيع شامل لجميع الموديولات |

---

## القصة الأولى: ENT-RBAC-001 — نظام RBAC المؤسسي

### 1. تحديث قاعدة البيانات (Migrations)

```sql
-- 1. Alter app_role enum to add super_admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- 2. Update helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;

-- 3. Update is_admin to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  )
$$;

-- 4. Create can_manage_domain (admin can manage their domains, super_admin all)
CREATE OR REPLACE FUNCTION public.can_manage_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
  OR (
    public.has_role(auth.uid(), 'admin')
    AND public.can_access_domain(_domain_id)
  )
$$;

-- 5. Check if user is employee (view-only)
CREATE OR REPLACE FUNCTION public.is_employee_only()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'employee'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  )
$$;
```

### 2. تحديث سياسات RLS

لكل جدول مرتبط بـ domain:

```sql
-- نموذج للسيرفرات (تطبيق نفس النمط على جميع الجداول)

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can do all on servers" ON servers;
DROP POLICY IF EXISTS "Users can add servers to their networks" ON servers;
DROP POLICY IF EXISTS "Users can update servers in their networks" ON servers;

-- إنشاء سياسات جديدة
-- Super Admin: Full access
CREATE POLICY "Super admins full access" ON servers
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Admin: Full access on their domains
CREATE POLICY "Admins can manage servers in their domains" ON servers
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND can_access_network(network_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    AND can_access_network(network_id)
  );

-- Employee: View only on their domains
CREATE POLICY "Employees can view servers in their domains" ON servers
  FOR SELECT TO authenticated
  USING (
    is_employee_only()
    AND can_access_network(network_id)
  );
```

### 3. تحديث AuthContext

```typescript
// src/contexts/AuthContext.tsx

// تحديث النوع
type AppRole = 'super_admin' | 'admin' | 'employee';

interface AuthContextType {
  // ... existing
  isSuperAdmin: boolean;
  isAdmin: boolean;  // true for super_admin OR admin
  isEmployee: boolean;  // true for employee only
  userRole: AppRole | null;
  canManage: (domainId?: string) => boolean;
}

// في Provider:
const isSuperAdmin = userRole === 'super_admin';
const isAdmin = userRole === 'super_admin' || userRole === 'admin';
const isEmployee = userRole === 'employee';

const canManage = (domainId?: string) => {
  if (isSuperAdmin) return true;
  if (!isAdmin) return false;
  // Check domain membership via local cache or API
  return domainId ? cachedDomainIds.includes(domainId) : false;
};
```

### 4. تحديث واجهة المستخدم

#### ProtectedRoute.tsx
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  requireAdmin?: boolean;
  requireManage?: boolean;  // Can modify (not view-only)
}

// التحقق من الصلاحيات
if (requireSuperAdmin && !isSuperAdmin) {
  return <Navigate to="/" replace />;
}
if (requireAdmin && !isAdmin) {
  return <Navigate to="/" replace />;
}
```

#### تحديث Sidebar.tsx
```typescript
// إخفاء/إظهار العناصر بناءً على الدور
const visibleMenuItems = orderedMenuItems.filter(item => {
  // Employee & Permissions - Super Admin only
  if (item.id === 'employeePermissions') return isSuperAdmin;
  // Admin-only pages
  if (item.adminOnly) return isAdmin;
  return true;
});
```

#### تحديث صفحات CRUD
```typescript
// إخفاء أزرار الإضافة/التعديل/الحذف للموظفين
{!isEmployee && (
  <Button onClick={handleAdd}>
    <Plus className="w-4 h-4 me-2" />
    {t('common.add')}
  </Button>
)}
```

### 5. تحديث Edge Functions

#### update-user-role/index.ts
```typescript
// إضافة دعم super_admin
const validRoles = ['super_admin', 'admin', 'employee'];

// فقط Super Admin يمكنه تعيين أدوار
const { data: callerRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (callerRole?.role !== 'super_admin') {
  throw new Error('Only super admins can change roles');
}
```

---

## القصة الثانية: ENT-SEED-001 — بيانات تجريبية شاملة

### 1. إعادة كتابة seedData.ts

```typescript
// src/utils/seedData.ts

// إضافة Datacenter data
const professionalDatacenters = [
  { domainName: 'os.com', name: 'DC-RIYADH-01', location: 'Riyadh, Saudi Arabia' },
  { domainName: 'at.com', name: 'DC-JEDDAH-01', location: 'Jeddah, Saudi Arabia' },
  { domainName: 'is.com', name: 'DC-DAMMAM-01', location: 'Dammam, Saudi Arabia' },
];

// Clusters per datacenter
const professionalClusters = [
  { 
    datacenterName: 'DC-RIYADH-01',
    domainName: 'os.com',
    name: 'OS-PROD-CLUSTER',
    cluster_type: 'nutanix',
    platform_version: 'AOS 6.5.3',
    hypervisor_version: 'AHV 20230302',
    storage_type: 'all-flash',
    rf_level: 'RF2',
    node_count: 4,
  },
  // ... more clusters
];

// Nodes per cluster (3-5 per cluster)
const professionalNodes = [
  {
    clusterName: 'OS-PROD-CLUSTER',
    name: 'OS-NODE-01',
    node_role: 'hybrid',
    vendor: 'Nutanix',
    model: 'NX-3170-G7',
    serial_number: 'NTX-OS-001-2024',
    cpu_sockets: 2,
    cpu_cores: 64,
    ram_gb: 512,
    storage_total_tb: 15.36,
    storage_used_tb: 8.5,
    mgmt_ip: '10.10.2.101',
    ilo_idrac_ip: '10.10.3.101',
    status: 'active',
  },
  // ... more nodes
];

// VMs (10-20 per domain)
const professionalVMs = [
  {
    clusterName: 'OS-PROD-CLUSTER',
    serverRef: 'OS-DC01', // Link to existing server
    name: 'OS-DC01-VM',
    ip_address: '10.10.1.10',
    os: 'Windows Server 2022',
    environment: 'production',
    status: 'running',
    vcpu: 8,
    ram_gb: 32,
    disk_total_gb: 200,
    tags: ['DC', 'DNS', 'Critical'],
  },
  // ... more VMs
];

// Maintenance Windows (3-6)
const professionalMaintenanceWindows = [
  {
    domainName: 'os.com',
    title: 'Windows Server Patching - Q1 2026',
    description: 'Monthly security updates for all Windows servers',
    start_time: '2026-02-15T22:00:00Z',
    end_time: '2026-02-16T06:00:00Z',
    impact_level: 'medium',
    status: 'scheduled',
  },
  // ... more windows
];

// On-Call Schedules (1-2 per domain)
const professionalOnCallSchedules = [
  {
    domainName: 'os.com',
    name: 'OS Operations On-Call',
    rotation_type: 'round_robin',
    is_active: true,
  },
  // ...
];

// Additional employees (5)
const additionalEmployees = [
  {
    email: 'mohammed.rashid@company.com',
    full_name: 'Mohammed Al-Rashid',
    department: 'IT Operations',
    position: 'IT Operations Manager',
    role: 'admin',
    domains: ['os.com', 'at.com'], // View + Edit
  },
  {
    email: 'sarah.ahmed@company.com',
    full_name: 'Sarah Ahmed',
    department: 'Network',
    position: 'Senior Network Engineer',
    role: 'admin',
    domains: ['is.com'], // View + Edit
  },
  {
    email: 'omar.hassan@company.com',
    full_name: 'Omar Hassan',
    department: 'Helpdesk',
    position: 'Helpdesk Team Lead',
    role: 'employee',
    domains: ['os.com'], // View only
  },
  {
    email: 'fatima.sayed@company.com',
    full_name: 'Fatima Al-Sayed',
    department: 'Security',
    position: 'Security Analyst',
    role: 'employee',
    domains: ['is.com'], // View only
  },
  {
    email: 'khalid.ibrahim@company.com',
    full_name: 'Khalid Ibrahim',
    department: 'Management',
    position: 'IT Director',
    role: 'super_admin',
    domains: ['os.com', 'at.com', 'is.com'], // All domains
  },
];

// Vacations (3-6)
const professionalVacations = [
  { status: 'pending', vacation_type: 'annual', start_date: '2026-03-01', end_date: '2026-03-05' },
  { status: 'approved', vacation_type: 'annual', start_date: '2026-04-10', end_date: '2026-04-15' },
  { status: 'rejected', vacation_type: 'sick', start_date: '2026-02-20', end_date: '2026-02-21' },
  // ...
];

// Employee Reports placeholders
const professionalReports = [
  { report_type: 'weekly', report_date: '2026-01-27', notes: 'Weekly progress report' },
  { report_type: 'weekly', report_date: '2026-01-20', notes: 'Weekly progress report' },
  // ...
];
```

### 2. إضافة زر "Reset Demo Data" في الإعدادات

```typescript
// Settings.tsx - للـ Super Admin فقط
{isSuperAdmin && (
  <Card>
    <CardHeader>
      <CardTitle>Demo Data Management</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <Button onClick={handleSeedData} disabled={isSeeding}>
        <Database className="w-4 h-4 me-2" />
        Seed Demo Data
      </Button>
      <Button 
        variant="destructive" 
        onClick={handleResetDemoData}
        disabled={isResetting}
      >
        <RefreshCw className="w-4 h-4 me-2" />
        Reset Demo Data
      </Button>
    </CardContent>
  </Card>
)}
```

---

## القصة الثالثة: ENT-CSR-001 — توسيع CSR Generator

### 1. إضافة الأوامر المطلوبة

```typescript
// CsrGenerator.tsx - توسيع generateOpensslCommand()

const generateAllCommands = () => {
  const safeFileName = cn.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `# ═══════════════════════════════════════════════════════════════
# Complete CSR Generation & Certificate Management Commands
# Domain: ${cn}
# Generated by IT Infrastructure Manager
# ═══════════════════════════════════════════════════════════════

# ── STEP 1: Generate CSR with Private Key ──────────────────────
# (Using configuration file)
openssl req -new -sha256 -nodes \\
  -out SSL_Request_Certificate.csr \\
  -newkey rsa:${keySize} \\
  -keyout Private_SSL_Key.pem \\
  -config csr_details.txt

# ── STEP 2: Create RSA Public Key from Private Key ─────────────
openssl rsa -in Private_SSL_Key.pem \\
  -outform PEM \\
  -pubout \\
  -out Public_SSL_Key.pem

# ── STEP 3: Convert Private Key Formats ────────────────────────
# Convert PEM to RSA format
openssl rsa -in Private_SSL_Key.pem -out server_new.key

# Export Private Key (different format)
openssl rsa -in privateKey.key -out private.pem

# ── STEP 4: Certificate Format Conversions ─────────────────────
# Convert CER (DER) to PEM
openssl x509 -inform der -in certificate.cer -out certificate.crt

# Convert PEM to DER
openssl x509 -outform der -in certificate.pem -out certificate.der

# ── STEP 5: Create PFX/PKCS12 Bundle ───────────────────────────
# Bundle certificate and private key into PFX
openssl pkcs12 -export \\
  -out certificate.pfx \\
  -inkey Private_SSL_Key.pem \\
  -in certificate.pem \\
  -certfile ca_bundle.pem

# ── STEP 6: Verify & View Certificates ─────────────────────────
# Verify CSR
openssl req -text -noout -verify -in SSL_Request_Certificate.csr

# View certificate details
openssl x509 -in certificate.pem -text -noout

# Check if private key matches certificate
openssl x509 -noout -modulus -in certificate.pem | openssl md5
openssl rsa -noout -modulus -in Private_SSL_Key.pem | openssl md5

# ═══════════════════════════════════════════════════════════════
# Windows PowerShell Commands
# ═══════════════════════════════════════════════════════════════

# List all certificates in Local Machine store
Get-ChildItem Cert:\\LocalMachine\\My | Format-List Subject, FriendlyName, NotAfter, HasPrivateKey

# Export certificate from Windows store
\$cert = Get-ChildItem Cert:\\LocalMachine\\My | Where-Object {$_.Subject -like "*${cn}*"}
Export-Certificate -Cert \$cert -FilePath "${safeFileName}.cer"

# Import PFX into Windows store
Import-PfxCertificate -FilePath "${safeFileName}.pfx" -CertStoreLocation Cert:\\LocalMachine\\My

# ═══════════════════════════════════════════════════════════════
`;
};
```

### 2. إضافة تنزيل Commands File

```typescript
// إضافة زر تحميل commands.txt
<Button 
  size="sm" 
  variant="outline"
  onClick={() => downloadFile(allCommands, 'ssl_commands.txt')}
>
  <Download className="h-4 w-4 me-2" />
  Download Commands
</Button>
```

### 3. تحديث OpenSSL Config Template

```typescript
// تحديث ليكون csr_details.txt compatible
const generateConfigFile = () => {
  return `[req]
default_bits = ${keySize}
default_md = sha256
default_keyfile = Private_SSL_Key.pem
distinguished_name = req_distinguished_name
req_extensions = req_ext
prompt = no
encrypt_key = no

[req_distinguished_name]
countryName = ${country}
stateOrProvinceName = ${state || 'State'}
localityName = ${locality || 'City'}
organizationName = ${organization || 'Organization'}
organizationalUnitName = ${organizationalUnit || 'IT Department'}
commonName = ${cn}
emailAddress = admin@${cn}

[req_ext]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
basicConstraints = CA:FALSE

[alt_names]
DNS.1 = ${cn}
${sans.map((s, i) => `${s.type}.${i + 2} = ${s.value}`).join('\n')}
`;
};
```

---

## القصة الرابعة: ENT-DOMAINS-001 — تنظيف أسماء النطاقات

### 1. تحديث seedData.ts
- التأكد من استخدام `os.com`, `at.com`, `is.com` فقط
- إزالة أي إشارات لـ `example.local` أو نطاقات تجريبية أخرى

### 2. تحديث Server naming patterns
```typescript
// الأسماء تتبع النمط: DOMAIN-ROLE-NUMBER
// مثال: OS-DC01, AT-SQL01, IS-SIEM01
```

---

## ملخص الملفات المطلوب تعديلها/إنشاؤها

| الملف | الإجراء |
|-------|---------|
| `supabase/migrations/xxx_enterprise_rbac.sql` | إنشاء - RBAC migration |
| `src/contexts/AuthContext.tsx` | تحديث - دعم super_admin |
| `src/components/auth/ProtectedRoute.tsx` | تحديث - صلاحيات جديدة |
| `src/components/layout/Sidebar.tsx` | تحديث - إخفاء عناصر بناءً على الدور |
| `supabase/functions/update-user-role/index.ts` | تحديث - دعم super_admin |
| `src/utils/seedData.ts` | إعادة كتابة شاملة |
| `src/pages/Settings.tsx` | تحديث - زر Reset Demo Data |
| `src/components/it-tools/crypto/CsrGenerator.tsx` | تحديث - أوامر إضافية |
| `src/contexts/LanguageContext.tsx` | تحديث - ترجمات RBAC |
| `src/pages/EmployeePermissions.tsx` | تحديث - Super Admin only |
| صفحات CRUD متعددة | تحديث - إخفاء أزرار للموظفين |

---

## ترتيب التنفيذ

| # | المهمة | الأولوية | التبعية |
|---|--------|----------|---------|
| 1 | Migration: Add super_admin to enum | عالية | - |
| 2 | Migration: Update helper functions | عالية | 1 |
| 3 | Migration: Update RLS policies | عالية | 2 |
| 4 | Update AuthContext | عالية | 3 |
| 5 | Update ProtectedRoute | عالية | 4 |
| 6 | Update Sidebar | عالية | 4 |
| 7 | Update EmployeePermissions | عالية | 4 |
| 8 | Update update-user-role Edge Function | عالية | 1 |
| 9 | Rewrite seedData.ts | متوسطة | - |
| 10 | Add Reset Demo Data button | متوسطة | 9 |
| 11 | Expand CsrGenerator | متوسطة | - |
| 12 | Add translations | عالية | All |
| 13 | Update CRUD pages for employee view-only | متوسطة | 4 |

---

## اختبارات القبول

### RBAC Tests
- [ ] Super Admin: CRUD كل شيء في جميع النطاقات
- [ ] Admin (os.com): CRUD في os.com فقط، محجوب من at.com/is.com
- [ ] Employee (is.com): عرض فقط في is.com، أزرار الإضافة/التعديل مخفية
- [ ] Employee & Permissions: متاح فقط لـ Super Admin

### Seed Data Tests
- [ ] 3 نطاقات فقط: os.com, at.com, is.com
- [ ] Domain Summary: بطاقات غير فارغة
- [ ] Datacenter: كلسترات + نودز + VMs
- [ ] Lifecycle Center: عناصر warranty/EOL قريبة
- [ ] جميع الصفحات تحتوي بيانات

### CSR Tool Tests
- [ ] أوامر OpenSSL الإضافية مضمنة
- [ ] أمر PowerShell مضمن
- [ ] تنزيل commands.txt يعمل
- [ ] نسخ إلى الحافظة يعمل

---

## نقاط أمنية مهمة

| النقطة | التنفيذ |
|--------|---------|
| Roles في جدول منفصل | `user_roles` table - موجود |
| لا تخزين أدوار في localStorage | Session cache فقط مع TTL |
| RLS يطبق على DB level | جميع الجداول محمية |
| Edge Functions تتحقق من الدور | Authorization header + DB check |
| UI هو طبقة عرض فقط | RLS يمنع الوصول حتى لو تم تجاوز UI |
