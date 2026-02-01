

# خطة تنفيذ موديول تحليلات المشاركات الملفية (File Share Analytics)

## نظرة عامة

موديول enterprise-grade لتحليل استخدام المجلدات المشتركة (مشابه لـ TreeSize / Folder Size Explorer) مع دعم كامل للنطاقات وأوضاع الفحص المتعددة (Agent و Direct).

---

## 1. نموذج البيانات (Database Schema)

### الجداول المطلوبة

```text
┌─────────────────────────┐
│       file_shares       │
├─────────────────────────┤
│ id (UUID, PK)           │
│ domain_id (FK→domains)  │
│ name                    │
│ share_type              │ SMB | NFS | LOCAL
│ path                    │
│ scan_mode               │ DIRECT | AGENT
│ agent_id (FK, nullable) │
│ credential_vault_id     │ FK→vault_items (nullable)
│ scan_depth              │
│ exclude_patterns        │ (text[])
│ schedule_cron           │ (nullable)
│ maintenance_window_id   │ FK (nullable)
│ is_enabled              │ (boolean)
│ created_by              │ FK→profiles
│ created_at              │
│ updated_at              │
└─────────────────────────┘
           │
           │ 1:1
           ▼
┌─────────────────────────┐
│       scan_agents       │
├─────────────────────────┤
│ id (UUID, PK)           │
│ domain_id (FK→domains)  │
│ name                    │
│ site_tag                │ (optional)
│ status                  │ ONLINE | OFFLINE
│ last_seen_at            │
│ version                 │
│ auth_token_hash         │
│ created_by              │ FK→profiles
│ created_at              │
└─────────────────────────┘
           │
           │ 1:N (via file_shares)
           ▼
┌─────────────────────────┐
│    fileshare_scans      │
├─────────────────────────┤
│ id (UUID, PK)           │
│ file_share_id (FK)      │
│ domain_id (FK)          │
│ scan_mode               │ DIRECT | AGENT
│ agent_id (FK, nullable) │
│ status                  │ QUEUED | RUNNING | SUCCESS | FAILED
│ progress_percent        │ (integer)
│ started_at              │
│ finished_at             │
│ error_code              │ ACCESS_DENIED | PATH_NOT_FOUND | TIMEOUT | IO_ERROR
│ log_text                │
│ created_by              │ FK→profiles
│ created_at              │
└─────────────────────────┘
           │
           │ 1:1
           ▼
┌─────────────────────────┐
│    scan_snapshots       │
├─────────────────────────┤
│ id (UUID, PK)           │
│ file_share_id (FK)      │
│ scan_id (FK)            │
│ total_bytes             │ (bigint)
│ total_files             │ (integer)
│ total_folders           │ (integer)
│ created_at              │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│     folder_stats        │
├─────────────────────────┤
│ id (UUID, PK)           │
│ snapshot_id (FK)        │
│ parent_id (FK, nullable)│ Self-reference for tree
│ path                    │
│ name                    │
│ depth                   │ (integer)
│ size_bytes              │ (bigint)
│ files_count             │ (integer)
│ folders_count           │ (integer)
│ percent_of_share        │ (decimal)
└─────────────────────────┘
```

### هجرة SQL

```sql
-- File Shares Table
CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('SMB', 'NFS', 'LOCAL')),
  path TEXT NOT NULL,
  scan_mode TEXT NOT NULL CHECK (scan_mode IN ('DIRECT', 'AGENT')),
  agent_id UUID REFERENCES scan_agents(id),
  credential_vault_id UUID REFERENCES vault_items(id),
  scan_depth INTEGER DEFAULT 10,
  exclude_patterns TEXT[] DEFAULT '{}',
  schedule_cron TEXT,
  maintenance_window_id UUID REFERENCES maintenance_windows(id),
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scan Agents Table
CREATE TABLE scan_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  site_tag TEXT,
  status TEXT DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE')),
  last_seen_at TIMESTAMPTZ,
  version TEXT,
  auth_token_hash TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- File Share Scans Table
CREATE TABLE fileshare_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_share_id UUID REFERENCES file_shares(id) ON DELETE CASCADE NOT NULL,
  domain_id UUID REFERENCES domains(id),
  scan_mode TEXT NOT NULL,
  agent_id UUID REFERENCES scan_agents(id),
  status TEXT DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED')),
  progress_percent INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_code TEXT,
  log_text TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan Snapshots Table
CREATE TABLE scan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_share_id UUID REFERENCES file_shares(id) ON DELETE CASCADE NOT NULL,
  scan_id UUID REFERENCES fileshare_scans(id) ON DELETE CASCADE NOT NULL,
  total_bytes BIGINT DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  total_folders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Folder Stats Table
CREATE TABLE folder_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES scan_snapshots(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES folder_stats(id),
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  size_bytes BIGINT DEFAULT 0,
  files_count INTEGER DEFAULT 0,
  folders_count INTEGER DEFAULT 0,
  percent_of_share DECIMAL(5,2) DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_file_shares_domain ON file_shares(domain_id);
CREATE INDEX idx_scan_agents_domain ON scan_agents(domain_id);
CREATE INDEX idx_fileshare_scans_share ON fileshare_scans(file_share_id);
CREATE INDEX idx_scan_snapshots_share ON scan_snapshots(file_share_id);
CREATE INDEX idx_folder_stats_snapshot ON folder_stats(snapshot_id);
CREATE INDEX idx_folder_stats_parent ON folder_stats(parent_id);

-- Enable RLS
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fileshare_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_stats ENABLE ROW LEVEL SECURITY;
```

---

## 2. سياسات RLS و RBAC

### الأدوار والصلاحيات

| الدور | file_shares | scan_agents | fileshare_scans | snapshots | folder_stats |
|-------|-------------|-------------|-----------------|-----------|--------------|
| INFRA_ADMIN (is_admin) | CRUD All | CRUD All | CRUD All | Read All | Read All |
| DOMAIN_ADMIN (via memberships) | CRUD Domain | CRUD Domain | Read/Create Domain | Read Domain | Read Domain |
| DOMAIN_VIEWER | Read Domain | Read Domain | Read Domain | Read Domain | Read Domain |

### سياسات RLS

```sql
-- file_shares policies
CREATE POLICY "Admins full access to file_shares" ON file_shares
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Domain members can view file_shares" ON file_shares
  FOR SELECT TO authenticated
  USING (is_admin() OR can_access_domain(domain_id));

CREATE POLICY "Domain editors can manage file_shares" ON file_shares
  FOR ALL TO authenticated
  USING (can_edit_domain(domain_id))
  WITH CHECK (can_edit_domain(domain_id));

-- scan_agents policies
CREATE POLICY "Admins full access to agents" ON scan_agents
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Domain members can view agents" ON scan_agents
  FOR SELECT TO authenticated
  USING (is_admin() OR can_access_domain(domain_id));

-- Validation: Agent must be in same domain as file_share
CREATE OR REPLACE FUNCTION check_agent_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_mode = 'AGENT' AND NEW.agent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM scan_agents 
      WHERE id = NEW.agent_id AND domain_id = NEW.domain_id
    ) THEN
      RAISE EXCEPTION 'Agent must belong to the same domain as file share';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_agent_same_domain
  BEFORE INSERT OR UPDATE ON file_shares
  FOR EACH ROW EXECUTE FUNCTION check_agent_domain();
```

---

## 3. دالة مساعدة جديدة: can_edit_domain

```sql
CREATE OR REPLACE FUNCTION public.can_edit_domain(_domain_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.domain_memberships dm
    JOIN public.profiles p ON p.id = dm.profile_id
    WHERE p.user_id = auth.uid() 
      AND dm.domain_id = _domain_id
      AND dm.can_edit = true
  )
$$;
```

---

## 4. هيكل الملفات

```text
src/
├── pages/
│   ├── FileShares.tsx              # القائمة الرئيسية
│   ├── FileShareDetails.tsx        # تفاصيل المشاركة
│   └── ScanAgents.tsx              # إدارة الوكلاء
├── components/
│   └── fileshares/
│       ├── FileShareList.tsx       # جدول المشاركات
│       ├── FileShareForm.tsx       # معالج الإضافة/التعديل (Wizard)
│       ├── FileShareStats.tsx      # إحصائيات ورسوم بيانية
│       ├── FolderTree.tsx          # شجرة المجلدات (lazy-loaded)
│       ├── ScanHistory.tsx         # سجل الفحوصات
│       ├── ScanProgress.tsx        # شريط التقدم
│       ├── GrowthChart.tsx         # رسم النمو
│       ├── TopFoldersChart.tsx     # أكبر 10 مجلدات
│       ├── AgentList.tsx           # قائمة الوكلاء
│       └── AgentStatus.tsx         # حالة الوكيل
├── hooks/
│   ├── useFileShares.ts            # Hook للمشاركات
│   ├── useScanAgents.ts            # Hook للوكلاء
│   ├── useFileshareScan.ts         # Hook للفحوصات
│   └── useFolderStats.ts           # Hook للإحصائيات
└── types/
    └── fileshares.ts               # تعريفات الأنواع

supabase/functions/
├── agent-register/index.ts         # تسجيل الوكيل
├── agent-poll-jobs/index.ts        # جلب المهام للوكيل
├── agent-heartbeat/index.ts        # نبضة الوكيل
├── agent-submit-results/index.ts   # رفع نتائج الفحص
├── fileshare-scan/index.ts         # بدء فحص Direct
└── fileshare-export/index.ts       # تصدير التقارير
```

---

## 5. صفحات الواجهة

### 5.1 قائمة المشاركات الملفية

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 📂 File Shares                                        [+ Add] [Export]  │
├─────────────────────────────────────────────────────────────────────────┤
│ [Filter: Domain ▼] [Filter: Type ▼] [Filter: Mode ▼] [🔍 Search...]    │
├─────────────────────────────────────────────────────────────────────────┤
│ Domain   │ Share Name   │ Type │ Mode   │ Agent  │ Last Scan │ Size   │
├──────────┼──────────────┼──────┼────────┼────────┼───────────┼────────┤
│ DC01     │ UserData$    │ SMB  │ Agent  │ AG-01  │ 2h ago    │ 2.5 TB │
│ DC01     │ Backups      │ SMB  │ Direct │ -      │ 1d ago    │ 850 GB │
│ DC02     │ AppLogs      │ NFS  │ Agent  │ AG-02  │ 4h ago    │ 125 GB │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 معالج إضافة المشاركة (Wizard)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Add File Share                                        [X Close] │
├─────────────────────────────────────────────────────────────────┤
│  Step 1    Step 2    Step 3    Step 4    Step 5    Step 6      │
│  [●]─────[●]─────[○]─────[○]─────[○]─────[○]                    │
│  Domain   Details   Mode    Creds   Options  Schedule          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📌 Step 1: Select Domain                                       │
│                                                                 │
│  Domain: [Select Domain ▼]                                      │
│                                                                 │
│                                     [Back] [Next →]             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 تفاصيل المشاركة

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 📂 UserData$ - DC01                    [Run Scan] [Edit] [Disable]     │
├─────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Folder Tree] [Scans] [Alerts] [Reports]                    │
├─────────────────────────────────────────────────────────────────────────┤
│ OVERVIEW TAB:                                                          │
│                                                                         │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│ │ Total Size │  │ Files      │  │ Folders    │  │ 30d Growth │        │
│ │   2.5 TB   │  │  1.2M      │  │   45K      │  │  +125 GB   │        │
│ └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│                                                                         │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ Top 10 Folders                  │ │ Growth Chart (7/30/90 days)    ││
│ │ ────────────────────────────────│ │ ─────────────────────────────── ││
│ │ 1. /Users/Marketing    │ 450GB │ │          ▁▂▃▅▇█▇▅▃▂▁            ││
│ │ 2. /Users/HR          │ 320GB │ │                                   ││
│ │ 3. /Shared/Archive    │ 280GB │ │                                   ││
│ │ ...                            │ │                                   ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 شجرة المجلدات (Lazy-loaded)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [Sort: Size ▼] [Filter: >1GB] [🔍 Search path...]                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 📁 /                                                    2.5 TB  100.0% │
│   ├─ 📁 Users                                           1.8 TB   72.0% │
│   │    ├─ 📁 Marketing                                  450 GB   18.0% │
│   │    │    ├─ 📁 Campaigns                             120 GB    4.8% │
│   │    │    ├─ 📁 Assets                                 95 GB    3.8% │
│   │    │    └─ 📁 Archive [+]                            ... │
│   │    ├─ 📁 HR                                         320 GB   12.8% │
│   │    └─ 📁 IT [+]                                      ... │
│   ├─ 📁 Shared                                          500 GB   20.0% │
│   └─ 📁 Backups [+]                                      ... │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Edge Functions للوكلاء (Agent APIs)

### 6.1 تسجيل الوكيل (agent-register)

```typescript
// POST /functions/v1/agent-register
// Body: { domain_id, name, site_tag, version }
// Returns: { agent_id, auth_token }

Deno.serve(async (req) => {
  const { domain_id, name, site_tag, version } = await req.json();
  
  // Generate secure token
  const authToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const tokenHash = await hashToken(authToken);
  
  // Insert agent
  const { data: agent } = await supabaseAdmin
    .from('scan_agents')
    .insert({
      domain_id,
      name,
      site_tag,
      version,
      auth_token_hash: tokenHash,
      status: 'ONLINE',
      last_seen_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  return Response.json({ agent_id: agent.id, auth_token: authToken });
});
```

### 6.2 جلب المهام (agent-poll-jobs)

```typescript
// GET /functions/v1/agent-poll-jobs?agent_id=xxx
// Header: X-Agent-Token: xxx
// Returns: { jobs: [...] }

Deno.serve(async (req) => {
  const agentId = new URL(req.url).searchParams.get('agent_id');
  const token = req.headers.get('X-Agent-Token');
  
  // Verify token
  const agent = await verifyAgentToken(agentId, token);
  if (!agent) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Update last_seen
  await supabaseAdmin
    .from('scan_agents')
    .update({ last_seen_at: new Date().toISOString(), status: 'ONLINE' })
    .eq('id', agentId);
  
  // Get queued jobs for this agent
  const { data: jobs } = await supabaseAdmin
    .from('fileshare_scans')
    .select('*, file_shares(*)')
    .eq('agent_id', agentId)
    .eq('status', 'QUEUED')
    .limit(5);
    
  return Response.json({ jobs });
});
```

### 6.3 رفع نتائج الفحص (agent-submit-results)

```typescript
// POST /functions/v1/agent-submit-results
// Body: { scan_id, snapshot, folder_stats[] }

Deno.serve(async (req) => {
  const { scan_id, snapshot, folder_stats } = await req.json();
  
  // Create snapshot
  const { data: snapshotData } = await supabaseAdmin
    .from('scan_snapshots')
    .insert({
      file_share_id: snapshot.file_share_id,
      scan_id,
      total_bytes: snapshot.total_bytes,
      total_files: snapshot.total_files,
      total_folders: snapshot.total_folders,
    })
    .select()
    .single();
    
  // Bulk insert folder stats
  const statsWithSnapshot = folder_stats.map(s => ({
    ...s,
    snapshot_id: snapshotData.id,
  }));
  
  await supabaseAdmin.from('folder_stats').insert(statsWithSnapshot);
  
  // Update scan status
  await supabaseAdmin
    .from('fileshare_scans')
    .update({ status: 'SUCCESS', finished_at: new Date().toISOString() })
    .eq('id', scan_id);
    
  return Response.json({ success: true });
});
```

---

## 7. منطق الفحص المباشر (Direct Scan)

للفحص المباشر، سيتم محاكاة النتائج في البداية (نظرًا لقيود البيئة air-gapped):

```typescript
// supabase/functions/fileshare-scan/index.ts
Deno.serve(async (req) => {
  const { file_share_id } = await req.json();
  
  // Create scan job
  const { data: scan } = await supabase
    .from('fileshare_scans')
    .insert({
      file_share_id,
      domain_id: fileShare.domain_id,
      scan_mode: 'DIRECT',
      status: 'RUNNING',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  // In production: execute actual filesystem scan
  // For now: generate sample data
  const sampleData = generateSampleFolderStats(fileShare.path);
  
  // Create snapshot & stats
  // ...
  
  return Response.json({ scan_id: scan.id });
});
```

---

## 8. تحديثات التوجيه والقائمة الجانبية

### App.tsx

```typescript
import FileShares from './pages/FileShares';
import FileShareDetails from './pages/FileShareDetails';
import ScanAgents from './pages/ScanAgents';

// Routes
<Route path="/file-shares" element={<FileShares />} />
<Route path="/file-shares/:id" element={<FileShareDetails />} />
<Route path="/scan-agents" element={<ScanAgents />} />
```

### Sidebar.tsx

```typescript
{ 
  id: 'fileShares', 
  path: '/file-shares', 
  icon: FolderKanban, 
  label: 'nav.fileShares', 
  adminOnly: true 
},
{ 
  id: 'scanAgents', 
  path: '/scan-agents', 
  icon: Bot, 
  label: 'nav.scanAgents', 
  adminOnly: true 
},
```

---

## 9. الترجمات المطلوبة

```typescript
// Arabic
'nav.fileShares': 'المشاركات الملفية',
'nav.scanAgents': 'وكلاء الفحص',
'fileShares.title': 'تحليلات المشاركات الملفية',
'fileShares.add': 'إضافة مشاركة',
'fileShares.name': 'اسم المشاركة',
'fileShares.type': 'نوع المشاركة',
'fileShares.type.smb': 'SMB (Windows)',
'fileShares.type.nfs': 'NFS (Linux)',
'fileShares.type.local': 'محلي',
'fileShares.path': 'المسار',
'fileShares.scanMode': 'وضع الفحص',
'fileShares.scanMode.direct': 'مباشر',
'fileShares.scanMode.agent': 'عبر وكيل',
'fileShares.agent': 'الوكيل',
'fileShares.selectAgent': 'اختر وكيل',
'fileShares.credential': 'بيانات الاعتماد',
'fileShares.selectCredential': 'اختر من الخزنة',
'fileShares.scanDepth': 'عمق الفحص',
'fileShares.excludePatterns': 'أنماط الاستبعاد',
'fileShares.schedule': 'الجدولة',
'fileShares.maintenanceWindow': 'نافذة الصيانة',
'fileShares.runScan': 'بدء الفحص',
'fileShares.lastScan': 'آخر فحص',
'fileShares.totalSize': 'الحجم الإجمالي',
'fileShares.filesCount': 'عدد الملفات',
'fileShares.foldersCount': 'عدد المجلدات',
'fileShares.growth': 'النمو',
'fileShares.topFolders': 'أكبر المجلدات',
'fileShares.folderTree': 'شجرة المجلدات',
'fileShares.scanHistory': 'سجل الفحوصات',
'fileShares.export': 'تصدير التقرير',

'agents.title': 'وكلاء الفحص',
'agents.add': 'تسجيل وكيل جديد',
'agents.name': 'اسم الوكيل',
'agents.status': 'الحالة',
'agents.status.online': 'متصل',
'agents.status.offline': 'غير متصل',
'agents.lastSeen': 'آخر اتصال',
'agents.version': 'الإصدار',
'agents.siteTag': 'الموقع',
'agents.token': 'رمز المصادقة',
'agents.copyToken': 'نسخ الرمز',

'scan.status.queued': 'في الانتظار',
'scan.status.running': 'قيد التنفيذ',
'scan.status.success': 'نجح',
'scan.status.failed': 'فشل',
'scan.error.access_denied': 'رفض الوصول',
'scan.error.path_not_found': 'المسار غير موجود',
'scan.error.timeout': 'انتهت المهلة',
'scan.error.io_error': 'خطأ في الإدخال/الإخراج',

// English
'nav.fileShares': 'File Shares',
'nav.scanAgents': 'Scan Agents',
'fileShares.title': 'File Share Analytics',
// ... (similar structure)
```

---

## 10. ترتيب التنفيذ

| # | المهمة | الوصف | الأولوية |
|---|--------|-------|----------|
| 1 | إنشاء هجرة قاعدة البيانات | جميع الجداول + RLS + Indexes | عالية |
| 2 | إنشاء دالة can_edit_domain | للتحقق من صلاحيات التعديل | عالية |
| 3 | إضافة الترجمات | عربي + إنجليزي | عالية |
| 4 | إنشاء صفحة FileShares | القائمة الرئيسية | عالية |
| 5 | إنشاء FileShareForm (Wizard) | معالج الإضافة/التعديل | عالية |
| 6 | إنشاء صفحة FileShareDetails | تفاصيل + شجرة المجلدات | متوسطة |
| 7 | إنشاء FolderTree component | Lazy-loaded tree view | متوسطة |
| 8 | إنشاء صفحة ScanAgents | إدارة الوكلاء | متوسطة |
| 9 | إنشاء Edge Functions | Agent APIs | متوسطة |
| 10 | إنشاء Hooks | useFileShares, useScanAgents | عالية |
| 11 | تحديث Routing | App.tsx + Sidebar | عالية |
| 12 | إنشاء GrowthChart | رسم بياني بـ Recharts | منخفضة |
| 13 | إنشاء Export Function | CSV/JSON export | منخفضة |

---

## 11. متطلبات الأمان

| المتطلب | التنفيذ |
|---------|---------|
| Agent Authentication | Token-based with hashed storage |
| Token Scope | Each token scoped to one domain |
| Credentials Never Exposed | Reference vault_items by ID only |
| Read-Only Access | Scans execute with read-only filesystem permissions |
| Audit Logging | All scan operations logged to audit_logs |
| Domain Isolation | RLS ensures cross-domain data isolation |

---

## 12. اعتبارات Air-Gapped

| الميزة | الدعم |
|--------|-------|
| Agent Pull Model | ✅ No inbound firewall rules needed |
| Offline Agents | ✅ Detected via last_seen_at |
| Local Scanning | ✅ Direct mode for local shares |
| Historical Snapshots | ✅ Retained for trend analysis |
| No External Dependencies | ✅ All processing local |

