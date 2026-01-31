
# خطة التطوير الشاملة: نظام المهام Pro + Network Scan + تحسينات الاستيراد/التصدير

## ملخص المتطلبات

| # | المتطلب | الحالة الحالية | المطلوب |
|---|---------|---------------|---------|
| 1 | نظام المهام Pro | ⚠️ بسيط | Kanban + Calendar + Templates |
| 2 | Network Scan في القائمة | ❌ غير موجود | إضافة الرابط |
| 3 | تغيير "النطاقات" إلى "الشبكات" | ⚠️ في التقارير | تصحيح المسمى |
| 4 | فلتر Domain في السيرفرات | ⚠️ موجود جزئياً | تحسين UI |
| 5 | Export/Import احترافي | ⚠️ بسيط | PDF/Excel محسن |

---

## 1️⃣ إضافة Network Scan للقائمة الجانبية

### الملف: `src/components/layout/Sidebar.tsx`

**التغيير المطلوب:**
```typescript
// إضافة في menuItems (بعد networks)
{ path: '/network-scan', icon: Wifi, label: 'nav.networkScan', adminOnly: true },
```

### الملف: `src/contexts/LanguageContext.tsx`

**إضافة ترجمة:**
```typescript
ar: {
  'nav.networkScan': 'فحص الشبكة',
}
en: {
  'nav.networkScan': 'Network Scan',
}
```

---

## 2️⃣ تصحيح "النطاقات" إلى "الشبكات" في التقارير

### الملف: `src/pages/Reports.tsx`

**المشكلة:** الصفحة تستخدم `t('nav.networks')` للعمود والفلتر، لكن الترجمة الحالية تُرجع "النطاقات"

**الحل:** تحديث الترجمة لتكون أكثر دقة:
```typescript
// في LanguageContext.tsx
ar: {
  'nav.networks': 'الشبكات والدومينات', // للقائمة الجانبية
  'reports.networks': 'الشبكات',       // للتقارير
}
```

**أو** استخدام مفتاح ترجمة مخصص للتقارير:
```typescript
// في Reports.tsx سطر 248
<p className="text-sm text-muted-foreground">{t('table.networks')}</p>
```

---

## 3️⃣ إضافة فلتر Domain منفصل في صفحة السيرفرات

### الملف: `src/pages/Servers.tsx`

**الحالة الحالية:** يوجد فلتر Domain وNetwork لكن بحاجة لتحسين UI

**التحسينات المطلوبة:**
1. إضافة Dropdown واضح للـ Domain
2. تسلسل: اختر Domain → تظهر Networks الخاصة به
3. تحسين التسميات

**الكود الجديد:**
```typescript
// إضافة في Filter Card
<div className="flex flex-wrap gap-2">
  {/* Domain Filter - NEW */}
  <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
    <SelectTrigger className="w-48">
      <Globe className="w-4 h-4 me-2" />
      <SelectValue placeholder={t('servers.selectDomain')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{t('reports.allDomains')}</SelectItem>
      {domains.map((d) => (
        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Network Filter (filtered by domain) */}
  <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
    <SelectTrigger className="w-48">
      <Network className="w-4 h-4 me-2" />
      <SelectValue placeholder={t('servers.selectNetwork')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{t('dashboard.allNetworks')}</SelectItem>
      {networks.map((n) => (
        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**ترجمات جديدة:**
```typescript
ar: {
  'servers.selectDomain': 'اختر النطاق',
  'servers.selectNetwork': 'اختر الشبكة',
}
```

---

## 4️⃣ نظام المهام الاحترافي (Task System Pro)

### أ. إنشاء مكون Task Calendar

**ملف جديد:** `src/components/tasks/TaskCalendar.tsx`

```typescript
// مكون تقويم يعرض المهام حسب due_date
// يستخدم date-fns للتعامل مع التواريخ
// يعرض المهام بألوان حسب الأولوية

interface TaskCalendarProps {
  tasks: Task[];
  profiles: Profile[];
  onTaskClick?: (task: Task) => void;
}
```

**الميزات:**
- عرض شهري مع تنقل ◀ ▶
- المهام تظهر ببطاقات صغيرة في اليوم المحدد
- ألوان: P1 أحمر، P2 برتقالي، P3 أصفر، P4 رمادي
- نقر على المهمة يفتح تفاصيلها

### ب. تحسين Kanban Board

**الملف:** `src/components/tasks/KanbanBoard.tsx`

**التحسينات:**
- دعم السحب والإفلات (Drag & Drop) - يمكن استخدام CSS لتغيير الحالة عند النقر
- إضافة عداد SLA
- عرض المرفقات والتعليقات

```typescript
// إضافة SLA indicator
const getSLAStatus = (task: Task) => {
  if (!task.due_date) return null;
  const now = new Date();
  const due = new Date(task.due_date);
  const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursLeft < 0) return 'breached';
  if (hoursLeft < 4) return 'critical';
  if (hoursLeft < 24) return 'warning';
  return 'ok';
};
```

### ج. صفحة Task Templates

**ملف جديد:** `src/pages/TaskTemplates.tsx`

**الميزات:**
- عرض القوالب الموجودة
- إضافة قالب جديد
- تحديد:
  - الاسم والوصف
  - التكرار (daily, weekly, monthly)
  - الأولوية الافتراضية
  - Checklist افتراضي
  - المسؤول الافتراضي

### د. تحديث صفحة Tasks.tsx الرئيسية

**إضافة Tabs للعرض:**
```typescript
<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="list">{t('common.all')}</TabsTrigger>
    <TabsTrigger value="kanban">{t('tasks.kanban')}</TabsTrigger>
    <TabsTrigger value="calendar">{t('tasks.calendar')}</TabsTrigger>
    <TabsTrigger value="my">{t('tasks.myTasks')}</TabsTrigger>
  </TabsList>
  
  <TabsContent value="list">
    {/* العرض الحالي */}
  </TabsContent>
  
  <TabsContent value="kanban">
    <KanbanBoard tasks={filteredTasks} profiles={profiles} />
  </TabsContent>
  
  <TabsContent value="calendar">
    <TaskCalendar tasks={filteredTasks} profiles={profiles} />
  </TabsContent>
  
  <TabsContent value="my">
    <MyTasksWidget tasks={myTasks} />
  </TabsContent>
</Tabs>
```

---

## 5️⃣ نظام Export/Import الاحترافي

### أ. تحسين PDF Export

**الملف:** `src/utils/pdfExport.ts`

**التحسينات:**
1. إضافة شعار/هوية بصرية
2. دعم RTL محسن
3. ترقيم الصفحات
4. تنسيق الألوان حسب الحالة

```typescript
// إضافة branded header
const addBrandedHeader = (doc: jsPDF, title: string, isArabic: boolean) => {
  // الشريط الأخضر العلوي
  doc.setFillColor(11, 107, 99); // #0B6B63
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 15, 'F');
  
  // الخط الذهبي
  doc.setFillColor(217, 176, 71); // #D9B047
  doc.rect(0, 15, doc.internal.pageSize.getWidth(), 2, 'F');
  
  // العنوان
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('IT Infrastructure Manager', 15, 10);
};

// إضافة footer مع ترقيم
const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Page ${pageNumber} of ${totalPages}`,
    doc.internal.pageSize.getWidth() / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );
};
```

### ب. تحسين Excel Export

**ملف جديد:** `src/utils/professionalExport.ts`

```typescript
import * as XLSX from 'xlsx';

interface ExportOptions {
  data: any[];
  filename: string;
  sheetName: string;
  headers: { key: string; label: string; width?: number }[];
  colorRules?: { column: string; rules: ColorRule[] }[];
  includeStats?: boolean;
}

interface ColorRule {
  value: string;
  color: string; // hex
}

export const exportProfessionalExcel = (options: ExportOptions) => {
  const { data, filename, sheetName, headers, colorRules, includeStats } = options;
  
  const wb = XLSX.utils.book_new();
  
  // Main data sheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = headers.map(h => ({ wch: h.width || 15 }));
  
  // Add header styling (requires xlsx-style or similar)
  // Note: Basic xlsx doesn't support styling, but we can structure data well
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Stats sheet if requested
  if (includeStats) {
    const stats = calculateStats(data);
    const statsSheet = XLSX.utils.json_to_sheet(stats);
    XLSX.utils.book_append_sheet(wb, statsSheet, 'Statistics');
  }
  
  XLSX.writeFile(wb, filename);
};

// حساب الإحصائيات تلقائياً
const calculateStats = (data: any[]) => {
  return [
    { Metric: 'Total Records', Value: data.length },
    { Metric: 'Export Date', Value: new Date().toISOString() },
    // ... المزيد
  ];
};
```

### ج. نظام Import Templates المحسن

**تحديث:** `src/utils/excelTemplates.ts`

**إضافات:**
1. Templates مع data validation
2. Instructions sheet مفصل
3. دعم الحقول الجديدة (Veeam, Beneficiary)

```typescript
// Server template محدث
export const downloadServerTemplateV3 = () => {
  const templateData = [
    {
      'server_id': '',
      'name': 'DC-01',
      'ip_address': '192.168.1.10',
      'operating_system': 'Windows Server 2022',
      'environment': 'production',
      'status': 'active',
      // New fields
      'beneficiary_department': 'Finance',
      'primary_application': 'ERP System',
      'business_owner': 'Ahmed',
      'is_backed_up_by_veeam': 'Yes',
      'backup_frequency': 'daily',
      'backup_job_name': 'DC-Daily-Backup',
      // ... existing fields
    },
  ];
  
  // Validation sheet
  const validationData = [
    { Field: 'is_backed_up_by_veeam', Values: 'Yes, No' },
    { Field: 'backup_frequency', Values: 'none, daily, weekly' },
    // ...
  ];
  
  // ... create workbook
};
```

### د. واجهة Import Review

**ملف جديد:** `src/components/import/ImportReviewDialog.tsx`

```typescript
interface ImportReviewProps {
  preview: {
    toCreate: number;
    toUpdate: number;
    unchanged: number;
    errors: { row: number; message: string }[];
  };
  onConfirm: () => void;
  onCancel: () => void;
}

const ImportReviewDialog: React.FC<ImportReviewProps> = ({
  preview,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>مراجعة الاستيراد</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-success/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-success">{preview.toCreate}</p>
                <p className="text-sm">سجلات جديدة</p>
              </CardContent>
            </Card>
            
            <Card className="bg-warning/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-warning">{preview.toUpdate}</p>
                <p className="text-sm">للتحديث</p>
              </CardContent>
            </Card>
            
            <Card className="bg-destructive/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{preview.errors.length}</p>
                <p className="text-sm">أخطاء</p>
              </CardContent>
            </Card>
          </div>
          
          {preview.errors.length > 0 && (
            <div className="bg-destructive/5 p-3 rounded-lg max-h-40 overflow-auto">
              {preview.errors.map((err, i) => (
                <p key={i} className="text-sm text-destructive">
                  صف {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>إلغاء</Button>
          <Button onClick={onConfirm}>استيراد الآن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 6️⃣ الترجمات الجديدة المطلوبة

### في `LanguageContext.tsx`:

```typescript
ar: {
  // Navigation
  'nav.networkScan': 'فحص الشبكة',
  
  // Servers
  'servers.selectDomain': 'اختر النطاق',
  'servers.selectNetwork': 'اختر الشبكة',
  'servers.filterByDomain': 'الفلترة حسب النطاق',
  
  // Reports
  'reports.networks': 'الشبكات',
  
  // Tasks Pro
  'tasks.viewModes': 'طرق العرض',
  'tasks.listView': 'قائمة',
  'tasks.kanbanView': 'Kanban',
  'tasks.calendarView': 'تقويم',
  'tasks.createFromTemplate': 'إنشاء من قالب',
  'tasks.manageTemplates': 'إدارة القوالب',
  'tasks.noTemplates': 'لا يوجد قوالب',
  
  // Import/Export
  'import.review': 'مراجعة الاستيراد',
  'import.newRecords': 'سجلات جديدة',
  'import.toUpdate': 'للتحديث',
  'import.errors': 'أخطاء',
  'import.confirmImport': 'تأكيد الاستيراد',
  'import.dryRun': 'معاينة فقط',
  'import.downloadTemplate': 'تحميل القالب',
  
  'export.pdf': 'تصدير PDF',
  'export.excel': 'تصدير Excel',
  'export.fullReport': 'التقرير الكامل',
  'export.filtered': 'البيانات المفلترة',
  'export.summary': 'ملخص تنفيذي',
},

en: {
  // Navigation
  'nav.networkScan': 'Network Scan',
  
  // Servers
  'servers.selectDomain': 'Select Domain',
  'servers.selectNetwork': 'Select Network',
  'servers.filterByDomain': 'Filter by Domain',
  
  // Reports
  'reports.networks': 'Networks',
  
  // Tasks Pro
  'tasks.viewModes': 'View Modes',
  'tasks.listView': 'List',
  'tasks.kanbanView': 'Kanban',
  'tasks.calendarView': 'Calendar',
  'tasks.createFromTemplate': 'Create from Template',
  'tasks.manageTemplates': 'Manage Templates',
  'tasks.noTemplates': 'No templates',
  
  // Import/Export
  'import.review': 'Import Review',
  'import.newRecords': 'New Records',
  'import.toUpdate': 'To Update',
  'import.errors': 'Errors',
  'import.confirmImport': 'Confirm Import',
  'import.dryRun': 'Preview Only',
  'import.downloadTemplate': 'Download Template',
  
  'export.pdf': 'Export PDF',
  'export.excel': 'Export Excel',
  'export.fullReport': 'Full Report',
  'export.filtered': 'Filtered Data',
  'export.summary': 'Executive Summary',
}
```

---

## 7️⃣ الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/layout/Sidebar.tsx` | إضافة Network Scan link |
| `src/contexts/LanguageContext.tsx` | ترجمات جديدة |
| `src/pages/Reports.tsx` | تصحيح "الشبكات" |
| `src/pages/Servers.tsx` | تحسين فلاتر Domain |
| `src/pages/Tasks.tsx` | إضافة Kanban/Calendar tabs |
| `src/components/tasks/KanbanBoard.tsx` | تحسينات SLA |
| `src/components/tasks/TaskCalendar.tsx` | **ملف جديد** |
| `src/pages/TaskTemplates.tsx` | **ملف جديد** |
| `src/utils/pdfExport.ts` | تحسينات branded |
| `src/utils/professionalExport.ts` | **ملف جديد** |
| `src/components/import/ImportReviewDialog.tsx` | **ملف جديد** |
| `src/utils/excelTemplates.ts` | تحديث Templates |

---

## 8️⃣ ترتيب التنفيذ

### المرحلة 1: Quick Fixes (سريع)
```text
□ 1.1 إضافة Network Scan للقائمة الجانبية
□ 1.2 تصحيح "النطاقات" → "الشبكات" في التقارير
□ 1.3 إضافة الترجمات الأساسية
```

### المرحلة 2: Server Filters (متوسط)
```text
□ 2.1 تحسين فلتر Domain في Servers.tsx
□ 2.2 جعل Network يعتمد على Domain المختار
```

### المرحلة 3: Task System Pro (كبير)
```text
□ 3.1 إنشاء TaskCalendar.tsx
□ 3.2 تحديث Tasks.tsx لدعم الـ Tabs الجديدة
□ 3.3 تحسين KanbanBoard.tsx
□ 3.4 إنشاء TaskTemplates.tsx (اختياري)
```

### المرحلة 4: Export/Import Pro (كبير)
```text
□ 4.1 تحسين pdfExport.ts (branded)
□ 4.2 إنشاء professionalExport.ts
□ 4.3 تحديث excelTemplates.ts
□ 4.4 إنشاء ImportReviewDialog.tsx
```

---

## 9️⃣ النتيجة المتوقعة

بعد التنفيذ:
- ✅ Network Scan يظهر في القائمة الجانبية
- ✅ "الشبكات" بدلاً من "النطاقات" في التقارير
- ✅ فلتر Domain واضح ومتسلسل في السيرفرات
- ✅ نظام مهام متقدم مع Kanban + Calendar
- ✅ تصدير PDF احترافي مع هوية بصرية
- ✅ استيراد Excel مع مراجعة قبل الحفظ
