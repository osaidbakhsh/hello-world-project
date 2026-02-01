
# خطة تنفيذ شاملة: تحديث الإعدادات + موديول Datacenter

## نظرة عامة

هذا الطلب يتضمن جزئين رئيسيين:
1. **إصلاح إعدادات القائمة الجانبية** - إضافة العناصر الجديدة المفقودة
2. **بناء موديول Datacenter** - نظام enterprise-grade لإدارة البنية التحتية

---

## الجزء الأول: تحديث إعدادات ترتيب القائمة

### المشكلة الحالية
ملف `SidebarOrderSettings.tsx` يحتوي على قائمة `defaultMenuItems` مفقود منها العناصر الجديدة:

| العنصر المفقود | الملاحظة |
|----------------|----------|
| `domainSummary` | ملخص النطاق |
| `onCall` | المناوبات |
| `maintenance` | نوافذ الصيانة |
| `lifecycle` | دورة الحياة |
| `fileShares` | المشاركات الملفية |
| `scanAgents` | وكلاء الفحص |

### الحل
تحديث `defaultMenuItems` في `src/components/settings/SidebarOrderSettings.tsx`:

```typescript
const defaultMenuItems: MenuItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', enabled: true },
  { id: 'domainSummary', labelKey: 'nav.domainSummary', enabled: true },
  { id: 'servers', labelKey: 'nav.servers', enabled: true },
  { id: 'employees', labelKey: 'nav.employees', enabled: true },
  { id: 'employeePermissions', labelKey: 'nav.employeePermissions', enabled: true },
  { id: 'vacations', labelKey: 'nav.vacations', enabled: true },
  { id: 'licenses', labelKey: 'nav.licenses', enabled: true },
  { id: 'tasks', labelKey: 'nav.tasks', enabled: true },
  { id: 'vault', labelKey: 'nav.vault', enabled: true },
  { id: 'itTools', labelKey: 'nav.itTools', enabled: true },
  { id: 'onCall', labelKey: 'nav.onCall', enabled: true },
  { id: 'maintenance', labelKey: 'nav.maintenance', enabled: true },
  { id: 'lifecycle', labelKey: 'nav.lifecycle', enabled: true },
  { id: 'fileShares', labelKey: 'nav.fileShares', enabled: true },
  { id: 'scanAgents', labelKey: 'nav.scanAgents', enabled: true },
  { id: 'networks', labelKey: 'nav.networks', enabled: true },
  { id: 'networkScan', labelKey: 'nav.networkScan', enabled: true },
  { id: 'webApps', labelKey: 'nav.webApps', enabled: true },
  { id: 'employeeReports', labelKey: 'nav.employeeReports', enabled: true },
  { id: 'reports', labelKey: 'nav.reports', enabled: true },
  { id: 'auditLog', labelKey: 'nav.auditLog', enabled: true },
  { id: 'settings', labelKey: 'nav.settings', enabled: true },
  { id: 'datacenter', labelKey: 'nav.datacenter', enabled: true }, // الجديد
];
```

---

## الجزء الثاني: موديول Datacenter

### 1. نموذج البيانات (Database Schema)

#### الجداول المطلوبة:

```text
┌─────────────────────────┐
│      datacenters        │
├─────────────────────────┤
│ id (UUID, PK)           │
│ domain_id (FK→domains)  │
│ name                    │
│ location                │ المدينة/الموقع
│ notes                   │
│ created_by              │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│       clusters          │
├─────────────────────────┤
│ id (UUID, PK)           │
│ domain_id (FK)          │
│ datacenter_id (FK)      │ nullable
│ name                    │
│ cluster_type            │ nutanix/vmware/hyperv/other
│ vendor                  │
│ platform_version        │ AOS/Prism/vSphere
│ hypervisor_version      │
│ node_count              │
│ storage_type            │ all-flash/hybrid
│ rf_level                │ RF2/RF3
│ notes                   │
│ created_by              │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│     cluster_nodes       │
├─────────────────────────┤
│ id (UUID, PK)           │
│ cluster_id (FK)         │
│ domain_id (FK)          │ للـ RLS
│ name                    │
│ node_role               │ compute/storage
│ serial_number           │
│ model                   │
│ vendor                  │
│ cpu_sockets             │
│ cpu_cores               │
│ ram_gb                  │
│ storage_total_tb        │
│ storage_used_tb         │
│ mgmt_ip                 │
│ ilo_idrac_ip            │
│ status                  │ active/maintenance/decommissioned
│ server_ref_id (FK)      │ nullable → servers.id
│ created_at              │
│ updated_at              │
└─────────────────────────┘
           │
           │ hosts
           ▼
┌─────────────────────────┐
│          vms            │
├─────────────────────────┤
│ id (UUID, PK)           │
│ domain_id (FK)          │
│ cluster_id (FK)         │
│ host_node_id (FK)       │ nullable
│ name                    │
│ ip_address              │
│ os                      │
│ environment             │ prod/dev/dr/test
│ status                  │ running/stopped/suspended
│ vcpu                    │
│ ram_gb                  │
│ disk_total_gb           │
│ tags                    │ text[]
│ owner_department        │
│ beneficiary             │ business owner
│ server_ref_id (FK)      │ nullable → servers.id
│ created_at              │
│ updated_at              │
└─────────────────────────┘

┌─────────────────────────┐
│    infra_snapshots      │ (للتوقعات)
├─────────────────────────┤
│ id (UUID, PK)           │
│ domain_id (FK)          │
│ cluster_id (FK)         │
│ captured_at             │
│ total_cpu_cores         │
│ used_cpu_cores          │
│ total_ram_gb            │
│ used_ram_gb             │
│ total_storage_tb        │
│ used_storage_tb         │
│ notes                   │
└─────────────────────────┘
```

### 2. هجرة SQL

```sql
-- Datacenters Table
CREATE TABLE datacenters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clusters Table
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  datacenter_id UUID REFERENCES datacenters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cluster_type TEXT CHECK (cluster_type IN ('nutanix', 'vmware', 'hyperv', 'other')),
  vendor TEXT,
  platform_version TEXT,
  hypervisor_version TEXT,
  node_count INTEGER DEFAULT 0,
  storage_type TEXT CHECK (storage_type IN ('all-flash', 'hybrid', 'hdd')),
  rf_level TEXT CHECK (rf_level IN ('RF2', 'RF3')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cluster Nodes Table
CREATE TABLE cluster_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  node_role TEXT CHECK (node_role IN ('compute', 'storage', 'hybrid')) DEFAULT 'hybrid',
  serial_number TEXT,
  model TEXT,
  vendor TEXT,
  cpu_sockets INTEGER,
  cpu_cores INTEGER,
  ram_gb INTEGER,
  storage_total_tb DECIMAL(10,2),
  storage_used_tb DECIMAL(10,2),
  mgmt_ip TEXT,
  ilo_idrac_ip TEXT,
  status TEXT CHECK (status IN ('active', 'maintenance', 'decommissioned')) DEFAULT 'active',
  server_ref_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VMs Table
CREATE TABLE vms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  host_node_id UUID REFERENCES cluster_nodes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  ip_address TEXT,
  os TEXT,
  environment TEXT CHECK (environment IN ('production', 'development', 'testing', 'staging', 'dr')) DEFAULT 'production',
  status TEXT CHECK (status IN ('running', 'stopped', 'suspended', 'template')) DEFAULT 'running',
  vcpu INTEGER,
  ram_gb INTEGER,
  disk_total_gb INTEGER,
  tags TEXT[] DEFAULT '{}',
  owner_department TEXT,
  beneficiary TEXT,
  server_ref_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Infra Snapshots Table (للتوقعات)
CREATE TABLE infra_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  captured_at TIMESTAMPTZ DEFAULT now(),
  total_cpu_cores INTEGER DEFAULT 0,
  used_cpu_cores INTEGER DEFAULT 0,
  total_ram_gb INTEGER DEFAULT 0,
  used_ram_gb INTEGER DEFAULT 0,
  total_storage_tb DECIMAL(10,2) DEFAULT 0,
  used_storage_tb DECIMAL(10,2) DEFAULT 0,
  notes TEXT
);

-- Indexes
CREATE INDEX idx_datacenters_domain ON datacenters(domain_id);
CREATE INDEX idx_clusters_domain ON clusters(domain_id);
CREATE INDEX idx_clusters_datacenter ON clusters(datacenter_id);
CREATE INDEX idx_cluster_nodes_cluster ON cluster_nodes(cluster_id);
CREATE INDEX idx_cluster_nodes_domain ON cluster_nodes(domain_id);
CREATE INDEX idx_vms_cluster ON vms(cluster_id);
CREATE INDEX idx_vms_domain ON vms(domain_id);
CREATE INDEX idx_infra_snapshots_cluster ON infra_snapshots(cluster_id);

-- Enable RLS
ALTER TABLE datacenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vms ENABLE ROW LEVEL SECURITY;
ALTER TABLE infra_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as file_shares)
CREATE POLICY "Admins full access" ON datacenters
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Domain members can view" ON datacenters
  FOR SELECT TO authenticated USING (is_admin() OR can_access_domain(domain_id));

-- Similar policies for all tables...
```

### 3. هيكل الملفات

```text
src/
├── pages/
│   └── Datacenter.tsx              # الصفحة الرئيسية
├── components/
│   └── datacenter/
│       ├── DatacenterOverview.tsx  # Dashboard KPIs
│       ├── ClusterCard.tsx         # بطاقة الكلستر
│       ├── ClusterForm.tsx         # إضافة/تعديل كلستر
│       ├── NodeTable.tsx           # جدول النودز
│       ├── NodeForm.tsx            # إضافة/تعديل نود
│       ├── VMTable.tsx             # جدول VMs
│       ├── VMForm.tsx              # إضافة/تعديل VM
│       ├── TopologyView.tsx        # خريطة الهيكل
│       ├── CapacityCharts.tsx      # رسوم السعة
│       └── CompletenessScore.tsx   # نسبة اكتمال البيانات
├── hooks/
│   └── useDatacenter.ts            # Hook للبيانات
└── types/
    └── datacenter.ts               # تعريفات الأنواع
```

### 4. تصميم الواجهة

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏢 Datacenter                            [Domain ▼] [Datacenter ▼]        │
│ Infrastructure Blueprint                 [+ Cluster] [Import] [Export]    │
├────────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Physical] [Virtualization] [Topology]                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ OVERVIEW TAB:                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ Clusters │ │ Nodes    │ │ VMs      │ │ RAM      │ │ Storage  │          │
│ │    3     │ │   12     │ │   87     │ │320/512GB │ │12.5/20TB │          │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                            │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐   │
│ │ Version Inventory               │ │ Completeness Score: 85%         │   │
│ │ ─────────────────────────────── │ │ ─────────────────────────────── │   │
│ │ VMware 8.0 │ ESXi 8.0 │ RF3    │ │ ████████████████░░░░ 85%       │   │
│ │ Nutanix AOS│ AHV 5.20 │ RF2    │ │ Nodes with serial: 10/12       │   │
│ │                                 │ │ VMs linked to cluster: 85/87    │   │
│ └─────────────────────────────────┘ └─────────────────────────────────┘   │
│                                                                            │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ Clusters Overview                                                     │ │
│ │ ───────────────────────────────────────────────────────────────────── │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │ │
│ │ │ PRD-CLUSTER1 │ │ DEV-CLUSTER1 │ │ DR-CLUSTER1  │                   │ │
│ │ │ VMware 8.0   │ │ Nutanix AOS  │ │ VMware 8.0   │                   │ │
│ │ │ 4 Nodes      │ │ 3 Nodes      │ │ 4 Nodes      │                   │ │
│ │ │ 45 VMs       │ │ 22 VMs       │ │ 20 VMs       │                   │ │
│ │ │ CPU: 78%     │ │ CPU: 45%     │ │ CPU: 12%     │                   │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘                   │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘

PHYSICAL TAB (Nodes):
┌────────────────────────────────────────────────────────────────────────────┐
│ [Filter: Cluster ▼] [Status ▼] [Vendor ▼] [🔍 Search...]                   │
├────────────────────────────────────────────────────────────────────────────┤
│ Name      │ Cluster  │ Role    │ CPU    │ RAM   │ Storage │ Status       │
├───────────┼──────────┼─────────┼────────┼───────┼─────────┼──────────────┤
│ ESXi-01   │ PRD-CL1  │ Compute │ 64c/2s │ 512GB │ 10TB    │ 🟢 Active    │
│ ESXi-02   │ PRD-CL1  │ Compute │ 64c/2s │ 512GB │ 10TB    │ 🟢 Active    │
│ NTX-01    │ DEV-CL1  │ Hybrid  │ 32c/2s │ 256GB │ 5TB     │ 🟡 Maint     │
└────────────────────────────────────────────────────────────────────────────┘

VIRTUALIZATION TAB (VMs):
┌────────────────────────────────────────────────────────────────────────────┐
│ [Filter: Cluster ▼] [Environment ▼] [OS ▼] [🔍 Search...]                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Name      │ Cluster  │ Host    │ vCPU │ RAM  │ Disk  │ Env  │ Status     │
├───────────┼──────────┼─────────┼──────┼──────┼───────┼──────┼────────────┤
│ DC01      │ PRD-CL1  │ ESXi-01 │ 8    │ 32GB │ 100GB │ Prod │ 🟢 Running │
│ AppSrv01  │ PRD-CL1  │ ESXi-02 │ 4    │ 16GB │ 80GB  │ Prod │ 🟢 Running │
│ TestDB    │ DEV-CL1  │ NTX-02  │ 2    │ 8GB  │ 50GB  │ Test │ ⏹️ Stopped │
└────────────────────────────────────────────────────────────────────────────┘

TOPOLOGY TAB:
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏢 Domain: COMPANY.LOCAL                                                   │
│ └─ 📍 Datacenter: DC-RIYADH                                               │
│     ├─ 🖥️ PRD-CLUSTER1 (VMware)                                           │
│     │   ├─ 📦 ESXi-01 [4 VMs]                                             │
│     │   │   ├─ 💻 DC01 (Windows Server)                                   │
│     │   │   ├─ 💻 AppSrv01 (Windows Server)                               │
│     │   │   └─ ...                                                        │
│     │   └─ 📦 ESXi-02 [3 VMs]                                             │
│     ├─ 🖥️ DEV-CLUSTER1 (Nutanix)                                          │
│     │   └─ ...                                                            │
│     └─ 🖥️ DR-CLUSTER1 (VMware)                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5. الترجمات المطلوبة

```typescript
// Arabic
'nav.datacenter': 'مركز البيانات',
'datacenter.title': 'البنية التحتية',
'datacenter.subtitle': 'إدارة الكلسترات والنودز والأجهزة الافتراضية',
'datacenter.clusters': 'الكلسترات',
'datacenter.nodes': 'النودز',
'datacenter.vms': 'الأجهزة الافتراضية',
'datacenter.addCluster': 'إضافة كلستر',
'datacenter.addNode': 'إضافة نود',
'datacenter.addVM': 'إضافة VM',
'datacenter.clusterType': 'نوع الكلستر',
'datacenter.platformVersion': 'إصدار المنصة',
'datacenter.hypervisorVersion': 'إصدار الهايبرفايزر',
'datacenter.storageType': 'نوع التخزين',
'datacenter.rfLevel': 'مستوى RF',
'datacenter.cpuCores': 'أنوية CPU',
'datacenter.ramGb': 'الذاكرة (GB)',
'datacenter.storageTb': 'التخزين (TB)',
'datacenter.mgmtIp': 'IP الإدارة',
'datacenter.iloIp': 'iLO/iDRAC IP',
'datacenter.vcpu': 'vCPU',
'datacenter.environment': 'البيئة',
'datacenter.production': 'إنتاج',
'datacenter.development': 'تطوير',
'datacenter.testing': 'اختبار',
'datacenter.dr': 'التعافي من الكوارث',
'datacenter.overview': 'نظرة عامة',
'datacenter.physical': 'الطبقة الفيزيائية',
'datacenter.virtualization': 'الافتراضية',
'datacenter.topology': 'الهيكل',
'datacenter.completeness': 'نسبة الاكتمال',
'datacenter.totalCapacity': 'السعة الإجمالية',
'datacenter.usedCapacity': 'السعة المستخدمة',
'datacenter.availableCapacity': 'السعة المتاحة',
'datacenter.nodeRole': 'دور النود',
'datacenter.compute': 'حوسبة',
'datacenter.storage': 'تخزين',
'datacenter.hybrid': 'مختلط',
'datacenter.serialNumber': 'الرقم التسلسلي',
'datacenter.model': 'الموديل',
'datacenter.vendor': 'المصنع',
'datacenter.beneficiary': 'المستفيد',
'datacenter.ownerDepartment': 'القسم المالك',
'datacenter.running': 'يعمل',
'datacenter.stopped': 'متوقف',
'datacenter.suspended': 'معلق',
'datacenter.allFlash': 'All-Flash',
'datacenter.hybridStorage': 'Hybrid',
'datacenter.nutanix': 'Nutanix',
'datacenter.vmware': 'VMware',
'datacenter.hyperv': 'Hyper-V',
'datacenter.other': 'أخرى',

// English equivalents...
```

### 6. قوالب الاستيراد (Excel Templates)

```typescript
// في excelTemplates.ts - إضافة 3 قوالب:

export const downloadClusterTemplate = () => {
  // Cluster import template
};

export const downloadNodeTemplate = () => {
  // Node import template  
};

export const downloadVMTemplate = () => {
  // VM import template
};
```

### 7. استراتيجية الربط مع جدول Servers

| الخيار | الوصف |
|--------|-------|
| `server_ref_id` | FK اختياري في `cluster_nodes` و `vms` يشير إلى `servers.id` |
| الفائدة | إعادة استخدام بيانات السيرفر الموجودة دون تكرار |
| التطبيق | عند إنشاء VM أو Node، يمكن ربطه بسجل server موجود أو تركه فارغاً |

---

## ترتيب التنفيذ

| # | المهمة | الأولوية |
|---|--------|----------|
| 1 | تحديث `SidebarOrderSettings.tsx` | عالية |
| 2 | إنشاء هجرة قاعدة البيانات (5 جداول) | عالية |
| 3 | إضافة RLS policies | عالية |
| 4 | إنشاء Types و Hooks | عالية |
| 5 | إضافة Sidebar entry + Route | عالية |
| 6 | إنشاء صفحة Datacenter الرئيسية | عالية |
| 7 | إنشاء Overview tab (KPIs + Charts) | متوسطة |
| 8 | إنشاء Physical tab (Nodes) | متوسطة |
| 9 | إنشاء Virtualization tab (VMs) | متوسطة |
| 10 | إنشاء Topology tab | متوسطة |
| 11 | إنشاء Forms (Cluster/Node/VM) | متوسطة |
| 12 | إضافة قوالب Excel للاستيراد | منخفضة |
| 13 | إضافة تصدير PDF/Excel | منخفضة |
| 14 | إضافة الترجمات | عالية |

---

## الملفات المطلوب تعديلها/إنشاؤها

| الملف | الإجراء |
|-------|---------|
| `src/components/settings/SidebarOrderSettings.tsx` | تحديث - إضافة العناصر المفقودة |
| `src/components/layout/Sidebar.tsx` | تحديث - إضافة datacenter entry |
| `src/App.tsx` | تحديث - إضافة route |
| `src/contexts/LanguageContext.tsx` | تحديث - إضافة ترجمات |
| `supabase/migrations/xxx_datacenter.sql` | إنشاء جديد |
| `src/types/datacenter.ts` | إنشاء جديد |
| `src/hooks/useDatacenter.ts` | إنشاء جديد |
| `src/pages/Datacenter.tsx` | إنشاء جديد |
| `src/components/datacenter/*.tsx` | إنشاء جديد (8-10 ملفات) |
| `src/utils/excelTemplates.ts` | تحديث - إضافة 3 قوالب |

---

## متطلبات الأمان

| المتطلب | التنفيذ |
|---------|---------|
| Domain Isolation | RLS باستخدام `can_access_domain()` |
| Admin Full Access | سياسة `is_admin()` |
| No Cross-Domain Leakage | فلترة بـ `domain_id` في كل استعلام |
| Read-Only for Viewers | سياسات SELECT منفصلة عن ALL |

---

## الأداء

| الميزة | التنفيذ |
|--------|---------|
| Efficient Queries | JOIN مع تحميل العلاقات في استعلام واحد |
| Caching | React Query مع TTL قصير |
| Lazy Loading | تحميل VMs عند فتح الكلستر |
| No External APIs | عمل كامل في بيئات معزولة |
