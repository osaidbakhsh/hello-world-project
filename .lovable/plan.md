
# خطة إصلاح ترتيب القائمة الجانبية والترجمات وإنشاء البيانات التجريبية

## ملخص المشاكل المكتشفة

1. **إعدادات ترتيب القائمة الجانبية ناقصة**: لا تتضمن خزنة كلمات المرور (`vault`) وفحص الشبكة (`networkScan`)
2. **القائمة الجانبية لا تطبق الترتيب المحفوظ**: الكود الحالي يحتوي على قائمة ثابتة ولا يقرأ من قاعدة البيانات
3. **ترجمات إنجليزية ناقصة**: صفحة الإعدادات تحتوي على نصوص عربية ثابتة في الكود
4. **لا توجد بيانات تجريبية**: يجب إنشاء بيانات تجريبية لجميع الجداول

---

## المرحلة 1: إصلاح إعدادات ترتيب القائمة الجانبية

### الملف: `src/components/settings/SidebarOrderSettings.tsx`

**التغييرات:**
- إضافة `vault` و `networkScan` للقائمة الافتراضية
- ترتيب العناصر ليتطابق مع القائمة الفعلية

```typescript
const defaultMenuItems: MenuItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', enabled: true },
  { id: 'servers', labelKey: 'nav.servers', enabled: true },
  { id: 'employees', labelKey: 'nav.employees', enabled: true },
  { id: 'employeePermissions', labelKey: 'nav.employeePermissions', enabled: true },
  { id: 'vacations', labelKey: 'nav.vacations', enabled: true },
  { id: 'licenses', labelKey: 'nav.licenses', enabled: true },
  { id: 'tasks', labelKey: 'nav.tasks', enabled: true },
  { id: 'vault', labelKey: 'nav.vault', enabled: true },  // جديد
  { id: 'networks', labelKey: 'nav.networks', enabled: true },
  { id: 'networkScan', labelKey: 'nav.networkScan', enabled: true },  // جديد
  { id: 'webApps', labelKey: 'nav.webApps', enabled: true },
  { id: 'employeeReports', labelKey: 'nav.employeeReports', enabled: true },
  { id: 'reports', labelKey: 'nav.reports', enabled: true },
  { id: 'auditLog', labelKey: 'nav.auditLog', enabled: true },
  { id: 'settings', labelKey: 'nav.settings', enabled: true },
];
```

---

## المرحلة 2: تفعيل ترتيب القائمة الجانبية الفعلي

### الملف: `src/components/layout/Sidebar.tsx`

**التغييرات:**
- إضافة state لترتيب العناصر المحفوظ
- قراءة الترتيب من `app_settings` عند تحميل المكون
- تطبيق الترتيب والإظهار/الإخفاء على القائمة
- إضافة dependency على `useAppSettings`

```typescript
// إضافة imports جديدة
import { useAppSettings } from '@/hooks/useSupabaseData';

// داخل المكون
const { getSetting } = useAppSettings();
const [orderedItems, setOrderedItems] = useState<typeof menuItems>([]);

useEffect(() => {
  const loadSidebarOrder = async () => {
    const saved = await getSetting('sidebar_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // تطبيق الترتيب على القائمة
        const reordered = parsed
          .filter((item: any) => item.enabled)
          .map((item: any) => menuItems.find(m => m.path.includes(item.id)))
          .filter(Boolean);
        setOrderedItems(reordered);
      } catch (e) {
        setOrderedItems(menuItems);
      }
    } else {
      setOrderedItems(menuItems);
    }
  };
  loadSidebarOrder();
}, [getSetting]);
```

---

## المرحلة 3: إضافة الترجمات الإنجليزية الناقصة

### الملف: `src/contexts/LanguageContext.tsx`

**الترجمات المطلوب إضافتها للإنجليزية:**

```typescript
// Settings Page - English
'settings.accountInfo': 'Account Information',
'settings.name': 'Name',
'settings.email': 'Email',
'settings.role': 'Role',
'settings.admin': 'System Administrator',
'settings.employee': 'Employee',
'settings.appBranding': 'App Customization',
'settings.appBrandingDesc': 'Customize app name and branding',
'settings.appName': 'App Name',
'settings.showsInSidebar': 'This name appears in the sidebar',
'settings.loginBackground': 'Login Background',
'settings.uploadNewImage': 'Upload New Image',
'settings.uploading': 'Uploading...',
'settings.preferredResolution': 'Recommended resolution: 1920×1080 or higher',
'settings.languageSettings': 'Language Settings',
'settings.chooseLanguage': 'Choose your preferred interface language',
'settings.interfaceLanguage': 'Interface Language',
'settings.about': 'About',
'settings.application': 'Application',
'settings.version': 'Version',
'settings.storage': 'Storage',
'settings.cloudStorageNote': 'All data is securely stored in the cloud with full encryption.',
'settings.enableMail': 'Enable Mail',
'settings.enableMailNotifications': 'Enable email notifications',
'settings.smtpServer': 'SMTP Server',
'settings.port': 'Port',
'settings.username': 'Username',
'settings.password': 'Password',
'settings.fromEmail': 'From Email',
'settings.fromName': 'From Name',
'settings.encryption': 'Encryption',
'settings.saveSettings': 'Save Settings',
'settings.testConnection': 'Test Connection',
'settings.enableLdap': 'Enable LDAP',
'settings.ldapIntegration': 'LDAP Integration',
'settings.ldapServer': 'LDAP Server',
'settings.baseDn': 'Base DN',
'settings.bindDn': 'Bind DN',
'settings.bindPassword': 'Bind Password',
'settings.userFilter': 'User Filter',
'settings.useSSL': 'Use SSL',
'settings.enableNtp': 'Enable NTP',
'settings.ntpSettings': 'NTP Settings',
'settings.primaryServer': 'Primary Server',
'settings.secondaryServer': 'Secondary Server',
'settings.syncInterval': 'Sync Interval (seconds)',
'settings.downloadTemplates': 'Download Templates',
'settings.templateDesc': 'Download Excel templates for bulk data import',
'settings.serverTemplate': 'Server Template',
'settings.employeeReportTemplate': 'Employee Report Template',
'settings.licenseTemplate': 'License Template',
'settings.networkTemplate': 'Network Template',
'settings.employeeTemplate': 'Employee Template',
'settings.https': 'HTTPS',
```

**الترجمات العربية المقابلة:**

```typescript
// Settings Page - Arabic
'settings.accountInfo': 'معلومات الحساب',
'settings.name': 'الاسم',
'settings.email': 'البريد الإلكتروني',
'settings.role': 'الدور',
'settings.admin': 'مدير النظام',
'settings.employee': 'موظف',
'settings.appBranding': 'تخصيص التطبيق',
'settings.appBrandingDesc': 'تخصيص اسم التطبيق والعلامة التجارية',
'settings.appName': 'اسم التطبيق',
'settings.showsInSidebar': 'يظهر هذا الاسم في الشريط الجانبي',
'settings.loginBackground': 'خلفية صفحة الدخول',
'settings.uploadNewImage': 'رفع صورة جديدة',
'settings.uploading': 'جارٍ الرفع...',
'settings.preferredResolution': 'يُفضل صورة بدقة 1920×1080 أو أعلى',
'settings.languageSettings': 'إعدادات اللغة',
'settings.chooseLanguage': 'اختر لغة الواجهة المفضلة',
'settings.interfaceLanguage': 'لغة الواجهة',
'settings.about': 'حول التطبيق',
'settings.application': 'التطبيق',
'settings.version': 'الإصدار',
'settings.storage': 'التخزين',
'settings.cloudStorageNote': 'يتم تخزين جميع البيانات بشكل آمن في السحابة مع تشفير كامل.',
'settings.enableMail': 'تفعيل البريد',
'settings.enableMailNotifications': 'تفعيل إرسال الإشعارات عبر البريد',
'settings.smtpServer': 'خادم SMTP',
'settings.port': 'المنفذ',
'settings.username': 'اسم المستخدم',
'settings.password': 'كلمة المرور',
'settings.fromEmail': 'بريد المرسل',
'settings.fromName': 'اسم المرسل',
'settings.encryption': 'التشفير',
'settings.saveSettings': 'حفظ الإعدادات',
'settings.testConnection': 'اختبار الاتصال',
'settings.enableLdap': 'تفعيل LDAP',
'settings.ldapIntegration': 'تكامل LDAP',
'settings.ldapServer': 'خادم LDAP',
'settings.baseDn': 'Base DN',
'settings.bindDn': 'Bind DN',
'settings.bindPassword': 'كلمة مرور الربط',
'settings.userFilter': 'فلتر المستخدمين',
'settings.useSSL': 'استخدام SSL',
'settings.enableNtp': 'تفعيل NTP',
'settings.ntpSettings': 'إعدادات NTP',
'settings.primaryServer': 'الخادم الأساسي',
'settings.secondaryServer': 'الخادم الثانوي',
'settings.syncInterval': 'فترة المزامنة (ثواني)',
'settings.downloadTemplates': 'تحميل القوالب',
'settings.templateDesc': 'حمّل قوالب Excel لاستيراد البيانات بشكل مجمّع',
'settings.serverTemplate': 'قالب السيرفرات',
'settings.employeeReportTemplate': 'قالب تقارير الموظفين',
'settings.licenseTemplate': 'قالب التراخيص',
'settings.networkTemplate': 'قالب الشبكات',
'settings.employeeTemplate': 'قالب الموظفين',
'settings.https': 'HTTPS',
```

---

## المرحلة 4: تحديث صفحة الإعدادات لاستخدام الترجمات

### الملف: `src/pages/Settings.tsx`

**استبدال جميع النصوص الثابتة:**

- `معلومات الحساب` → `{t('settings.accountInfo')}`
- `الاسم` → `{t('settings.name')}`
- `البريد الإلكتروني` → `{t('settings.email')}`
- `الدور` → `{t('settings.role')}`
- `مدير النظام` → `{t('settings.admin')}`
- `موظف` → `{t('settings.employee')}`
- `تخصيص التطبيق` → `{t('settings.appBranding')}`
- وهكذا لجميع النصوص...

---

## المرحلة 5: إنشاء بيانات تجريبية

### إنشاء ملف: `src/utils/seedData.ts`

ملف يحتوي دوال لإنشاء بيانات تجريبية لكل الجداول:

```typescript
// بيانات تجريبية للدومينات
const sampleDomains = [
  { name: 'example.local', description: 'Main corporate domain' },
  { name: 'dev.example.local', description: 'Development domain' },
];

// بيانات تجريبية للشبكات
const sampleNetworks = [
  { name: 'Production Network', subnet: '192.168.1.0/24', gateway: '192.168.1.1' },
  { name: 'Development Network', subnet: '192.168.2.0/24', gateway: '192.168.2.1' },
];

// بيانات تجريبية للسيرفرات
const sampleServers = [
  { name: 'DC01', ip_address: '192.168.1.10', os: 'Windows Server 2022', environment: 'production' },
  { name: 'WEB01', ip_address: '192.168.1.20', os: 'Ubuntu 22.04', environment: 'production' },
  { name: 'DB01', ip_address: '192.168.1.30', os: 'Windows Server 2022', environment: 'production' },
];

// بيانات تجريبية للتراخيص
const sampleLicenses = [
  { name: 'Microsoft 365 E3', product: 'Microsoft 365', expiry_date: '2026-12-31' },
  { name: 'VMware vSphere', product: 'VMware', expiry_date: '2026-06-30' },
];

// بيانات تجريبية للمهام
const sampleTasks = [
  { title: 'Backup Verification', description: 'Verify all server backups', priority: 'p2' },
  { title: 'Security Patches', description: 'Apply monthly security patches', priority: 'p1' },
];

// بيانات تجريبية للتطبيقات
const sampleWebApps = [
  { name: 'GitLab', url: 'https://gitlab.example.local', category: 'development' },
  { name: 'Grafana', url: 'https://grafana.example.local', category: 'monitoring' },
];

// بيانات تجريبية للخزنة
const sampleVaultItems = [
  { title: 'DC01 Admin', username: 'administrator', item_type: 'server' },
  { title: 'GitLab Root', username: 'root', item_type: 'website' },
];
```

### إضافة زر "إنشاء بيانات تجريبية" في الإعدادات

في تبويب عام (General) نضيف:

```typescript
<Card>
  <CardHeader>
    <CardTitle>{t('settings.testData')}</CardTitle>
    <CardDescription>{t('settings.testDataDesc')}</CardDescription>
  </CardHeader>
  <CardContent>
    <Button onClick={handleSeedData} disabled={isSeeding}>
      {isSeeding ? t('common.loading') : t('settings.createTestData')}
    </Button>
  </CardContent>
</Card>
```

---

## الملفات المطلوب تعديلها

| الملف | التغييرات |
|-------|-----------|
| `src/components/settings/SidebarOrderSettings.tsx` | إضافة vault و networkScan |
| `src/components/layout/Sidebar.tsx` | قراءة وتطبيق الترتيب المحفوظ |
| `src/contexts/LanguageContext.tsx` | إضافة 50+ ترجمة للإعدادات |
| `src/pages/Settings.tsx` | استبدال النصوص الثابتة بالترجمات |
| `src/utils/seedData.ts` | ملف جديد للبيانات التجريبية |

---

## الترجمات الإضافية للبيانات التجريبية

```typescript
// English
'settings.testData': 'Test Data',
'settings.testDataDesc': 'Create sample data for testing purposes',
'settings.createTestData': 'Create Test Data',
'settings.dataCreated': 'Test data created successfully',

// Arabic
'settings.testData': 'البيانات التجريبية',
'settings.testDataDesc': 'إنشاء بيانات تجريبية لأغراض الاختبار',
'settings.createTestData': 'إنشاء بيانات تجريبية',
'settings.dataCreated': 'تم إنشاء البيانات التجريبية بنجاح',
```

---

## ملاحظات فنية

1. **ترتيب القائمة الجانبية**: يجب التعامل مع حالة عدم وجود بيانات محفوظة (القائمة الافتراضية)
2. **التوافق**: يجب دمج العناصر الجديدة مع أي إعدادات محفوظة سابقاً
3. **الأداء**: قراءة الترتيب تتم مرة واحدة عند تحميل المكون
4. **البيانات التجريبية**: تتطلب صلاحيات Admin ويجب أن تتحقق من وجود بيانات قبل الإضافة

