
# خطة إصلاح الترجمة الشاملة للصفحات المتبقية

## ملخص المشاكل المكتشفة

بعد فحص الكود، وجدت أن **4 صفحات رئيسية** تحتوي على نصوص عربية ثابتة (hardcoded) لا تتغير عند تحويل اللغة إلى الإنجليزية:

| # | الصفحة | عدد النصوص المطلوب ترجمتها | الأولوية |
|---|--------|---------------------------|----------|
| 1 | `AuditLog.tsx` | ~25 نص | 🔴 High |
| 2 | `EmployeeReports.tsx` | ~15 نص | 🔴 High |
| 3 | `WebApps.tsx` | ~20 نص | 🔴 High |
| 4 | `Networks.tsx` | ~25 نص | 🔴 High |

---

## 1️⃣ إصلاح صفحة سجل العمليات (AuditLog.tsx)

### النصوص الثابتة التي تحتاج ترجمة:

| النص الحالي | مفتاح الترجمة الجديد |
|------------|---------------------|
| `سجل التغييرات` | `auditLog.pageTitle` |
| `تتبع جميع العمليات والتغييرات في النظام` | `auditLog.subtitle` |
| `تحديث` | `common.refresh` |
| `إجمالي السجلات` | `auditLog.totalRecords` |
| `إنشاء` (في الإحصائيات) | `auditLog.created` |
| `تحديث` (في الإحصائيات) | `auditLog.updated` |
| `حذف` (في الإحصائيات) | `auditLog.deleted` |
| `تسجيل دخول` | `auditLog.login` |
| `تسجيل خروج` | `auditLog.logout` |
| `بحث في السجلات...` | `auditLog.searchPlaceholder` |
| `جميع العمليات` | `auditLog.allActions` |
| `جميع الجداول` | `auditLog.allTables` |
| `التاريخ والوقت` | `auditLog.dateTime` |
| `المستخدم` | `auditLog.user` |
| `العملية` | `auditLog.action` |
| `الجدول` | `auditLog.table` |
| `التفاصيل` | `auditLog.details` |
| `مستخدم غير معروف` | `auditLog.unknownUser` |
| `لا توجد سجلات` | `auditLog.noRecords` |
| أسماء الجداول (السيرفرات، الشبكات، ...) | `table.servers`, `table.networks`, etc. |

---

## 2️⃣ إصلاح صفحة تقارير الموظفين (EmployeeReports.tsx)

### النصوص الثابتة:

| النص الحالي | مفتاح الترجمة |
|------------|--------------|
| `نوع التقرير` | `employeeReports.reportType` |
| `يومي` | `employeeReports.daily` |
| `أسبوعي` | `employeeReports.weekly` |
| `شهري` | `employeeReports.monthly` |
| `معاينة (أول 5 صفوف)` | `employeeReports.preview` |
| `فشل في قراءة ملف Excel` | `employeeReports.readError` |
| `يرجى اختيار الموظف والملف` | `employeeReports.selectRequired` |
| `تم رفع التقرير بنجاح` | `employeeReports.uploadSuccess` |
| `هل أنت متأكد من حذف هذا التقرير؟` | `employeeReports.deleteConfirm` |
| `تم حذف التقرير` | `employeeReports.deleteSuccess` |
| `جارٍ التحميل...` | `common.loading` |
| `تقرير` (للملف) | `employeeReports.report` |

---

## 3️⃣ إصلاح صفحة تطبيقات الويب (WebApps.tsx)

### النصوص الثابتة:

| النص الحالي | مفتاح الترجمة |
|------------|--------------|
| `إدارة روابط تطبيقات الويب` | `webApps.subtitle` |
| `إجمالي التطبيقات` | `webApps.totalApps` |
| `نشط` (في الإحصائيات) | `webApps.active` |
| `البحث عن تطبيق...` | `webApps.searchPlaceholder` |
| `التطبيق` | `webApps.app` |
| `الرابط` | `webApps.url` |
| `التصنيف` | `webApps.category` |
| `النطاق` | `webApps.domain` |
| `الحالة` | `webApps.status` |
| `الإجراءات` | `common.actions` |
| `عام` (بدون دومين) | `webApps.public` |
| `نشط` / `معطل` | `webApps.active` / `webApps.disabled` |
| `لا توجد تطبيقات` | `webApps.noApps` |
| `خطأ` / `يرجى ملء الحقول المطلوبة` | `common.error` / `validation.fillRequired` |
| `تم بنجاح` / `تم تحديث التطبيق` | `common.success` / `webApps.updateSuccess` |
| `تم إضافة التطبيق` | `webApps.addSuccess` |
| `تم حذف التطبيق` | `webApps.deleteSuccess` |
| `فشل في حفظ/حذف التطبيق` | `webApps.saveFailed` / `webApps.deleteFailed` |
| `ليس لديك صلاحية للوصول لهذه الصفحة` | `permissions.noAccess` |
| أسماء التصنيفات | `category.infrastructure`, `category.security`, etc. |

### تصنيفات التطبيقات (categoryOptions):
```
البنية التحتية → category.infrastructure
الأمان → category.security
المراقبة → category.monitoring
التواصل → category.communication
التطوير → category.development
أخرى → category.other
```

---

## 4️⃣ إصلاح صفحة الشبكات والدومينات (Networks.tsx)

### النصوص الثابتة:

| النص الحالي | مفتاح الترجمة |
|------------|--------------|
| `الدومينات (X)` | `networks.domainsTab` |
| `الشبكات (X)` | `networks.networksTab` |
| `إضافة دومين` | `networks.addDomain` |
| `إضافة شبكة` | `networks.addNetwork` |
| `اسم الدومين مطلوب` | `networks.domainRequired` |
| `تم تحديث الدومين` | `networks.domainUpdated` |
| `تم إضافة الدومين` | `networks.domainAdded` |
| `اسم الشبكة والدومين مطلوبين` | `networks.networkRequired` |
| `تم تحديث الشبكة` | `networks.networkUpdated` |
| `تم إضافة الشبكة` | `networks.networkAdded` |
| `تم حذف الدومين` | `networks.domainDeleted` |
| `تم حذف الشبكة` | `networks.networkDeleted` |
| `إضافة دومين جديد` | `networks.addNewDomain` |
| `إضافة شبكة جديدة` | `networks.addNewNetwork` |
| `اسم الدومين *` | `networks.domainName` |
| `اسم الشبكة *` | `networks.networkName` |
| `الدومين *` | `networks.domain` |
| `الوصف` | `common.description` |
| `اختر الدومين` | `networks.selectDomain` |
| `DNS Servers (مفصولة بفواصل)` | `networks.dnsServers` |
| `X شبكات` | `networks.networksCount` |
| `X سيرفرات` | `networks.serversCount` |
| `غير محدد` | `common.notSpecified` |

---

## 5️⃣ الترجمات الجديدة المطلوب إضافتها

### في LanguageContext.tsx - العربية:
```typescript
ar: {
  // Audit Log (جديد)
  'auditLog.pageTitle': 'سجل التغييرات',
  'auditLog.subtitle': 'تتبع جميع العمليات والتغييرات في النظام',
  'auditLog.totalRecords': 'إجمالي السجلات',
  'auditLog.created': 'إنشاء',
  'auditLog.updated': 'تحديث',
  'auditLog.deleted': 'حذف',
  'auditLog.login': 'تسجيل دخول',
  'auditLog.logout': 'تسجيل خروج',
  'auditLog.searchPlaceholder': 'بحث في السجلات...',
  'auditLog.allActions': 'جميع العمليات',
  'auditLog.allTables': 'جميع الجداول',
  'auditLog.dateTime': 'التاريخ والوقت',
  'auditLog.user': 'المستخدم',
  'auditLog.action': 'العملية',
  'auditLog.table': 'الجدول',
  'auditLog.details': 'التفاصيل',
  'auditLog.noRecords': 'لا توجد سجلات',

  // Table Names
  'table.servers': 'السيرفرات',
  'table.networks': 'الشبكات',
  'table.domains': 'الدومينات',
  'table.licenses': 'التراخيص',
  'table.tasks': 'المهام',
  'table.profiles': 'الموظفين',
  'table.vacations': 'الإجازات',
  'table.domain_memberships': 'صلاحيات الدومين',

  // Employee Reports (جديد)
  'employeeReports.reportType': 'نوع التقرير',
  'employeeReports.daily': 'يومي',
  'employeeReports.weekly': 'أسبوعي',
  'employeeReports.monthly': 'شهري',
  'employeeReports.preview': 'معاينة (أول 5 صفوف)',
  'employeeReports.readError': 'فشل في قراءة ملف Excel',
  'employeeReports.selectRequired': 'يرجى اختيار الموظف والملف',
  'employeeReports.uploadSuccess': 'تم رفع التقرير بنجاح',
  'employeeReports.deleteConfirm': 'هل أنت متأكد من حذف هذا التقرير؟',
  'employeeReports.deleteSuccess': 'تم حذف التقرير',
  'employeeReports.report': 'تقرير',

  // Web Apps (جديد)
  'webApps.subtitle': 'إدارة روابط تطبيقات الويب',
  'webApps.totalApps': 'إجمالي التطبيقات',
  'webApps.active': 'نشط',
  'webApps.disabled': 'معطل',
  'webApps.searchPlaceholder': 'البحث عن تطبيق...',
  'webApps.app': 'التطبيق',
  'webApps.url': 'الرابط',
  'webApps.category': 'التصنيف',
  'webApps.domain': 'النطاق',
  'webApps.status': 'الحالة',
  'webApps.public': 'عام',
  'webApps.noApps': 'لا توجد تطبيقات',
  'webApps.updateSuccess': 'تم تحديث التطبيق',
  'webApps.addSuccess': 'تم إضافة التطبيق',
  'webApps.deleteSuccess': 'تم حذف التطبيق',
  'webApps.saveFailed': 'فشل في حفظ التطبيق',
  'webApps.deleteFailed': 'فشل في حذف التطبيق',

  // Categories
  'category.infrastructure': 'البنية التحتية',
  'category.security': 'الأمان',
  'category.monitoring': 'المراقبة',
  'category.communication': 'التواصل',
  'category.development': 'التطوير',
  'category.other': 'أخرى',

  // Networks (جديد)
  'networks.domainsTab': 'الدومينات',
  'networks.networksTab': 'الشبكات',
  'networks.addDomain': 'إضافة دومين',
  'networks.addNetwork': 'إضافة شبكة',
  'networks.domainRequired': 'اسم الدومين مطلوب',
  'networks.domainUpdated': 'تم تحديث الدومين',
  'networks.domainAdded': 'تم إضافة الدومين',
  'networks.networkRequired': 'اسم الشبكة والدومين مطلوبين',
  'networks.networkUpdated': 'تم تحديث الشبكة',
  'networks.networkAdded': 'تم إضافة الشبكة',
  'networks.domainDeleted': 'تم حذف الدومين',
  'networks.networkDeleted': 'تم حذف الشبكة',
  'networks.addNewDomain': 'إضافة دومين جديد',
  'networks.addNewNetwork': 'إضافة شبكة جديدة',
  'networks.domainName': 'اسم الدومين',
  'networks.networkName': 'اسم الشبكة',
  'networks.domain': 'الدومين',
  'networks.selectDomain': 'اختر الدومين',
  'networks.dnsServers': 'خوادم DNS (مفصولة بفواصل)',
  'networks.networksCount': 'شبكات',
  'networks.serversCount': 'سيرفرات',
  
  // Common additions
  'common.description': 'الوصف',
  'common.notSpecified': 'غير محدد',
}
```

### في LanguageContext.tsx - الإنجليزية:
```typescript
en: {
  // Audit Log
  'auditLog.pageTitle': 'Change Log',
  'auditLog.subtitle': 'Track all operations and changes in the system',
  'auditLog.totalRecords': 'Total Records',
  'auditLog.created': 'Created',
  'auditLog.updated': 'Updated',
  'auditLog.deleted': 'Deleted',
  'auditLog.login': 'Login',
  'auditLog.logout': 'Logout',
  'auditLog.searchPlaceholder': 'Search logs...',
  'auditLog.allActions': 'All Actions',
  'auditLog.allTables': 'All Tables',
  'auditLog.dateTime': 'Date & Time',
  'auditLog.user': 'User',
  'auditLog.action': 'Action',
  'auditLog.table': 'Table',
  'auditLog.details': 'Details',
  'auditLog.noRecords': 'No records found',

  // Table Names
  'table.servers': 'Servers',
  'table.networks': 'Networks',
  'table.domains': 'Domains',
  'table.licenses': 'Licenses',
  'table.tasks': 'Tasks',
  'table.profiles': 'Employees',
  'table.vacations': 'Vacations',
  'table.domain_memberships': 'Domain Permissions',

  // Employee Reports
  'employeeReports.reportType': 'Report Type',
  'employeeReports.daily': 'Daily',
  'employeeReports.weekly': 'Weekly',
  'employeeReports.monthly': 'Monthly',
  'employeeReports.preview': 'Preview (first 5 rows)',
  'employeeReports.readError': 'Failed to read Excel file',
  'employeeReports.selectRequired': 'Please select employee and file',
  'employeeReports.uploadSuccess': 'Report uploaded successfully',
  'employeeReports.deleteConfirm': 'Are you sure you want to delete this report?',
  'employeeReports.deleteSuccess': 'Report deleted',
  'employeeReports.report': 'Report',

  // Web Apps
  'webApps.subtitle': 'Manage web application links',
  'webApps.totalApps': 'Total Applications',
  'webApps.active': 'Active',
  'webApps.disabled': 'Disabled',
  'webApps.searchPlaceholder': 'Search application...',
  'webApps.app': 'Application',
  'webApps.url': 'URL',
  'webApps.category': 'Category',
  'webApps.domain': 'Domain',
  'webApps.status': 'Status',
  'webApps.public': 'Public',
  'webApps.noApps': 'No applications found',
  'webApps.updateSuccess': 'Application updated',
  'webApps.addSuccess': 'Application added',
  'webApps.deleteSuccess': 'Application deleted',
  'webApps.saveFailed': 'Failed to save application',
  'webApps.deleteFailed': 'Failed to delete application',

  // Categories
  'category.infrastructure': 'Infrastructure',
  'category.security': 'Security',
  'category.monitoring': 'Monitoring',
  'category.communication': 'Communication',
  'category.development': 'Development',
  'category.other': 'Other',

  // Networks
  'networks.domainsTab': 'Domains',
  'networks.networksTab': 'Networks',
  'networks.addDomain': 'Add Domain',
  'networks.addNetwork': 'Add Network',
  'networks.domainRequired': 'Domain name is required',
  'networks.domainUpdated': 'Domain updated',
  'networks.domainAdded': 'Domain added',
  'networks.networkRequired': 'Network name and domain are required',
  'networks.networkUpdated': 'Network updated',
  'networks.networkAdded': 'Network added',
  'networks.domainDeleted': 'Domain deleted',
  'networks.networkDeleted': 'Network deleted',
  'networks.addNewDomain': 'Add New Domain',
  'networks.addNewNetwork': 'Add New Network',
  'networks.domainName': 'Domain Name',
  'networks.networkName': 'Network Name',
  'networks.domain': 'Domain',
  'networks.selectDomain': 'Select Domain',
  'networks.dnsServers': 'DNS Servers (comma separated)',
  'networks.networksCount': 'networks',
  'networks.serversCount': 'servers',
  
  // Common additions
  'common.description': 'Description',
  'common.notSpecified': 'Not specified',
}
```

---

## 6️⃣ التغييرات المطلوبة في كل ملف

### AuditLog.tsx:
- استبدال ~25 نص عربي بـ `t('key')`
- تعديل دوال `getActionLabel` و `getTableLabel` لاستخدام الترجمات

### EmployeeReports.tsx:
- استبدال ~15 نص عربي بـ `t('key')`
- تعديل عرض نوع التقرير ليستخدم الترجمات

### WebApps.tsx:
- استبدال ~20 نص عربي بـ `t('key')`
- تعديل `categoryOptions` ليستخدم مفاتيح الترجمة

### Networks.tsx:
- استبدال ~25 نص عربي بـ `t('key')`
- تعديل labels الأزرار والنماذج

---

## 7️⃣ ترتيب التنفيذ

| # | المهمة | الملف |
|---|--------|-------|
| 1 | إضافة جميع الترجمات الجديدة | `LanguageContext.tsx` |
| 2 | تحديث صفحة سجل العمليات | `AuditLog.tsx` |
| 3 | تحديث صفحة تقارير الموظفين | `EmployeeReports.tsx` |
| 4 | تحديث صفحة تطبيقات الويب | `WebApps.tsx` |
| 5 | تحديث صفحة الشبكات | `Networks.tsx` |

---

## 8️⃣ النتيجة المتوقعة

بعد التنفيذ:
- ✅ **جميع الصفحات** تتغير بالكامل عند تحويل اللغة
- ✅ **سجل العمليات** يظهر بالإنجليزية بالكامل
- ✅ **تقارير الموظفين** يظهر بالإنجليزية بالكامل
- ✅ **تطبيقات الويب** يظهر بالإنجليزية بالكامل
- ✅ **الشبكات والدومينات** يظهر بالإنجليزية بالكامل
- ✅ **التصنيفات وأسماء الجداول** تتغير حسب اللغة
