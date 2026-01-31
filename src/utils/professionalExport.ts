import * as XLSX from 'xlsx';

interface ExportColumn {
  key: string;
  label: string;
  width?: number;
}

interface ExportOptions {
  data: any[];
  filename: string;
  sheetName: string;
  columns: ExportColumn[];
  title?: string;
  includeStats?: boolean;
  isArabic?: boolean;
}

interface StatItem {
  metric: string;
  value: string | number;
}

// Calculate basic statistics from data
const calculateStats = (data: any[], isArabic: boolean): StatItem[] => {
  const now = new Date();
  return [
    { 
      metric: isArabic ? 'إجمالي السجلات' : 'Total Records', 
      value: data.length 
    },
    { 
      metric: isArabic ? 'تاريخ التصدير' : 'Export Date', 
      value: now.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US') 
    },
    { 
      metric: isArabic ? 'وقت التصدير' : 'Export Time', 
      value: now.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US') 
    },
  ];
};

// Export data to professionally formatted Excel
export const exportProfessionalExcel = (options: ExportOptions): void => {
  const { 
    data, 
    filename, 
    sheetName, 
    columns, 
    title, 
    includeStats = true,
    isArabic = true 
  } = options;

  const wb = XLSX.utils.book_new();

  // Transform data to match column labels
  const exportData = data.map(row => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      newRow[col.label] = row[col.key] ?? '';
    });
    return newRow;
  });

  // Create main data sheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Add statistics sheet if requested
  if (includeStats) {
    const stats = calculateStats(data, isArabic);
    const statsData = stats.map(s => ({
      [isArabic ? 'المقياس' : 'Metric']: s.metric,
      [isArabic ? 'القيمة' : 'Value']: s.value,
    }));
    
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    statsSheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(
      wb, 
      statsSheet, 
      isArabic ? 'الإحصائيات' : 'Statistics'
    );
  }

  // Generate and download file
  XLSX.writeFile(wb, filename);
};

// Export servers with professional formatting
export const exportServersExcel = (
  servers: any[],
  networks: any[],
  t: (key: string) => string,
  isArabic: boolean
): void => {
  const columns: ExportColumn[] = [
    { key: 'name', label: t('servers.name'), width: 20 },
    { key: 'ip_address', label: t('servers.ip'), width: 15 },
    { key: 'operating_system', label: t('servers.os'), width: 20 },
    { key: 'environment', label: t('servers.environment'), width: 12 },
    { key: 'status', label: t('servers.status'), width: 10 },
    { key: 'beneficiary_department', label: t('servers.beneficiary'), width: 18 },
    { key: 'is_backed_up_by_veeam', label: t('servers.isBackedUp'), width: 12 },
    { key: 'backup_frequency', label: t('servers.backupFrequency'), width: 12 },
    { key: 'notes', label: t('servers.notes'), width: 30 },
  ];

  // Transform data
  const exportData = servers.map(s => ({
    ...s,
    environment: t(`env.${s.environment}`) || s.environment,
    status: s.status === 'active' ? t('status.active') : t('status.inactive'),
    is_backed_up_by_veeam: s.is_backed_up_by_veeam ? 
      (isArabic ? 'نعم' : 'Yes') : 
      (isArabic ? 'لا' : 'No'),
    network_name: networks.find(n => n.id === s.network_id)?.name || '',
  }));

  exportProfessionalExcel({
    data: exportData,
    filename: `servers-report-${Date.now()}.xlsx`,
    sheetName: t('nav.servers'),
    columns,
    includeStats: true,
    isArabic,
  });
};

// Export tasks with professional formatting
export const exportTasksExcel = (
  tasks: any[],
  profiles: any[],
  t: (key: string) => string,
  isArabic: boolean
): void => {
  const columns: ExportColumn[] = [
    { key: 'title', label: t('tasks.title'), width: 30 },
    { key: 'description', label: t('tasks.description'), width: 40 },
    { key: 'assignee_name', label: t('tasks.assignee'), width: 20 },
    { key: 'priority', label: t('tasks.priority'), width: 12 },
    { key: 'status_label', label: t('tasks.status'), width: 12 },
    { key: 'due_date', label: t('tasks.dueDate'), width: 12 },
    { key: 'frequency', label: t('tasks.frequency'), width: 12 },
  ];

  // Transform data
  const exportData = tasks.map(task => {
    const assignee = profiles.find(p => p.id === task.assigned_to);
    const status = task.task_status || task.status || 'pending';
    
    return {
      ...task,
      assignee_name: assignee?.full_name || '',
      status_label: t(`tasks.${status}`) || status,
      frequency: task.frequency === 'once' ? 
        (isArabic ? 'مرة واحدة' : 'Once') : 
        t(`tasks.${task.frequency}`),
    };
  });

  exportProfessionalExcel({
    data: exportData,
    filename: `tasks-report-${Date.now()}.xlsx`,
    sheetName: t('nav.tasks'),
    columns,
    includeStats: true,
    isArabic,
  });
};

// Export licenses with professional formatting
export const exportLicensesExcel = (
  licenses: any[],
  domains: any[],
  t: (key: string) => string,
  isArabic: boolean
): void => {
  const columns: ExportColumn[] = [
    { key: 'name', label: t('licenses.name'), width: 25 },
    { key: 'vendor', label: t('licenses.vendor'), width: 20 },
    { key: 'license_key', label: t('licenses.key'), width: 25 },
    { key: 'purchase_date', label: t('licenses.purchaseDate'), width: 12 },
    { key: 'expiry_date', label: t('licenses.expiryDate'), width: 12 },
    { key: 'cost', label: t('licenses.cost'), width: 10 },
    { key: 'quantity', label: t('licenses.quantity'), width: 10 },
    { key: 'domain_name', label: t('licenses.domain'), width: 15 },
  ];

  // Transform data
  const exportData = licenses.map(l => ({
    ...l,
    domain_name: domains.find(d => d.id === l.domain_id)?.name || '',
  }));

  exportProfessionalExcel({
    data: exportData,
    filename: `licenses-report-${Date.now()}.xlsx`,
    sheetName: t('nav.licenses'),
    columns,
    includeStats: true,
    isArabic,
  });
};
