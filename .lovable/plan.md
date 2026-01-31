
# خطة التطوير الشاملة: مهام الفريق + تحسينات الإعدادات + إصلاحات

## ملخص المتطلبات

| # | المتطلب | الأولوية |
|---|---------|----------|
| 1 | إضافة خانة متابعة مهام الموظفين مع تصدير تقرير | 🔴 High |
| 2 | حذف رابط "إنشاء حساب" من صفحة الدخول | 🔴 High |
| 3 | إصلاح فلتر الدومين في Dashboard (الرخص والسيرفرات) | 🔴 Critical |
| 4 | إصلاح "مستخدم غير معروف" في سجل العمليات | 🔴 Critical |
| 5 | اسم التطبيق بالعربي والإنجليزي | 🟡 Medium |
| 6 | ترتيب خانات Dashboard والصفحات | 🟡 Medium |
| 7 | توسيع خيارات الأيقونات (40+ أيقونة) | 🟡 Medium |
| 8 | زر Dark Mode سريع | 🟡 Medium |
| 9 | إصلاح الترجمة الناقصة | 🟡 Medium |
| 10 | سكربت PowerShell لاكتشاف السيرفرات | 🟢 Feature |
| 11 | تحسينات إضافية للإعدادات | 🟢 Optional |

---

## 1️⃣ متابعة مهام الموظفين (صفحة المهام)

**الملف:** `src/pages/Tasks.tsx`

### التغييرات المطلوبة:

```
+--------------------------------------------------+
| المهام                       [تصدير ▼] [إضافة]   |
+--------------------------------------------------+
| [مهامي] [مهام الفريق]                            |  ← تبويبات جديدة (للأدمن)
| الموظف: [جميع الموظفين ▼]                        |  ← فلتر موظف
| القسم:  [جميع الأقسام ▼]                         |  ← فلتر قسم
+--------------------------------------------------+
| مهمة 1 - أحمد محمد - قيد التنفيذ                 |
| مهمة 2 - سارة أحمد - مكتملة                      |
+--------------------------------------------------+
|  [تصدير Excel] [تصدير PDF]                       |
+--------------------------------------------------+
```

**الإضافات:**
- تبويب "مهامي" و "مهام الفريق" (للأدمن فقط)
- فلتر اختيار موظف معين
- فلتر اختيار قسم
- عرض اسم الموظف المسند إليه في كل مهمة
- زر تصدير (Excel + PDF) للتقارير

---

## 2️⃣ حذف رابط التسجيل من صفحة الدخول

**الملف:** `src/pages/Login.tsx`

### التغيير:
حذف `CardFooter` الذي يحتوي على رابط "إنشاء حساب جديد" - السبب: إضافة الموظفين تتم فقط عبر الأدمن (Edge Function)

---

## 3️⃣ إصلاح فلتر الدومين في Dashboard

**المشكلة:** عند تغيير الدومين، عدد الرخص والسيرفرات لا يتغير

**الملف:** `src/hooks/useSupabaseData.ts` → `useDashboardStats`

### الإصلاح:
```typescript
export function useDashboardStats(selectedDomainId?: string) {
  const fetch = useCallback(async () => {
    // 1. جلب الشبكات التابعة للدومين
    let networkIds: string[] = [];
    if (selectedDomainId) {
      const { data: domainNetworks } = await supabase
        .from('networks')
        .select('id')
        .eq('domain_id', selectedDomainId);
      networkIds = domainNetworks?.map(n => n.id) || [];
    }

    // 2. فلترة السيرفرات حسب network_id
    let serversQuery = supabase.from('servers').select('*');
    if (selectedDomainId && networkIds.length > 0) {
      serversQuery = serversQuery.in('network_id', networkIds);
    } else if (selectedDomainId && networkIds.length === 0) {
      // إذا الدومين ليس له شبكات، لا سيرفرات
      setStats(prev => ({ ...prev, totalServers: 0, activeServers: 0 }));
    }

    // 3. فلترة التراخيص حسب domain_id
    let licensesQuery = supabase.from('licenses').select('*');
    if (selectedDomainId) {
      licensesQuery = licensesQuery.eq('domain_id', selectedDomainId);
    }
    
    // ... باقي الحسابات
  }, [selectedDomainId]);
}
```

---

## 4️⃣ إصلاح "مستخدم غير معروف" في سجل العمليات

**المشكلة:** `user_id` في audit_logs دائماً `null`

**الملف:** `src/hooks/useSupabaseData.ts`

### الإصلاح:

```typescript
// تعديل logAuditAction لتستقبل userId
export async function logAuditAction(
  userId: string | undefined,  // ← إضافة parameter
  action: string,
  tableName?: string,
  recordId?: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,  // ← ربط المستخدم
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      user_agent: navigator.userAgent,
    });
  } catch (e) {
    console.error('Error logging audit action:', e);
  }
}

// تحديث useServerMutations و useLicenseMutations
export function useServerMutations() {
  const { profile } = useAuth();  // ← إضافة
  
  const createServer = async (serverData: Record<string, any>) => {
    // ...
    await logAuditAction(profile?.id, 'create', 'servers', data.id, undefined, serverData);
    // ...
  };
}
```

---

## 5️⃣ اسم التطبيق بالعربي والإنجليزي

**الملف:** `src/pages/Settings.tsx`

### الإضافات:
```
+--------------------------------+
| اسم التطبيق (عربي):            |
| [إدارة البنية التحتية        ] |
|                                |
| اسم التطبيق (English):         |
| [IT Infrastructure Manager   ] |
|                                |
| [حفظ]                          |
+--------------------------------+
```

**الملف:** `src/hooks/useSupabaseData.ts`
- إضافة `useAppNameBilingual()` hook جديد
- يحفظ `app_name_ar` و `app_name_en` في `app_settings`

---

## 6️⃣ ترتيب خانات Dashboard والصفحات

**ملفات جديدة:**
- `src/components/settings/SectionOrderSettings.tsx`

### الفكرة:
- Drag & Drop لترتيب أقسام Dashboard
- حفظ الترتيب في `app_settings` → `dashboard_order`
- تطبيق الترتيب عند عرض Dashboard

**الأقسام القابلة للترتيب:**
```json
{
  "dashboard_order": ["stats", "webapps", "progress", "tasks"]
}
```

---

## 7️⃣ توسيع خيارات الأيقونات (40+ أيقونة)

**الملف:** `src/pages/WebApps.tsx`

### التحويل من Select إلى Grid:
```tsx
const iconOptions = [
  // البنية التحتية (9)
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'server', label: 'Server', icon: Server },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'cloud', label: 'Cloud', icon: Cloud },
  { value: 'hard-drive', label: 'Hard Drive', icon: HardDrive },
  { value: 'cpu', label: 'CPU', icon: Cpu },
  { value: 'network', label: 'Network', icon: Network },
  { value: 'wifi', label: 'Wifi', icon: Wifi },
  { value: 'router', label: 'Router', icon: Router },
  
  // الأمان (5)
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'lock', label: 'Lock', icon: Lock },
  { value: 'key', label: 'Key', icon: Key },
  { value: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
  { value: 'scan', label: 'Scan', icon: Scan },
  
  // التواصل (5)
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'message-square', label: 'Message', icon: MessageSquare },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'users', label: 'Users', icon: Users },
  
  // الملفات (4)
  { value: 'file', label: 'File', icon: FileText },
  { value: 'folder', label: 'Folder', icon: Folder },
  { value: 'archive', label: 'Archive', icon: Archive },
  { value: 'clipboard', label: 'Clipboard', icon: Clipboard },
  
  // التطوير (4)
  { value: 'code', label: 'Code', icon: Code },
  { value: 'terminal', label: 'Terminal', icon: Terminal },
  { value: 'git-branch', label: 'Git', icon: GitBranch },
  { value: 'box', label: 'Box', icon: Box },
  
  // المراقبة (5)
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'activity', label: 'Activity', icon: Activity },
  { value: 'bar-chart', label: 'Chart', icon: BarChart },
  { value: 'pie-chart', label: 'Pie Chart', icon: PieChart },
  { value: 'trending-up', label: 'Trending', icon: TrendingUp },
  
  // أخرى (8)
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'tool', label: 'Tool', icon: Wrench },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'clock', label: 'Clock', icon: Clock },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'layers', label: 'Layers', icon: Layers },
];
```

### عرض الأيقونات كـ Grid:
```tsx
<div className="grid grid-cols-8 gap-2">
  {iconOptions.map((opt) => {
    const Icon = opt.icon;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => setFormData({ ...formData, icon: opt.value })}
        className={cn(
          "p-3 rounded-lg border-2 transition-all",
          formData.icon === opt.value
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        )}
      >
        <Icon className="w-5 h-5" />
      </button>
    );
  })}
</div>
```

---

## 8️⃣ زر Dark Mode سريع

**الملف:** `src/components/layout/Layout.tsx` أو `Sidebar.tsx`

### الإضافات:
```tsx
import { useTheme } from 'next-themes';

// في الـ Header أو Sidebar
<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
>
  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</Button>
```

**ملاحظة:** المشروع يستخدم `next-themes` بالفعل، فقط نحتاج إضافة الزر في مكان ظاهر.

---

## 9️⃣ إصلاح الترجمة الناقصة

**الملف:** `src/contexts/LanguageContext.tsx`

### الإضافات المطلوبة:
```typescript
// ترجمات إضافية مفقودة
ar: {
  // الإعدادات
  'settings.general': 'عام',
  'settings.mail': 'البريد',
  'settings.ldap': 'LDAP',
  'settings.ntp': 'NTP',
  'settings.templates': 'القوالب',
  'settings.appearance': 'المظهر',
  'settings.darkMode': 'الوضع الداكن',
  'settings.lightMode': 'الوضع الفاتح',
  'settings.appNameAr': 'اسم التطبيق (عربي)',
  'settings.appNameEn': 'اسم التطبيق (English)',
  
  // سجل العمليات
  'auditLog.title': 'سجل العمليات',
  'auditLog.unknownUser': 'مستخدم غير معروف',
  'auditLog.create': 'إنشاء',
  'auditLog.update': 'تحديث',
  'auditLog.delete': 'حذف',
  
  // أخرى
  'common.export': 'تصدير',
  'common.import': 'استيراد',
  'common.refresh': 'تحديث',
  'common.settings': 'الإعدادات',
},

en: {
  'settings.general': 'General',
  'settings.mail': 'Mail',
  'settings.ldap': 'LDAP',
  'settings.ntp': 'NTP',
  'settings.templates': 'Templates',
  'settings.appearance': 'Appearance',
  'settings.darkMode': 'Dark Mode',
  'settings.lightMode': 'Light Mode',
  'settings.appNameAr': 'App Name (Arabic)',
  'settings.appNameEn': 'App Name (English)',
  
  'auditLog.title': 'Audit Log',
  'auditLog.unknownUser': 'Unknown User',
  'auditLog.create': 'Create',
  'auditLog.update': 'Update',
  'auditLog.delete': 'Delete',
  
  'common.export': 'Export',
  'common.import': 'Import',
  'common.refresh': 'Refresh',
  'common.settings': 'Settings',
}
```

---

## 🔟 سكربت PowerShell لاكتشاف السيرفرات

**حل مقترح:** سكربت PowerShell يُنفذ محلياً على جهاز الأدمن ويُصدر ملف Excel

### الفكرة:
1. تحميل سكربت PowerShell من الإعدادات
2. تنفيذه على جهاز Windows مع صلاحيات Domain Admin
3. السكربت يستعلم AD عن جميع الكمبيوترات (Servers)
4. يُصدر ملف Excel بنفس قالب النظام
5. رفع الملف للنظام عبر الاستيراد الذكي

### السكربت المقترح:
```powershell
# IT-ServerDiscovery.ps1
# Script to discover servers from Active Directory and export to Excel

param(
    [string]$OutputPath = ".\ServerInventory.xlsx",
    [string]$SearchBase = "", # Leave empty for entire domain
    [switch]$IncludeWorkstations = $false
)

# Import required module
Import-Module ActiveDirectory -ErrorAction Stop

# Build filter for servers only
$filter = if ($IncludeWorkstations) {
    "OperatingSystem -like '*'"
} else {
    "OperatingSystem -like '*Server*'"
}

# Get computers from AD
$computers = Get-ADComputer -Filter $filter -Properties `
    Name, DNSHostName, IPv4Address, OperatingSystem, OperatingSystemVersion, `
    Description, Enabled, LastLogonDate, Created, DistinguishedName

# Convert to export format matching system template
$exportData = $computers | ForEach-Object {
    [PSCustomObject]@{
        'server_id'        = ''  # Empty for new servers
        'name'             = $_.Name
        'ip_address'       = $_.IPv4Address
        'operating_system' = $_.OperatingSystem
        'environment'      = 'production'  # Default, adjust manually
        'status'           = if ($_.Enabled) { 'active' } else { 'inactive' }
        'owner'            = ''
        'responsible_user' = ''
        'network_name'     = ($_.DistinguishedName -split ',DC=' | Select-Object -Skip 1) -join '.'
        'cpu'              = ''
        'ram'              = ''
        'disk_space'       = ''
        'notes'            = $_.Description
        'last_logon'       = $_.LastLogonDate
    }
}

# Export to Excel (requires ImportExcel module)
if (Get-Module -ListAvailable -Name ImportExcel) {
    $exportData | Export-Excel -Path $OutputPath -AutoSize -TableName "Servers" -WorksheetName "Data"
    Write-Host "Exported $($exportData.Count) servers to $OutputPath" -ForegroundColor Green
} else {
    # Fallback to CSV if ImportExcel not installed
    $csvPath = $OutputPath -replace '\.xlsx$', '.csv'
    $exportData | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
    Write-Host "ImportExcel module not found. Exported to CSV: $csvPath" -ForegroundColor Yellow
    Write-Host "Install ImportExcel: Install-Module ImportExcel -Scope CurrentUser" -ForegroundColor Cyan
}
```

**إضافة في الإعدادات:**
- زر "تحميل سكربت اكتشاف السيرفرات"
- تعليمات التشغيل

---

## 1️⃣1️⃣ تحسينات إضافية للإعدادات

### أ. إعدادات الجلسة
```
- مدة انتهاء الجلسة: [30 دقيقة ▼]
- تذكرني (افتراضي): [✓]
```

### ب. إعدادات التنبيهات
```
- تنبيه انتهاء الترخيص قبل: [30 ▼] يوم
- تنبيه المهام المتأخرة: [✓]
```

### ج. إعدادات العرض
```
- عدد العناصر في الصفحة: [20 ▼]
- Dark Mode: [Toggle]
```

### د. تصدير البيانات
```
- تصدير جميع البيانات: [JSON]
- تصدير السيرفرات: [Excel]
- تصدير التراخيص: [Excel]
```

---

## الملفات المطلوب إنشاؤها/تعديلها

```
إنشاء ملفات جديدة:
├── src/components/settings/SectionOrderSettings.tsx
├── src/components/settings/DisplaySettings.tsx
├── public/scripts/IT-ServerDiscovery.ps1

تعديل ملفات موجودة:
├── src/pages/Tasks.tsx              → فلتر الفريق + تصدير
├── src/pages/Login.tsx              → حذف رابط التسجيل
├── src/pages/Settings.tsx           → اسم ثنائي + ترتيب + تحسينات
├── src/pages/WebApps.tsx            → 40+ أيقونة
├── src/hooks/useSupabaseData.ts     → إصلاح فلتر + audit log
├── src/contexts/LanguageContext.tsx → ترجمات إضافية
├── src/components/layout/Sidebar.tsx → زر Dark Mode
```

---

## ترتيب التنفيذ

| الخطوة | المهمة | الأولوية |
|--------|--------|----------|
| 1 | إصلاح sجل العمليات (user_id) | 🔴 Critical |
| 2 | إصلاح فلتر الدومين في Dashboard | 🔴 Critical |
| 3 | حذف رابط التسجيل من Login | 🔴 High |
| 4 | متابعة مهام الفريق + تصدير | 🔴 High |
| 5 | إصلاح الترجمة الناقصة | 🟡 Medium |
| 6 | زر Dark Mode سريع | 🟡 Medium |
| 7 | توسيع الأيقونات (40+) | 🟡 Medium |
| 8 | اسم التطبيق بلغتين | 🟡 Medium |
| 9 | سكربت PowerShell | 🟢 Feature |
| 10 | ترتيب خانات Dashboard | 🟢 Optional |
| 11 | تحسينات الإعدادات الإضافية | 🟢 Optional |

---

## النتيجة المتوقعة

بعد التنفيذ:

- **سجل العمليات يعمل** - يظهر اسم المستخدم الفعلي
- **فلتر الدومين صحيح** - الرخص والسيرفرات تتغير حسب الدومين
- **صفحة الدخول آمنة** - بدون رابط تسجيل عام
- **متابعة المهام** - المدير يرى كل مهام الفريق + تصدير
- **Dark Mode سريع** - زر تبديل في الواجهة
- **الترجمة كاملة** - كل النصوص تتغير حسب اللغة
- **40+ أيقونة** - خيارات واسعة لتطبيقات الويب
- **اسم مخصص** - عربي وإنجليزي
- **سكربت اكتشاف** - PowerShell لجمع السيرفرات من AD
