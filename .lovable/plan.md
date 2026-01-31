

# خطة التطوير: تحسين الإجازات والتقارير والتصدير والفرز

## ملخص المتطلبات

| # | المتطلب | الوصف |
|---|---------|-------|
| 1 | تصدير الإجازات | تصدير إجازات كل موظف بشكل منفصل (Excel + PDF) |
| 2 | تحسين القوالب | قوالب محسنة تتوافق مع النظام للتصدير والاستيراد |
| 3 | رفع ذكي (Upsert) | عند الرفع: تحديث الموجود + إضافة الجديد بدون تكرار |
| 4 | فرز متعدد | خيارات متعددة لترتيب وفرز البيانات |

---

## 1. تصدير الإجازات لكل موظف

### الملف: `src/pages/Vacations.tsx`

**الميزات الجديدة:**
- فلتر لاختيار موظف معين
- زر "تصدير" يظهر قائمة منسدلة:
  - تصدير Excel (للموظف المحدد أو الكل)
  - تصدير PDF (للموظف المحدد أو الكل)

**هيكل التصدير:**

```typescript
// Excel Export
const exportVacationsExcel = (profileId?: string) => {
  const data = profileId 
    ? vacations.filter(v => v.profile_id === profileId)
    : vacations;
    
  const exportData = data.map(v => ({
    'اسم الموظف': getEmployeeName(v.profile_id),
    'المنصب': getEmployeePosition(v.profile_id),
    'نوع الإجازة': t(`vacations.${v.vacation_type}`),
    'تاريخ البداية': v.start_date,
    'تاريخ النهاية': v.end_date,
    'عدد الأيام': v.days_count,
    'الحالة': t(`vacations.${v.status}`),
    'ملاحظات': v.notes || '',
  }));
  
  // Create workbook with summary sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), 'الإجازات');
  
  // Add summary sheet
  const summary = calculateVacationSummary(data);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'ملخص');
  
  XLSX.writeFile(wb, `vacations-${profileId ? 'employee' : 'all'}-${Date.now()}.xlsx`);
};

// PDF Export using jsPDF
const exportVacationsPDF = async (profileId?: string) => {
  // Generate professional PDF with header, logo, and formatted table
};
```

**واجهة المستخدم:**

```
+--------------------------------------------------+
| الإجازات                      [تصدير ▼] [إضافة]  |
+--------------------------------------------------+
| الموظف: [جميع الموظفين ▼]                        |
|                                                  |
| تصدير ▼                                          |
|   ├─ Excel - الموظف المحدد                       |
|   ├─ Excel - جميع الموظفين                       |
|   ├─ PDF - الموظف المحدد                         |
|   └─ PDF - جميع الموظفين                         |
+--------------------------------------------------+
```

---

## 2. تحسين القوالب (Templates)

### الملف: `src/utils/excelTemplates.ts`

**التحسينات:**

### أ. قالب السيرفرات المحسن
```typescript
export const downloadServerTemplateV2 = () => {
  // Sheet 1: Data Template (with system field names)
  const templateData = [
    {
      'server_id': '',  // فارغ للسجلات الجديدة، يحتوي ID للتحديث
      'name': 'Server-01',  // اسم الحقل في الـ DB
      'ip_address': '192.168.1.10',
      'operating_system': 'Windows Server 2022',
      'environment': 'production',  // قيم محددة
      'status': 'active',
      'owner': 'Ahmed',
      'responsible_user': 'Mohammed',
      'network_name': 'Main Network',  // للربط بالشبكة
      'cpu': '4 vCPU',
      'ram': '16 GB',
      'disk_space': '500 GB',
      'notes': 'Main DB Server',
    },
  ];

  // Sheet 2: Lookup Values (للقيم المسموحة)
  const lookupData = [
    { 'Field': 'environment', 'Allowed Values': 'production, testing, development, staging' },
    { 'Field': 'status', 'Allowed Values': 'active, inactive, maintenance' },
    { 'Field': 'operating_system', 'Allowed Values': 'Windows Server 2022, Windows Server 2019, Ubuntu 22.04 LTS, CentOS, Red Hat Enterprise, Debian' },
  ];

  // Sheet 3: Current Data (للتعديل على البيانات الموجودة)
  // يتم تعبئتها تلقائياً بالبيانات الحالية من الـ DB
  
  // Sheet 4: Instructions (بالعربي والإنجليزي)
};
```

### ب. قالب التراخيص المحسن
```typescript
export const downloadLicenseTemplateV2 = () => {
  // تضمين license_id للتحديث
  // تضمين domain_name للربط التلقائي
  // تضمين القيم المسموحة
};
```

### ج. قالب الموظفين المحسن
```typescript
export const downloadEmployeeTemplateV2 = () => {
  // تضمين profile_id للتحديث
  // تضمين المهارات والشهادات كـ comma-separated
};
```

### د. قالب المهام المحسن
```typescript
export const downloadTaskTemplateV2 = () => {
  // تضمين task_id للتحديث
  // تضمين server_name و assignee_email للربط
  // تضمين القيم المسموحة للـ frequency و priority
};
```

---

## 3. رفع ذكي (Smart Upsert)

### الملف: `src/hooks/useSmartImport.ts` (جديد)

**المنطق:**

```typescript
export function useSmartImport() {
  /**
   * Smart Import Logic:
   * 1. إذا server_id موجود → تحديث السجل
   * 2. إذا server_id فارغ + (name + ip_address) موجود → تحديث السجل
   * 3. إذا server_id فارغ + (name + ip_address) غير موجود → إضافة جديد
   */
  
  const importServers = async (data: any[]) => {
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };
    
    for (const row of data) {
      try {
        // Check if record exists
        const existingServer = row.server_id 
          ? await findById('servers', row.server_id)
          : await findByNameAndIP(row.name, row.ip_address);
        
        if (existingServer) {
          // Update existing
          await updateServer(existingServer.id, mapRowToServer(row));
          results.updated++;
        } else {
          // Create new
          await createServer(mapRowToServer(row));
          results.created++;
        }
      } catch (error) {
        results.errors.push({ row, error: error.message });
      }
    }
    
    return results;
  };

  const importLicenses = async (data: any[]) => {
    // Similar logic for licenses
    // Match by license_id OR (name + license_key)
  };

  const importTasks = async (data: any[]) => {
    // Similar logic for tasks
    // Match by task_id OR (title + due_date + assigned_to)
  };

  return { importServers, importLicenses, importTasks };
}
```

### تحديث واجهة الاستيراد:

```typescript
// src/pages/Servers.tsx - تحديث handleImport

const handleSmartImport = async (file: File) => {
  const { importServers } = useSmartImport();
  
  // Parse Excel
  const data = parseExcel(file);
  
  // Show confirmation dialog
  const preview = await analyzeImport(data);
  // preview = { toCreate: 5, toUpdate: 3, unchanged: 2 }
  
  if (confirmImport(preview)) {
    const results = await importServers(data);
    
    toast({
      title: 'تم الاستيراد بنجاح',
      description: `إضافة: ${results.created} | تحديث: ${results.updated} | أخطاء: ${results.errors.length}`,
    });
  }
};
```

**Dialog تأكيد الاستيراد:**

```
+------------------------------------------+
|         معاينة الاستيراد                  |
+------------------------------------------+
|                                          |
|  📊 ملخص التغييرات:                      |
|                                          |
|  ✅ سجلات جديدة:     5                   |
|  ✏️  سجلات للتحديث:   3                   |
|  ⏭️  بدون تغيير:     2                   |
|  ⚠️  أخطاء محتملة:   0                   |
|                                          |
|  [إلغاء]         [استيراد الآن]          |
+------------------------------------------+
```

---

## 4. خيارات فرز متعددة

### الملف: `src/components/DataTableHeader.tsx` (جديد)

**المكون:**

```typescript
interface SortOption {
  field: string;
  label: string;
  direction: 'asc' | 'desc';
}

interface DataTableHeaderProps {
  sortOptions: SortOption[];
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'table' | 'grid' | 'cards';
  onViewModeChange: (mode: 'table' | 'grid' | 'cards') => void;
}

const DataTableHeader: React.FC<DataTableHeaderProps> = ({...}) => {
  return (
    <div className="flex items-center gap-4">
      {/* Sort Dropdown */}
      <Select value={currentSort.field} onValueChange={...}>
        <SelectTrigger className="w-48">
          <ArrowUpDown className="w-4 h-4 me-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name-asc">الاسم (أ-ي)</SelectItem>
          <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
          <SelectItem value="date-asc">التاريخ (الأقدم)</SelectItem>
          <SelectItem value="date-desc">التاريخ (الأحدث)</SelectItem>
          <SelectItem value="status-asc">الحالة</SelectItem>
          <SelectItem value="environment-asc">البيئة</SelectItem>
        </SelectContent>
      </Select>
      
      {/* View Mode Toggle */}
      <ToggleGroup type="single" value={viewMode} onValueChange={onViewModeChange}>
        <ToggleGroupItem value="table">
          <List className="w-4 h-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid">
          <LayoutGrid className="w-4 h-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="cards">
          <Layers className="w-4 h-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
```

### تطبيق الفرز في الصفحات:

**صفحة السيرفرات:**
```typescript
const [sortConfig, setSortConfig] = useState({ field: 'name', direction: 'asc' });

const sortedServers = useMemo(() => {
  return [...filteredServers].sort((a, b) => {
    switch (sortConfig.field) {
      case 'name':
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case 'ip':
        return sortConfig.direction === 'asc'
          ? (a.ip_address || '').localeCompare(b.ip_address || '')
          : (b.ip_address || '').localeCompare(a.ip_address || '');
      case 'environment':
        return sortConfig.direction === 'asc'
          ? a.environment.localeCompare(b.environment)
          : b.environment.localeCompare(a.environment);
      case 'created_at':
        return sortConfig.direction === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });
}, [filteredServers, sortConfig]);
```

**خيارات الفرز لكل صفحة:**

| الصفحة | خيارات الفرز |
|--------|-------------|
| السيرفرات | الاسم، IP، البيئة، الحالة، تاريخ الإنشاء، آخر تحديث |
| التراخيص | الاسم، المورد، تاريخ الانتهاء، الأيام المتبقية، التكلفة |
| الموظفين | الاسم، القسم، المنصب، تاريخ التعيين، الحالة |
| المهام | العنوان، تاريخ الاستحقاق، الأولوية، الحالة، التكرار |
| الإجازات | الموظف، تاريخ البداية، النوع، الحالة، عدد الأيام |

---

## الملفات المطلوب إنشاؤها/تعديلها

```
إنشاء ملفات جديدة:
├── src/hooks/useSmartImport.ts          → منطق الرفع الذكي
├── src/components/DataTableHeader.tsx   → مكون الفرز وعرض البيانات
├── src/utils/pdfExport.ts              → تصدير PDF

تعديل ملفات موجودة:
├── src/pages/Vacations.tsx             → تصدير Excel/PDF + فلتر موظف
├── src/pages/Servers.tsx               → رفع ذكي + فرز متعدد
├── src/pages/Licenses.tsx              → رفع ذكي + فرز متعدد
├── src/pages/Tasks.tsx                 → فرز متعدد
├── src/utils/excelTemplates.ts         → قوالب محسنة
```

---

## Dependencies المطلوبة

```json
{
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.1"
}
```

---

## ترتيب التنفيذ

| الخطوة | المهمة | الأولوية |
|--------|--------|----------|
| 1 | إضافة فلتر موظف + تصدير Excel في Vacations | High |
| 2 | تحسين القوالب (excelTemplates.ts) | High |
| 3 | إنشاء useSmartImport للرفع الذكي | High |
| 4 | تطبيق الرفع الذكي في Servers.tsx | Medium |
| 5 | إنشاء DataTableHeader للفرز | Medium |
| 6 | تطبيق الفرز في جميع الصفحات | Medium |
| 7 | إضافة تصدير PDF (jspdf) | Low |

---

## النتيجة المتوقعة

- **تصدير الإجازات**: Excel/PDF لموظف محدد أو الكل مع ملخص
- **قوالب محسنة**: تتضمن ID للتحديث + قيم مسموحة + بيانات حالية
- **رفع ذكي**: تحديث الموجود + إضافة الجديد بدون تكرار
- **فرز متعدد**: خيارات فرز متنوعة مع طرق عرض مختلفة (جدول/شبكة/بطاقات)

