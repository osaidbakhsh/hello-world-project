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
    'nav.licenses': 'التراخيص',
    'nav.tasks': 'المهام',
    'nav.networks': 'الشبكات',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'nav.vacations': 'الإجازات',
    'nav.employeeReports': 'تقارير الموظفين',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم الرئيسية',
    'dashboard.totalServers': 'إجمالي السيرفرات',
    'dashboard.activeServers': 'السيرفرات النشطة',
    'dashboard.expiringLicenses': 'تراخيص قريبة الانتهاء',
    'dashboard.pendingTasks': 'المهام المعلقة',
    'dashboard.employees': 'الموظفين',
    'dashboard.networks': 'الشبكات',
    'dashboard.selectNetwork': 'اختر الشبكة',
    'dashboard.allNetworks': 'جميع الشبكات',
    
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
    'servers.status': 'الحالة',
    'servers.lastUpdate': 'آخر تحديث',
    
    // Environment types
    'env.production': 'إنتاج',
    'env.testing': 'اختبار',
    'env.development': 'تطوير',
    'env.staging': 'مرحلة ما قبل الإنتاج',
    
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
    'licenses.cost': 'التكلفة',
    'licenses.vendor': 'المورد',
    'licenses.notes': 'ملاحظات',
    
    // Tasks
    'tasks.title': 'إدارة المهام',
    'tasks.add': 'إضافة مهمة',
    'tasks.name': 'اسم المهمة',
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
    
    // Common
    'common.save': 'حفظ',
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
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.servers': 'Servers',
    'nav.employees': 'Employees',
    'nav.licenses': 'Licenses',
    'nav.tasks': 'Tasks',
    'nav.networks': 'Networks',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.vacations': 'Vacations',
    'nav.employeeReports': 'Employee Reports',
    
    // Dashboard
    'dashboard.title': 'Main Dashboard',
    'dashboard.totalServers': 'Total Servers',
    'dashboard.activeServers': 'Active Servers',
    'dashboard.expiringLicenses': 'Expiring Licenses',
    'dashboard.pendingTasks': 'Pending Tasks',
    'dashboard.employees': 'Employees',
    'dashboard.networks': 'Networks',
    'dashboard.selectNetwork': 'Select Network',
    'dashboard.allNetworks': 'All Networks',
    
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
    'servers.status': 'Status',
    'servers.lastUpdate': 'Last Update',
    
    // Environment types
    'env.production': 'Production',
    'env.testing': 'Testing',
    'env.development': 'Development',
    'env.staging': 'Staging',
    
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
    'licenses.cost': 'Cost',
    'licenses.vendor': 'Vendor',
    'licenses.notes': 'Notes',
    
    // Tasks
    'tasks.title': 'Task Management',
    'tasks.add': 'Add Task',
    'tasks.name': 'Task Name',
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
    
    // Common
    'common.save': 'Save',
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
