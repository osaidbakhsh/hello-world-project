import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.servers': 'السيرفرات',
    'nav.employees': 'الموظفين',
    'nav.employeePermissions': 'صلاحيات الموظفين',
    'nav.licenses': 'التراخيص',
    'nav.tasks': 'المهام',
    'nav.networks': 'النطاقات',
    'nav.domains': 'النطاقات',
    'nav.webApps': 'تطبيقات الويب',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'nav.vacations': 'الإجازات',
    'nav.employeeReports': 'تقارير الموظفين',
    'nav.auditLog': 'سجل العمليات',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم الرئيسية',
    'dashboard.totalServers': 'إجمالي السيرفرات',
    'dashboard.activeServers': 'السيرفرات النشطة',
    'dashboard.expiringLicenses': 'تراخيص قريبة الانتهاء',
    'dashboard.pendingTasks': 'المهام المعلقة',
    'dashboard.employees': 'الموظفين',
    'dashboard.networks': 'النطاقات',
    'dashboard.domains': 'النطاقات',
    'dashboard.selectNetwork': 'اختر النطاق',
    'dashboard.allNetworks': 'جميع النطاقات',
    'dashboard.allDomains': 'جميع النطاقات',
    'dashboard.myTasks': 'مهامي',
    'dashboard.teamTasks': 'مهام الفريق',
    'dashboard.allTasks': 'كل المهام',
    
    // Web Apps
    'webApps.title': 'تطبيقات الويب',
    'webApps.add': 'إضافة تطبيق',
    'webApps.manage': 'إدارة التطبيقات',
    'webApps.openLink': 'فتح الرابط',
    
    // Servers
    'servers.title': 'إدارة السيرفرات',
    'servers.add': 'إضافة سيرفر',
    'servers.import': 'استيراد من Excel',
    'servers.export': 'تصدير إلى Excel',
    'servers.name': 'اسم السيرفر',
    'servers.ip': 'عنوان IP',
    'servers.os': 'نظام التشغيل',
    'servers.osVersion': 'إصدار النظام',
    'servers.environment': 'البيئة',
    'servers.owner': 'المالك',
    'servers.responsible': 'المسؤول',
    'servers.description': 'الوصف',
    'servers.diskSpace': 'مساحة القرص',
    'servers.users': 'المستخدمين',
    'servers.network': 'الشبكة',
    'servers.domain': 'النطاق',
    'servers.status': 'الحالة',
    'servers.lastUpdate': 'آخر تحديث',
    'servers.notes': 'ملاحظات',
    
    // Environment types
    'env.production': 'إنتاج',
    'env.testing': 'اختبار',
    'env.development': 'تطوير',
    'env.staging': 'مرحلة ما قبل الإنتاج',
    
    // Status
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    
    // Employees
    'employees.title': 'إدارة الموظفين',
    'employees.add': 'إضافة موظف',
    'employees.name': 'الاسم',
    'employees.position': 'المنصب',
    'employees.email': 'البريد الإلكتروني',
    'employees.phone': 'الهاتف',
    'employees.department': 'القسم',
    'employees.vacations': 'الإجازات',
    'employees.trainings': 'الدورات التدريبية',
    'employees.assignedServers': 'السيرفرات المسندة',
    'employees.addVacation': 'إضافة إجازة',
    'employees.addTraining': 'إضافة دورة',
    'employees.admin': 'مدير',
    'employees.employee': 'موظف',
    'employees.role': 'الدور',
    
    // Departments
    'dept.it': 'تكنولوجيا المعلومات',
    'dept.devops': 'DevOps',
    'dept.security': 'الأمن السيبراني',
    'dept.network': 'الشبكات',
    'dept.support': 'الدعم الفني',
    'dept.sysadmin': 'مدير النظام',
    
    // Vacations
    'vacations.title': 'إدارة الإجازات',
    'vacations.employee': 'الموظف',
    'vacations.type': 'نوع الإجازة',
    'vacations.annual': 'سنوية',
    'vacations.sick': 'مرضية',
    'vacations.emergency': 'طارئة',
    'vacations.unpaid': 'بدون راتب',
    'vacations.startDate': 'تاريخ البدء',
    'vacations.endDate': 'تاريخ النهاية',
    'vacations.status': 'الحالة',
    'vacations.pending': 'معلقة',
    'vacations.approved': 'مقبولة',
    'vacations.rejected': 'مرفوضة',
    'vacations.days': 'عدد الأيام',
    'vacations.fillRequired': 'يرجى ملء جميع الحقول المطلوبة',
    'vacations.selectEmployee': 'يرجى اختيار الموظف',
    'vacations.addSuccess': 'تم إضافة الإجازة بنجاح',
    
    // Employee Reports
    'employeeReports.title': 'تقارير الموظفين',
    'employeeReports.upload': 'رفع تقرير',
    'employeeReports.archive': 'أرشيف التقارير',
    'employeeReports.date': 'تاريخ التقرير',
    'employeeReports.uploadedBy': 'رفع بواسطة',
    'employeeReports.notes': 'ملاحظات',
    'employeeReports.file': 'الملف',
    'employeeReports.download': 'تحميل',
    
    // Licenses
    'licenses.title': 'إدارة التراخيص',
    'licenses.add': 'إضافة ترخيص',
    'licenses.name': 'اسم الترخيص',
    'licenses.product': 'المنتج',
    'licenses.key': 'مفتاح الترخيص',
    'licenses.startDate': 'تاريخ البدء',
    'licenses.expiryDate': 'تاريخ الانتهاء',
    'licenses.daysLeft': 'الأيام المتبقية',
    'licenses.server': 'السيرفر المرتبط',
    'licenses.domain': 'النطاق',
    'licenses.cost': 'التكلفة',
    'licenses.vendor': 'المورد',
    'licenses.notes': 'ملاحظات',
    'licenses.purchaseDate': 'تاريخ الشراء',
    'licenses.quantity': 'الكمية',
    'licenses.status': 'الحالة',
    
    // Tasks
    'tasks.pageTitle': 'إدارة المهام',
    'tasks.add': 'إضافة مهمة',
    'tasks.name': 'اسم المهمة',
    'tasks.title': 'العنوان',
    'tasks.description': 'الوصف',
    'tasks.assignee': 'المسؤول',
    'tasks.frequency': 'التكرار',
    'tasks.daily': 'يومية',
    'tasks.weekly': 'أسبوعية',
    'tasks.monthly': 'شهرية',
    'tasks.once': 'مرة واحدة',
    'tasks.dueDate': 'تاريخ الاستحقاق',
    'tasks.completed': 'مكتملة',
    'tasks.pending': 'معلقة',
    'tasks.overdue': 'متأخرة',
    'tasks.status': 'الحالة',
    'tasks.priority': 'الأولوية',
    
    // Networks
    'networks.name': 'اسم الشبكة',
    'networks.subnet': 'الشبكة الفرعية',
    'networks.gateway': 'البوابة',
    'networks.description': 'الوصف',
    
    // Reports
    'reports.exportFull': 'تصدير التقرير الكامل',
    'reports.infrastructureSummary': 'ملخص البنية التحتية',
    'reports.records': 'سجل',
    'reports.report': 'تقرير',
    'reports.serversByEnv': 'السيرفرات حسب البيئة',
    'reports.tasksStatus': 'حالة المهام',
    'reports.selectDomain': 'اختر النطاق',
    'reports.allDomains': 'جميع النطاقات',
    'reports.exportSuccess': 'تم تصدير التقرير بنجاح',
    'reports.fullExportSuccess': 'تم تصدير التقرير الكامل بنجاح',
    
    // Common
    'common.save': 'حفظ',
    'common.saving': 'جاري الحفظ...',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.search': 'بحث...',
    'common.filter': 'تصفية',
    'common.all': 'الكل',
    'common.actions': 'الإجراءات',
    'common.noData': 'لا توجد بيانات',
    'common.loading': 'جاري التحميل...',
    'common.success': 'تم بنجاح',
    'common.error': 'حدث خطأ',
    'common.confirm': 'تأكيد',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.days': 'يوم',
    'common.active': 'نشط',
    'common.inactive': 'غير نشط',
    'common.offlineMode': 'وضع بدون اتصال',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.refresh': 'تحديث',
    'common.signOut': 'تسجيل الخروج',
    'common.add': 'إضافة',
    'common.close': 'إغلاق',
    'common.required': 'مطلوب',
    'common.view': 'عرض',
    'common.permissions': 'صلاحيات',
    'common.resetPassword': 'إعادة تعيين كلمة المرور',

    // Permissions Page
    'permissions.title': 'إدارة الموظفين والصلاحيات',
    'permissions.subtitle': 'إضافة موظفين جدد وتعيين صلاحياتهم على الدومينات',
    'permissions.totalEmployees': 'إجمالي الموظفين',
    'permissions.admins': 'المسؤولون',
    'permissions.employees': 'الموظفون',
    'permissions.all': 'الكل',
    'permissions.searchEmployee': 'البحث عن موظف...',
    'permissions.employeeList': 'قائمة الموظفين',
    'permissions.employeeListDesc': 'عرض وإدارة جميع الموظفين المسجلين في النظام',
    'permissions.addEmployee': 'إضافة موظف',
    'permissions.ldapImport': 'استيراد من LDAP',
    'permissions.domains': 'الدومينات',
    'permissions.domainPermissions': 'صلاحيات الدومين',
    'permissions.canView': 'عرض',
    'permissions.canEdit': 'تعديل',
    'permissions.savePermissions': 'حفظ الصلاحيات',
    'permissions.deleteEmployee': 'حذف الموظف',
    'permissions.deleteConfirm': 'هل أنت متأكد من حذف هذا الموظف؟',
    'permissions.deleteWarning': 'سيتم حذف جميع بيانات الموظف نهائياً',
    'permissions.passwordResetSent': 'تم إرسال رابط إعادة تعيين كلمة المرور',
    'permissions.permissionsSaved': 'تم حفظ الصلاحيات بنجاح',
    'permissions.noAccess': 'ليس لديك صلاحية للوصول لهذه الصفحة',
    'permissions.employeeInfo': 'معلومات الموظف',
    'permissions.resetPasswordDesc': 'سيتم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني',
    'permissions.noDomains': 'لا يوجد دومينات. قم بإضافة دومين أولاً من صفحة الشبكات.',
    'permissions.noEmployees': 'لا يوجد موظفين',
    'permissions.addNewEmployee': 'إضافة موظف جديد',
    'permissions.addEmployeeDesc': 'أدخل بيانات الموظف الجديد. سيتم إرسال رابط تأكيد البريد الإلكتروني.',
    'permissions.domain': 'الدومين',
    'permissions.notAssigned': 'لا يوجد',
    'permissions.notSpecified': 'لم يحدد',
    'permissions.permissionsFor': 'صلاحيات الموظف',
    'permissions.permissionsDesc': 'حدد الدومينات التي يمكن للموظف الوصول إليها. صلاحية "التعديل" تتيح له إضافة وتعديل السيرفرات والمهام.',
    'permissions.adding': 'جاري الإضافة...',
    'permissions.addEmployeeBtn': 'إضافة الموظف',

    // Form Labels
    'form.email': 'البريد الإلكتروني',
    'form.password': 'كلمة المرور',
    'form.fullName': 'الاسم الكامل',
    'form.department': 'القسم',
    'form.position': 'المنصب',
    'form.phone': 'رقم الهاتف',
    'form.role': 'الدور',
    'form.newPassword': 'كلمة المرور الجديدة',
    'form.minChars': 'أحرف على الأقل',
    'form.example': 'مثال',

    // Validation
    'validation.fillRequired': 'يرجى ملء جميع الحقول المطلوبة',
    'validation.passwordMin': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    'validation.phoneFormat': 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',

    // Sidebar Order
    'sidebar.orderTitle': 'ترتيب القائمة الجانبية',
    'sidebar.orderDesc': 'قم بترتيب عناصر القائمة الجانبية حسب تفضيلاتك',
    'sidebar.saveOrder': 'حفظ الترتيب',
    'sidebar.reset': 'إعادة تعيين',

    // Settings
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
    'settings.customization': 'التخصيص',
    'settings.sectionOrder': 'ترتيب الأقسام',

    // Audit Log
    'auditLog.title': 'سجل العمليات',
    'auditLog.unknownUser': 'مستخدم غير معروف',
    'auditLog.create': 'إنشاء',
    'auditLog.update': 'تحديث',
    'auditLog.delete': 'حذف',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.servers': 'Servers',
    'nav.employees': 'Employees',
    'nav.employeePermissions': 'Employee Permissions',
    'nav.licenses': 'Licenses',
    'nav.tasks': 'Tasks',
    'nav.networks': 'Domains',
    'nav.domains': 'Domains',
    'nav.webApps': 'Web Apps',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.vacations': 'Vacations',
    'nav.employeeReports': 'Employee Reports',
    'nav.auditLog': 'Audit Log',
    
    // Dashboard
    'dashboard.title': 'Main Dashboard',
    'dashboard.totalServers': 'Total Servers',
    'dashboard.activeServers': 'Active Servers',
    'dashboard.expiringLicenses': 'Expiring Licenses',
    'dashboard.pendingTasks': 'Pending Tasks',
    'dashboard.employees': 'Employees',
    'dashboard.networks': 'Domains',
    'dashboard.domains': 'Domains',
    'dashboard.selectNetwork': 'Select Domain',
    'dashboard.allNetworks': 'All Domains',
    'dashboard.allDomains': 'All Domains',
    'dashboard.myTasks': 'My Tasks',
    'dashboard.teamTasks': 'Team Tasks',
    'dashboard.allTasks': 'All Tasks',
    
    // Web Apps
    'webApps.title': 'Web Applications',
    'webApps.add': 'Add Application',
    'webApps.manage': 'Manage Apps',
    'webApps.openLink': 'Open Link',
    
    // Servers
    'servers.title': 'Server Management',
    'servers.add': 'Add Server',
    'servers.import': 'Import from Excel',
    'servers.export': 'Export to Excel',
    'servers.name': 'Server Name',
    'servers.ip': 'IP Address',
    'servers.os': 'Operating System',
    'servers.osVersion': 'OS Version',
    'servers.environment': 'Environment',
    'servers.owner': 'Owner',
    'servers.responsible': 'Responsible',
    'servers.description': 'Description',
    'servers.diskSpace': 'Disk Space',
    'servers.users': 'Users',
    'servers.network': 'Network',
    'servers.domain': 'Domain',
    'servers.status': 'Status',
    'servers.lastUpdate': 'Last Update',
    'servers.notes': 'Notes',
    
    // Environment types
    'env.production': 'Production',
    'env.testing': 'Testing',
    'env.development': 'Development',
    'env.staging': 'Staging',
    
    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    
    // Employees
    'employees.title': 'Employee Management',
    'employees.add': 'Add Employee',
    'employees.name': 'Name',
    'employees.position': 'Position',
    'employees.email': 'Email',
    'employees.phone': 'Phone',
    'employees.department': 'Department',
    'employees.vacations': 'Vacations',
    'employees.trainings': 'Training Courses',
    'employees.assignedServers': 'Assigned Servers',
    'employees.addVacation': 'Add Vacation',
    'employees.addTraining': 'Add Training',
    'employees.admin': 'Admin',
    'employees.employee': 'Employee',
    'employees.role': 'Role',
    
    // Departments
    'dept.it': 'IT',
    'dept.devops': 'DevOps',
    'dept.security': 'Security',
    'dept.network': 'Network',
    'dept.support': 'Support',
    'dept.sysadmin': 'System Admin',
    
    // Vacations
    'vacations.title': 'Vacation Management',
    'vacations.employee': 'Employee',
    'vacations.type': 'Vacation Type',
    'vacations.annual': 'Annual',
    'vacations.sick': 'Sick',
    'vacations.emergency': 'Emergency',
    'vacations.unpaid': 'Unpaid',
    'vacations.startDate': 'Start Date',
    'vacations.endDate': 'End Date',
    'vacations.status': 'Status',
    'vacations.pending': 'Pending',
    'vacations.approved': 'Approved',
    'vacations.rejected': 'Rejected',
    'vacations.days': 'Days',
    'vacations.fillRequired': 'Please fill all required fields',
    'vacations.selectEmployee': 'Please select an employee',
    'vacations.addSuccess': 'Vacation added successfully',
    
    // Employee Reports
    'employeeReports.title': 'Employee Reports',
    'employeeReports.upload': 'Upload Report',
    'employeeReports.archive': 'Reports Archive',
    'employeeReports.date': 'Report Date',
    'employeeReports.uploadedBy': 'Uploaded By',
    'employeeReports.notes': 'Notes',
    'employeeReports.file': 'File',
    'employeeReports.download': 'Download',
    
    // Licenses
    'licenses.title': 'License Management',
    'licenses.add': 'Add License',
    'licenses.name': 'License Name',
    'licenses.product': 'Product',
    'licenses.key': 'License Key',
    'licenses.startDate': 'Start Date',
    'licenses.expiryDate': 'Expiry Date',
    'licenses.daysLeft': 'Days Left',
    'licenses.server': 'Linked Server',
    'licenses.domain': 'Domain',
    'licenses.cost': 'Cost',
    'licenses.vendor': 'Vendor',
    'licenses.notes': 'Notes',
    'licenses.purchaseDate': 'Purchase Date',
    'licenses.quantity': 'Quantity',
    'licenses.status': 'Status',
    
    // Tasks
    'tasks.pageTitle': 'Task Management',
    'tasks.add': 'Add Task',
    'tasks.name': 'Task Name',
    'tasks.title': 'Title',
    'tasks.description': 'Description',
    'tasks.assignee': 'Assignee',
    'tasks.frequency': 'Frequency',
    'tasks.daily': 'Daily',
    'tasks.weekly': 'Weekly',
    'tasks.monthly': 'Monthly',
    'tasks.once': 'Once',
    'tasks.dueDate': 'Due Date',
    'tasks.completed': 'Completed',
    'tasks.pending': 'Pending',
    'tasks.overdue': 'Overdue',
    'tasks.status': 'Status',
    'tasks.priority': 'Priority',
    
    // Networks
    'networks.name': 'Network Name',
    'networks.subnet': 'Subnet',
    'networks.gateway': 'Gateway',
    'networks.description': 'Description',
    
    // Reports
    'reports.exportFull': 'Export Full Report',
    'reports.infrastructureSummary': 'Infrastructure Summary',
    'reports.records': 'records',
    'reports.report': 'Report',
    'reports.serversByEnv': 'Servers by Environment',
    'reports.tasksStatus': 'Tasks Status',
    'reports.selectDomain': 'Select Domain',
    'reports.allDomains': 'All Domains',
    'reports.exportSuccess': 'Report exported successfully',
    'reports.fullExportSuccess': 'Full report exported successfully',
    
    // Common
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.actions': 'Actions',
    'common.noData': 'No data available',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error occurred',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.days': 'days',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.offlineMode': 'Offline Mode',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.refresh': 'Refresh',
    'common.signOut': 'Sign Out',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.required': 'Required',
    'common.view': 'View',
    'common.permissions': 'Permissions',
    'common.resetPassword': 'Reset Password',

    // Permissions Page
    'permissions.title': 'Employee & Permissions Management',
    'permissions.subtitle': 'Add new employees and assign domain permissions',
    'permissions.totalEmployees': 'Total Employees',
    'permissions.admins': 'Admins',
    'permissions.employees': 'Employees',
    'permissions.all': 'All',
    'permissions.searchEmployee': 'Search employee...',
    'permissions.employeeList': 'Employee List',
    'permissions.employeeListDesc': 'View and manage all registered employees',
    'permissions.addEmployee': 'Add Employee',
    'permissions.ldapImport': 'Import from LDAP',
    'permissions.domains': 'Domains',
    'permissions.domainPermissions': 'Domain Permissions',
    'permissions.canView': 'View',
    'permissions.canEdit': 'Edit',
    'permissions.savePermissions': 'Save Permissions',
    'permissions.deleteEmployee': 'Delete Employee',
    'permissions.deleteConfirm': 'Are you sure you want to delete this employee?',
    'permissions.deleteWarning': 'All employee data will be permanently deleted',
    'permissions.passwordResetSent': 'Password reset link has been sent',
    'permissions.permissionsSaved': 'Permissions saved successfully',
    'permissions.noAccess': 'You do not have access to this page',
    'permissions.employeeInfo': 'Employee Info',
    'permissions.resetPasswordDesc': 'Password reset link will be sent to the employee email',
    'permissions.noDomains': 'No domains available. Add a domain first from the Networks page.',
    'permissions.noEmployees': 'No employees found',
    'permissions.addNewEmployee': 'Add New Employee',
    'permissions.addEmployeeDesc': 'Enter new employee details. A confirmation email will be sent.',
    'permissions.domain': 'Domain',
    'permissions.notAssigned': 'None',
    'permissions.notSpecified': 'Not specified',
    'permissions.permissionsFor': 'Employee Permissions',
    'permissions.permissionsDesc': 'Select domains the employee can access. "Edit" permission allows adding and modifying servers and tasks.',
    'permissions.adding': 'Adding...',
    'permissions.addEmployeeBtn': 'Add Employee',

    // Form Labels
    'form.email': 'Email',
    'form.password': 'Password',
    'form.fullName': 'Full Name',
    'form.department': 'Department',
    'form.position': 'Position',
    'form.phone': 'Phone Number',
    'form.role': 'Role',
    'form.newPassword': 'New Password',
    'form.minChars': 'characters minimum',
    'form.example': 'Example',

    // Validation
    'validation.fillRequired': 'Please fill all required fields',
    'validation.passwordMin': 'Password must be at least 6 characters',
    'validation.phoneFormat': 'Phone must start with 05 and be 10 digits',

    // Sidebar Order
    'sidebar.orderTitle': 'Sidebar Menu Order',
    'sidebar.orderDesc': 'Arrange sidebar menu items according to your preferences',
    'sidebar.saveOrder': 'Save Order',
    'sidebar.reset': 'Reset',

    // Settings
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
    'settings.customization': 'Customization',
    'settings.sectionOrder': 'Section Order',

    // Audit Log
    'auditLog.title': 'Audit Log',
    'auditLog.unknownUser': 'Unknown User',
    'auditLog.create': 'Create',
    'auditLog.update': 'Update',
    'auditLog.delete': 'Delete',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('it-manager-language');
    return (saved as Language) || 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('it-manager-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
