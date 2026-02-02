

# Comprehensive Revision Plan

## Delta Summary (Changes from Previously Approved Plan)

This revision adds critical fixes and enhancements to the previously implemented modules:

| Module | Previously Approved | This Revision Adds |
|--------|--------------------|--------------------|
| Datacenter/Clusters | Basic ClusterTable created | Fix delete guardrails (prevent if nodes/VMs exist), add Clusters tab in main page, domain selector in ClusterForm, edit/delete actions in overview cards |
| Datacenter Completeness | Placeholders showing | Fix Arabic translations, compute real metrics with progress bars |
| Network Scan | Basic simulated scan | Advanced Discovery mode for air-gapped networks, agent-based subnet discovery, CSV export, max-host guardrails |
| System Health | Label not translated | Add Arabic translation for nav.systemHealth |
| Procurement | Basic CRUD created | Add dashboard KPIs, sample data generator (super_admin only), "Uploaded By" display, employee filter, Excel/CSV export |
| Sidebar | Items registered | Move Procurement + System Health under Settings group, update SidebarOrderSettings |
| Mail Test | Edge function created | Already implemented - no changes needed |

---

## Phase 1: Datacenter Cluster Management Enhancements

### 1.1 Fix Missing Arabic Translation for nav.systemHealth

**File:** `src/contexts/LanguageContext.tsx`

**Location:** Arabic section (around line 267)

**Add:**
```javascript
'nav.systemHealth': 'صحة النظام',
```

### 1.2 Fix Missing Datacenter Translations

**File:** `src/contexts/LanguageContext.tsx`

**Add to Arabic section:**
```javascript
'datacenter.nodesWithSerial': 'النودات مع الرقم التسلسلي',
'datacenter.vmsLinked': 'الأجهزة الافتراضية المرتبطة',
'datacenter.completenessDesc': 'مستوى اكتمال بيانات البنية التحتية',
'datacenter.completenessScore': 'نسبة الاكتمال',
'datacenter.noSerialTooltip': 'أضف الرقم التسلسلي للنود',
'datacenter.noVmLinkTooltip': 'اربط الجهاز الافتراضي بسيرفر مرجعي',
```

### 1.3 Add Clusters Tab to Datacenter Page

**File:** `src/pages/Datacenter.tsx`

**Changes:**
- Import `ClusterTable` component
- Add new tab "Clusters" between "Datacenters" and "Physical"
- Tab icon: `Layers` or `Server`

```jsx
<TabsTrigger value="clusters" className="gap-2">
  <Layers className="w-4 h-4" />
  {t('datacenter.clustersTab')}
</TabsTrigger>

<TabsContent value="clusters">
  <ClusterTable domainId={selectedDomainId} />
</TabsContent>
```

### 1.4 Enhance ClusterTable with Delete Guardrails

**File:** `src/components/datacenter/ClusterTable.tsx`

**Changes:**
- Before delete, check if cluster has linked nodes or VMs
- If yes, show error message with count instead of proceeding
- Display clear reason: "Cannot delete - X nodes and Y VMs are linked"

```typescript
const attemptDelete = (cluster: Cluster) => {
  const stats = getClusterStats(cluster.id);
  if (stats.nodesCount > 0 || stats.vmsCount > 0) {
    toast({
      title: language === 'ar' ? 'لا يمكن الحذف' : 'Cannot Delete',
      description: language === 'ar' 
        ? `هذا الكلستر مرتبط بـ ${stats.nodesCount} نود و ${stats.vmsCount} جهاز افتراضي`
        : `This cluster has ${stats.nodesCount} nodes and ${stats.vmsCount} VMs linked`,
      variant: 'destructive',
    });
    return;
  }
  setClusterToDelete(cluster);
  setDeleteDialogOpen(true);
};
```

### 1.5 Add Domain Selector to ClusterForm

**File:** `src/components/datacenter/ClusterForm.tsx`

**Changes:**
- Add domain selector as FIRST field
- Filter datacenters dropdown by selected domain
- Update hook to fetch datacenters for selected domain

```jsx
// Props update
interface Props {
  domainId?: string;  // Made optional
  onClose: () => void;
}

// Add state for selected domain
const [selectedDomainId, setSelectedDomainId] = useState(domainId || '');
const { data: domains } = useDomains();
const { data: datacenters } = useDatacenters(selectedDomainId);

// First field in form
<div className="space-y-2">
  <Label>{t('common.domain')} *</Label>
  <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
    <SelectTrigger>
      <SelectValue placeholder={t('common.selectDomain')} />
    </SelectTrigger>
    <SelectContent>
      {domains?.map(d => (
        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 1.6 Enhance DatacenterOverview with Real Completeness Metrics

**File:** `src/components/datacenter/DatacenterOverview.tsx`

**Changes:**
- Pass nodes and VMs data as props (or fetch via hooks)
- Compute actual metrics:
  - Nodes with serial: `nodes.filter(n => n.serial_number).length / nodes.length`
  - VMs linked to server: `vms.filter(v => v.server_ref_id).length / vms.length`
- Display with progress bars and tooltips

```jsx
// Import hooks
import { useClusterNodes, useVMs } from '@/hooks/useDatacenter';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Inside component
const { data: nodes } = useClusterNodes(domainId);
const { data: vms } = useVMs(domainId);

const nodesWithSerial = nodes?.filter(n => n.serial_number).length || 0;
const totalNodes = nodes?.length || 0;
const nodesSerialPercent = totalNodes > 0 ? Math.round((nodesWithSerial / totalNodes) * 100) : 0;

const vmsLinked = vms?.filter(v => v.server_ref_id).length || 0;
const totalVMs = vms?.length || 0;
const vmsLinkedPercent = totalVMs > 0 ? Math.round((vmsLinked / totalVMs) * 100) : 0;

// In completeness card
<div className="space-y-4">
  <div>
    <div className="flex items-center justify-between mb-2">
      <span>{t('datacenter.nodesWithSerial')}</span>
      <span className="font-medium">{nodesWithSerial} / {totalNodes} ({nodesSerialPercent}%)</span>
    </div>
    <Progress value={nodesSerialPercent} className="h-2" />
  </div>
  <div>
    <div className="flex items-center justify-between mb-2">
      <span>{t('datacenter.vmsLinked')}</span>
      <span className="font-medium">{vmsLinked} / {totalVMs} ({vmsLinkedPercent}%)</span>
    </div>
    <Progress value={vmsLinkedPercent} className="h-2" />
  </div>
</div>
```

### 1.7 Add Edit/Delete Actions to Cluster Cards in Overview

**File:** `src/components/datacenter/DatacenterOverview.tsx`

**Changes:**
- Add Edit and Delete buttons to cluster cards
- Only visible to admin/super_admin
- Use same delete guardrail logic

```jsx
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const { isAdmin, isSuperAdmin } = useAuth();

// In cluster card
{(isAdmin || isSuperAdmin) && (
  <div className="flex gap-1 mt-3 pt-3 border-t">
    <Button size="sm" variant="ghost" onClick={() => onEditCluster(cluster)}>
      <Pencil className="w-4 h-4" />
    </Button>
    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteCluster(cluster)}>
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
)}
```

---

## Phase 2: Network Scan Advanced Discovery Mode

### 2.1 Add Scan Mode Selection

**File:** `src/pages/NetworkScan.tsx`

**Add new state and UI:**
```typescript
const [scanMode, setScanMode] = useState<'standard' | 'advanced'>('standard');
const [maxHosts, setMaxHosts] = useState(254);
const [discoveredSubnets, setDiscoveredSubnets] = useState<string[]>([]);
const [selectedSubnets, setSelectedSubnets] = useState<string[]>([]);
```

**UI Changes:**
```jsx
<div className="space-y-2">
  <Label>{language === 'ar' ? 'وضع الفحص' : 'Scan Mode'}</Label>
  <Select value={scanMode} onValueChange={(v: any) => setScanMode(v)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="standard">{language === 'ar' ? 'قياسي' : 'Standard'}</SelectItem>
      <SelectItem value="advanced">{language === 'ar' ? 'اكتشاف متقدم' : 'Advanced Discovery'}</SelectItem>
    </SelectContent>
  </Select>
</div>

{scanMode === 'advanced' && (
  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
    <p className="text-sm text-muted-foreground">
      {language === 'ar' 
        ? 'سيتم اكتشاف الشبكات الفرعية المتاحة عبر الوكيل'
        : 'Available subnets will be discovered via agent'}
    </p>
    <div className="flex gap-2">
      <div className="space-y-2 flex-1">
        <Label>{language === 'ar' ? 'الحد الأقصى للأجهزة' : 'Max Hosts per Subnet'}</Label>
        <Input 
          type="number" 
          value={maxHosts} 
          onChange={e => setMaxHosts(Math.min(1000, parseInt(e.target.value) || 254))}
          max={1000}
        />
      </div>
    </div>
    {/* Show discovered subnets as checkboxes */}
    {discoveredSubnets.length > 0 && (
      <div className="space-y-2">
        <Label>{language === 'ar' ? 'الشبكات المكتشفة' : 'Discovered Subnets'}</Label>
        {discoveredSubnets.map(subnet => (
          <div key={subnet} className="flex items-center gap-2">
            <Checkbox 
              checked={selectedSubnets.includes(subnet)}
              onCheckedChange={(checked) => {
                if (checked) setSelectedSubnets([...selectedSubnets, subnet]);
                else setSelectedSubnets(selectedSubnets.filter(s => s !== subnet));
              }}
            />
            <span>{subnet}</span>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### 2.2 Add Guardrail for Large Scans

```typescript
const estimateHostCount = (cidr: string) => {
  const prefix = parseInt(cidr.split('/')[1]) || 24;
  return Math.pow(2, 32 - prefix);
};

// Before starting scan
if (scanMode === 'standard' && estimateHostCount(ipRange) > 1000) {
  toast({
    title: language === 'ar' ? 'تحذير' : 'Warning',
    description: language === 'ar' 
      ? `هذا النطاق يحتوي على ${estimateHostCount(ipRange)} عنوان. هل تريد المتابعة؟`
      : `This range contains ${estimateHostCount(ipRange)} addresses. Continue?`,
    variant: 'destructive',
  });
  return;
}
```

### 2.3 Add CSV Export for Results

**File:** `src/pages/NetworkScan.tsx`

```typescript
const exportToCsv = () => {
  if (!scanResults.length) return;
  
  const headers = ['IP Address', 'Hostname', 'OS Type', 'Device Type', 'Open Ports', 'Status'];
  const rows = scanResults.map(r => [
    r.ip_address,
    r.hostname || '',
    r.os_type || '',
    r.device_type,
    r.open_ports.join(';'),
    existingServers.some(s => s.ip_address === r.ip_address) ? 'Existing' : 'New'
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `network-scan-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
};

// Add button in results header
<Button variant="outline" size="sm" onClick={exportToCsv} className="gap-2">
  <FileDown className="w-4 h-4" />
  {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
</Button>
```

### 2.4 Agent-Based Discovery (Air-Gapped Support)

For air-gapped environments, the scan should leverage the existing `scan_agents` infrastructure:

```typescript
const discoverSubnets = async () => {
  // If agent is available for this domain, use it
  const { data: agents } = await supabase
    .from('scan_agents')
    .select('*')
    .eq('domain_id', selectedDomainId)
    .eq('status', 'online')
    .limit(1);
  
  if (agents?.length) {
    // Create discovery job for agent
    const { data: job } = await supabase
      .from('scan_jobs')
      .insert({
        name: 'Subnet Discovery',
        domain_id: selectedDomainId,
        scan_mode: 'discovery',
        agent_id: agents[0].id,
        status: 'queued',
      })
      .select()
      .single();
    
    toast({
      title: language === 'ar' ? 'جاري الاكتشاف' : 'Discovery Started',
      description: language === 'ar' 
        ? 'الوكيل سيقوم باكتشاف الشبكات الفرعية'
        : 'Agent will discover available subnets',
    });
  } else {
    // No agent - use default private subnets
    setDiscoveredSubnets(['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24']);
  }
};
```

---

## Phase 3: Procurement Module Enhancements

### 3.1 Add Dashboard KPIs to Procurement List

**File:** `src/pages/Procurement.tsx`

**Add KPI cards above the table:**
```jsx
// Compute stats
const stats = useMemo(() => ({
  total: requests?.length || 0,
  draft: requests?.filter(r => r.status === 'draft').length || 0,
  pending: requests?.filter(r => ['submitted', 'under_review'].includes(r.status)).length || 0,
  approved: requests?.filter(r => r.status === 'approved').length || 0,
  rejected: requests?.filter(r => r.status === 'rejected').length || 0,
}), [requests]);

// KPI Cards
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</p>
      <p className="text-2xl font-bold">{stats.total}</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{t('procurement.status.draft')}</p>
      <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
      <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{t('procurement.status.approved')}</p>
      <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{t('procurement.status.rejected')}</p>
      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
    </CardContent>
  </Card>
</div>
```

### 3.2 Add Sample Data Generator (Super Admin Only)

**File:** `src/pages/Procurement.tsx`

```jsx
import { useAuth } from '@/contexts/AuthContext';

const { isSuperAdmin, profile } = useAuth();
const [showSampleDialog, setShowSampleDialog] = useState(false);
const [isGenerating, setIsGenerating] = useState(false);

const generateSampleData = async () => {
  if (!selectedDomainId || selectedDomainId === 'all') {
    toast({ title: t('common.error'), description: language === 'ar' ? 'اختر نطاقاً محدداً' : 'Select a specific domain', variant: 'destructive' });
    return;
  }
  
  setIsGenerating(true);
  try {
    // Generate request number
    const { data: requestNumber } = await supabase.rpc('generate_procurement_request_number', { p_domain_id: selectedDomainId });
    
    // Create sample request
    const { data: request } = await supabase
      .from('procurement_requests')
      .insert({
        domain_id: selectedDomainId,
        request_number: requestNumber,
        title: language === 'ar' ? 'طلب تجريبي - أجهزة حاسوب' : 'Sample Request - Computer Equipment',
        description: language === 'ar' ? 'طلب تجريبي لأغراض الاختبار' : 'Sample request for testing purposes',
        status: 'draft',
        priority: 'medium',
        currency: 'SAR',
        created_by: profile?.id,
      })
      .select()
      .single();
    
    // Add sample items
    await supabase.from('procurement_request_items').insert([
      { request_id: request.id, item_name: 'Laptop Dell XPS 15', quantity: 5, unit: 'pcs', estimated_unit_price: 5500 },
      { request_id: request.id, item_name: 'Monitor 27"', quantity: 10, unit: 'pcs', estimated_unit_price: 1200 },
      { request_id: request.id, item_name: 'USB-C Dock', quantity: 5, unit: 'pcs', estimated_unit_price: 350 },
    ]);
    
    // Add activity log
    await supabase.from('procurement_activity_logs').insert({
      request_id: request.id,
      actor_profile_id: profile?.id,
      action: 'created',
      details: { source: 'sample_generator' },
    });
    
    toast({ title: t('common.success'), description: language === 'ar' ? 'تم إنشاء البيانات التجريبية' : 'Sample data created' });
    queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
  } catch (error: any) {
    toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
  } finally {
    setIsGenerating(false);
    setShowSampleDialog(false);
  }
};

// Button (only for super_admin)
{isSuperAdmin && (
  <Button variant="outline" onClick={() => setShowSampleDialog(true)} className="gap-2">
    <Database className="w-4 h-4" />
    {language === 'ar' ? 'بيانات تجريبية' : 'Sample Data'}
  </Button>
)}
```

### 3.3 Add "Created By" Display and Employee Filter

**File:** `src/pages/Procurement.tsx`

**Add to table:**
```jsx
<TableHead>{language === 'ar' ? 'المنشئ' : 'Created By'}</TableHead>

// In row
<TableCell>{request.profiles?.full_name || '-'}</TableCell>
```

**Add employee filter (for admins):**
```jsx
const { data: employees } = useQuery({
  queryKey: ['employees_for_filter'],
  queryFn: async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
    return data;
  },
  enabled: isAdmin,
});

const [employeeFilter, setEmployeeFilter] = useState<string>('all');

// Filter UI
{isAdmin && (
  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder={language === 'ar' ? 'جميع الموظفين' : 'All Employees'} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{language === 'ar' ? 'جميع الموظفين' : 'All Employees'}</SelectItem>
      {employees?.map(e => (
        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}

// Apply filter
const filteredRequests = requests?.filter(r => 
  (!searchQuery || r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) || r.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
  (employeeFilter === 'all' || r.created_by === employeeFilter)
);
```

### 3.4 Add Excel/CSV Export

**File:** `src/pages/Procurement.tsx`

```typescript
import * as XLSX from 'xlsx';

const exportToExcel = () => {
  if (!filteredRequests?.length) return;
  
  const data = filteredRequests.map(r => ({
    'Request Number': r.request_number,
    'Title': r.title,
    'Domain': r.domains?.name,
    'Status': r.status,
    'Priority': r.priority,
    'Created By': r.profiles?.full_name,
    'Needed By': r.needed_by || '',
    'Created At': format(new Date(r.created_at), 'yyyy-MM-dd'),
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Procurement Requests');
  XLSX.writeFile(wb, `procurement-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// Button
<Button variant="outline" onClick={exportToExcel} className="gap-2">
  <FileDown className="w-4 h-4" />
  {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
</Button>
```

### 3.5 Show Uploader Name in Quotation Cards

**File:** `src/pages/ProcurementDetail.tsx`

The quotation already fetches `profiles(full_name)` via the hook. Add display:

```jsx
// In quotation card
{q.profiles?.full_name && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{language === 'ar' ? 'رفعه' : 'Uploaded by'}</span>
    <span>{q.profiles.full_name}</span>
  </div>
)}
```

---

## Phase 4: Sidebar Reorganization

### 4.1 Move Procurement & System Health Under Settings

The sidebar currently has a flat structure. Based on the user request, we need to group items conceptually but the current implementation doesn't support nested menus.

**Alternative Approach:** Reorder items so Procurement and System Health appear just before Settings in the sidebar:

**File:** `src/components/layout/Sidebar.tsx`

**Reorder allMenuItems:**
```typescript
const allMenuItems: MenuItem[] = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
  { id: 'domainSummary', path: '/domain-summary', icon: Building2, label: 'nav.domainSummary', adminOnly: true },
  { id: 'datacenter', path: '/datacenter', icon: Server, label: 'nav.datacenter', adminOnly: true },
  { id: 'servers', path: '/servers', icon: Server, label: 'nav.servers' },
  { id: 'employees', path: '/employees', icon: Users, label: 'nav.employees', adminOnly: true },
  { id: 'employeePermissions', path: '/employee-permissions', icon: Shield, label: 'nav.employeePermissions', adminOnly: true },
  { id: 'vacations', path: '/vacations', icon: Calendar, label: 'nav.vacations' },
  { id: 'licenses', path: '/licenses', icon: KeyRound, label: 'nav.licenses' },
  { id: 'tasks', path: '/tasks', icon: ListTodo, label: 'nav.tasks' },
  { id: 'vault', path: '/vault', icon: Lock, label: 'nav.vault' },
  { id: 'itTools', path: '/it-tools', icon: Wrench, label: 'nav.itTools' },
  { id: 'onCall', path: '/on-call', icon: Phone, label: 'nav.onCall' },
  { id: 'maintenance', path: '/maintenance', icon: Wrench, label: 'nav.maintenance' },
  { id: 'lifecycle', path: '/lifecycle', icon: Clock, label: 'nav.lifecycle', adminOnly: true },
  { id: 'fileShares', path: '/file-shares', icon: FolderKanban, label: 'nav.fileShares', adminOnly: true },
  { id: 'scanAgents', path: '/scan-agents', icon: Bot, label: 'nav.scanAgents', adminOnly: true },
  { id: 'networks', path: '/networks', icon: Network, label: 'nav.networks', adminOnly: true },
  { id: 'networkScan', path: '/network-scan', icon: Wifi, label: 'nav.networkScan', adminOnly: true },
  { id: 'webApps', path: '/web-apps', icon: Globe, label: 'nav.webApps' },
  { id: 'employeeReports', path: '/employee-reports', icon: FileSpreadsheet, label: 'nav.employeeReports', adminOnly: true },
  { id: 'reports', path: '/reports', icon: FileBarChart, label: 'nav.reports' },
  { id: 'auditLog', path: '/audit-log', icon: History, label: 'nav.auditLog', adminOnly: true },
  // Grouped under "Settings" conceptually
  { id: 'procurement', path: '/procurement', icon: ShoppingCart, label: 'nav.procurement' },
  { id: 'systemHealth', path: '/system-health', icon: Shield, label: 'nav.systemHealth', adminOnly: true },
  { id: 'settings', path: '/settings', icon: Settings, label: 'nav.settings', adminOnly: true },
];
```

### 4.2 Update SidebarOrderSettings

**File:** `src/components/settings/SidebarOrderSettings.tsx`

**Add missing items to defaultMenuItems:**
```typescript
const defaultMenuItems: MenuItem[] = [
  // ... existing items ...
  { id: 'procurement', labelKey: 'nav.procurement', enabled: true },
  { id: 'systemHealth', labelKey: 'nav.systemHealth', enabled: true },
  { id: 'settings', labelKey: 'nav.settings', enabled: true },
];
```

---

## Phase 5: Translations Update Summary

### Arabic Translations to Add:
```javascript
// nav.systemHealth
'nav.systemHealth': 'صحة النظام',

// datacenter completeness
'datacenter.nodesWithSerial': 'النودات مع الرقم التسلسلي',
'datacenter.vmsLinked': 'الأجهزة الافتراضية المرتبطة',
'datacenter.completenessDesc': 'مستوى اكتمال بيانات البنية التحتية',
'datacenter.clustersTab': 'الكلسترات',
'datacenter.cannotDeleteCluster': 'لا يمكن حذف الكلستر',
'datacenter.clusterHasLinkedItems': 'هذا الكلستر مرتبط بـ {nodes} نود و {vms} جهاز افتراضي',

// network scan
'scan.advancedDiscovery': 'اكتشاف متقدم',
'scan.standard': 'قياسي',
'scan.maxHosts': 'الحد الأقصى للأجهزة',
'scan.discoveredSubnets': 'الشبكات المكتشفة',
'scan.exportCsv': 'تصدير CSV',
'scan.estimatedHosts': 'الأجهزة المقدرة',
'scan.noAgent': 'لا يوجد وكيل متصل',

// procurement
'procurement.dashboard': 'لوحة المشتريات',
'procurement.totalRequests': 'إجمالي الطلبات',
'procurement.pendingReview': 'قيد المراجعة',
'procurement.generateSample': 'بيانات تجريبية',
'procurement.createdBy': 'المنشئ',
'procurement.uploadedBy': 'رفعه',
'procurement.filterEmployee': 'تصفية حسب الموظف',
'procurement.exportExcel': 'تصدير Excel',
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `src/contexts/LanguageContext.tsx` | Add missing translations for nav.systemHealth, datacenter completeness, network scan, procurement |
| `src/pages/Datacenter.tsx` | Add Clusters tab, import ClusterTable properly |
| `src/components/datacenter/ClusterTable.tsx` | Add delete guardrails, improve RFLevel options |
| `src/components/datacenter/ClusterForm.tsx` | Add domain selector as first field, filter datacenters by domain |
| `src/components/datacenter/DatacenterOverview.tsx` | Compute real completeness metrics, add edit/delete to cluster cards |
| `src/pages/NetworkScan.tsx` | Add advanced mode, CSV export, max-host guardrails |
| `src/pages/Procurement.tsx` | Add KPI dashboard, sample data generator, employee filter, Excel export |
| `src/pages/ProcurementDetail.tsx` | Show uploader name in quotation cards |
| `src/components/layout/Sidebar.tsx` | Reorder items (Procurement, SystemHealth before Settings) |
| `src/components/settings/SidebarOrderSettings.tsx` | Add procurement and systemHealth to defaultMenuItems |

---

## Technical Notes

### Air-Gapped Network Scan Limitations
- Browser-based network scanning is not possible due to security restrictions
- The agent-based infrastructure (`scan_agents`, `scan_jobs`) is the correct approach
- For environments without agents, we provide default private subnets for manual selection

### RLS Verification
All existing RLS policies remain in place:
- Procurement: Domain-scoped access via `can_access_domain(domain_id)`
- Clusters: Domain-scoped via existing datacenter RLS
- Scan results: Domain-scoped via `scan_jobs.domain_id`

### Storage Security
- `procurement-quotations` bucket remains private
- Files accessed via signed URLs with 60-second expiry
- Domain scoping maintained through RLS on `procurement_quotations` table

---

## Test Report Template

| # | Scenario | Steps | Expected | Actual | Result |
|---|----------|-------|----------|--------|--------|
| 1 | Super_admin can edit/delete clusters | Login as super_admin, go to Datacenter, Clusters tab, click edit/delete | Edit/Delete work | - | - |
| 2 | Delete blocked if cluster has nodes/VMs | Create cluster with nodes, try delete | Toast shows "Cannot delete - X nodes linked" | - | - |
| 3 | Datacenter completeness shows metrics | Go to Datacenter overview | Shows "X / Y (Z%)" with progress bars | - | - |
| 4 | System Health label in Arabic | Switch to Arabic, check sidebar | Shows "صحة النظام" not "nav.systemHealth" | - | - |
| 5 | Procurement dashboard KPIs | Go to /procurement | Shows 5 KPI cards with counts | - | - |
| 6 | Sample data generator (super_admin) | Click "Sample Data" button | Creates request with items | - | - |
| 7 | Employee filter in procurement | Select employee from filter | List filters by creator | - | - |
| 8 | Excel export | Click "Export Excel" | Downloads .xlsx file | - | - |
| 9 | Sidebar shows Procurement before Settings | Check sidebar order | Procurement > System Health > Settings | - | - |
| 10 | Cross-domain access blocked | Login as domain_admin, try access other domain's procurement | RLS blocks access | - | - |

