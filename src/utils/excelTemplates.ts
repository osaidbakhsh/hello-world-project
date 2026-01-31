import * as XLSX from 'xlsx';

// ==================== Server Import Template V2 ====================
export const downloadServerTemplate = () => {
  const templateData = [
    {
      'server_id': '',  // Empty for new, fill for update
      'name': 'Server-01',
      'ip_address': '192.168.1.10',
      'operating_system': 'Windows Server 2022',
      'environment': 'production',
      'status': 'active',
      'owner': 'Ahmed',
      'responsible_user': 'Mohammed',
      'network_name': 'Main Network',
      'cpu': '4 vCPU',
      'ram': '16 GB',
      'disk_space': '500 GB',
      'notes': 'Main Database Server',
    },
    {
      'server_id': '',
      'name': 'Server-02',
      'ip_address': '192.168.1.11',
      'operating_system': 'Ubuntu 22.04 LTS',
      'environment': 'testing',
      'status': 'active',
      'owner': 'Sara',
      'responsible_user': 'Khalid',
      'network_name': 'Test Network',
      'cpu': '2 vCPU',
      'ram': '8 GB',
      'disk_space': '200 GB',
      'notes': 'Web Application Server',
    },
  ];

  const lookupData = [
    { 'Field': 'environment', 'Allowed Values': 'production, testing, development, staging' },
    { 'Field': 'status', 'Allowed Values': 'active, inactive, maintenance' },
    { 'Field': 'operating_system', 'Allowed Values': 'Windows Server 2022, Windows Server 2019, Ubuntu 22.04 LTS, Ubuntu 20.04 LTS, CentOS, Red Hat Enterprise, Debian' },
  ];

  const instructionsData = [
    { 'Column': 'server_id', 'Description': 'Leave empty for new servers. Fill with existing ID to update.', 'Required': 'No' },
    { 'Column': 'name', 'Description': 'Server name (unique identifier)', 'Required': 'Yes' },
    { 'Column': 'ip_address', 'Description': 'IP Address (used with name for matching)', 'Required': 'Yes' },
    { 'Column': 'operating_system', 'Description': 'Operating System (see Lookup sheet)', 'Required': 'No' },
    { 'Column': 'environment', 'Description': 'Environment type (see Lookup sheet)', 'Required': 'No' },
    { 'Column': 'status', 'Description': 'Server status (see Lookup sheet)', 'Required': 'No' },
    { 'Column': 'owner', 'Description': 'Server owner/department', 'Required': 'No' },
    { 'Column': 'responsible_user', 'Description': 'Responsible administrator', 'Required': 'No' },
    { 'Column': 'network_name', 'Description': 'Network name for auto-linking', 'Required': 'No' },
    { 'Column': 'cpu', 'Description': 'CPU specifications (e.g., 4 vCPU)', 'Required': 'No' },
    { 'Column': 'ram', 'Description': 'RAM specifications (e.g., 16 GB)', 'Required': 'No' },
    { 'Column': 'disk_space', 'Description': 'Disk space (e.g., 500 GB)', 'Required': 'No' },
    { 'Column': 'notes', 'Description': 'Additional notes', 'Required': 'No' },
  ];

  const importNotes = [
    { 'Note': '1. Smart Import: If server_id is provided, that record will be updated.' },
    { 'Note': '2. If server_id is empty, system matches by name + ip_address to update existing or create new.' },
    { 'Note': '3. Duplicate prevention: Same name + IP will update instead of creating duplicate.' },
    { 'Note': '4. Network linking: Use network_name to auto-link servers to networks.' },
    { 'Note': '5. Case-insensitive: Environment and status values are normalized to lowercase.' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(lookupData);
  const ws3 = XLSX.utils.json_to_sheet(instructionsData);
  const ws4 = XLSX.utils.json_to_sheet(importNotes);
  
  ws1['!cols'] = [
    { wch: 36 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 30 },
  ];
  
  ws2['!cols'] = [{ wch: 18 }, { wch: 80 }];
  ws3['!cols'] = [{ wch: 18 }, { wch: 55 }, { wch: 10 }];
  ws4['!cols'] = [{ wch: 80 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Servers');
  XLSX.utils.book_append_sheet(wb, ws2, 'Lookup Values');
  XLSX.utils.book_append_sheet(wb, ws3, 'Instructions');
  XLSX.utils.book_append_sheet(wb, ws4, 'Import Notes');
  XLSX.writeFile(wb, 'server-import-template.xlsx');
};

// ==================== License Import Template V2 ====================
export const downloadLicenseTemplate = () => {
  const templateData = [
    {
      'license_id': '',
      'name': 'Microsoft Office 365',
      'vendor': 'Microsoft',
      'license_key': 'XXXXX-XXXXX-XXXXX-XXXXX',
      'purchase_date': '2024-01-01',
      'expiry_date': '2025-01-01',
      'domain_name': 'Main Domain',
      'assigned_to': 'Server-01',
      'cost': 299.99,
      'quantity': 50,
      'notes': 'Enterprise license for 50 users',
    },
    {
      'license_id': '',
      'name': 'Windows Server 2022',
      'vendor': 'Microsoft',
      'license_key': 'YYYYY-YYYYY-YYYYY-YYYYY',
      'purchase_date': '2024-01-01',
      'expiry_date': '2027-01-01',
      'domain_name': 'Main Domain',
      'assigned_to': 'Server-02',
      'cost': 999.99,
      'quantity': 1,
      'notes': 'Datacenter edition',
    },
  ];

  const lookupData = [
    { 'Field': 'domain_name', 'Description': 'Enter domain name to auto-link. System will match by name.' },
    { 'Field': 'assigned_to', 'Description': 'Server name or user name for assignment.' },
    { 'Field': 'cost', 'Description': 'Numeric value only (no currency symbol).' },
    { 'Field': 'quantity', 'Description': 'Number of licenses (default: 1).' },
  ];

  const instructionsData = [
    { 'Column': 'license_id', 'Description': 'Leave empty for new. Fill to update existing license.', 'Required': 'No' },
    { 'Column': 'name', 'Description': 'License/Product name', 'Required': 'Yes' },
    { 'Column': 'vendor', 'Description': 'Vendor/Manufacturer name', 'Required': 'No' },
    { 'Column': 'license_key', 'Description': 'License key or serial number', 'Required': 'No' },
    { 'Column': 'purchase_date', 'Description': 'Purchase date (YYYY-MM-DD)', 'Required': 'No' },
    { 'Column': 'expiry_date', 'Description': 'Expiry date (YYYY-MM-DD)', 'Required': 'Yes' },
    { 'Column': 'domain_name', 'Description': 'Domain name for auto-linking', 'Required': 'No' },
    { 'Column': 'assigned_to', 'Description': 'Assigned server or user', 'Required': 'No' },
    { 'Column': 'cost', 'Description': 'License cost (number only)', 'Required': 'No' },
    { 'Column': 'quantity', 'Description': 'Number of licenses', 'Required': 'No' },
    { 'Column': 'notes', 'Description': 'Additional notes', 'Required': 'No' },
  ];

  const importNotes = [
    { 'Note': '1. Smart Import: If license_id is provided, that record will be updated.' },
    { 'Note': '2. If license_id is empty, system matches by name + license_key to update or create.' },
    { 'Note': '3. Domain linking: Use domain_name to auto-link licenses to domains.' },
    { 'Note': '4. Date format: Use YYYY-MM-DD format for all dates.' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(lookupData);
  const ws3 = XLSX.utils.json_to_sheet(instructionsData);
  const ws4 = XLSX.utils.json_to_sheet(importNotes);

  ws1['!cols'] = [
    { wch: 36 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 30 },
  ];

  ws2['!cols'] = [{ wch: 15 }, { wch: 60 }];
  ws3['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Licenses');
  XLSX.utils.book_append_sheet(wb, ws2, 'Lookup Values');
  XLSX.utils.book_append_sheet(wb, ws3, 'Instructions');
  XLSX.utils.book_append_sheet(wb, ws4, 'Import Notes');
  XLSX.writeFile(wb, 'license-import-template.xlsx');
};

// ==================== Employee Report Template ====================
export const downloadEmployeeReportTemplate = () => {
  const weeklyReportData = [
    {
      'Date': new Date().toISOString().split('T')[0],
      'Task': 'Server Maintenance',
      'Server': 'Server-01',
      'Status': 'Completed',
      'Hours': 2,
      'Notes': 'Updated Windows patches',
    },
    {
      'Date': new Date().toISOString().split('T')[0],
      'Task': 'Backup Verification',
      'Server': 'Server-02',
      'Status': 'In Progress',
      'Hours': 1.5,
      'Notes': 'Checking backup integrity',
    },
    {
      'Date': new Date().toISOString().split('T')[0],
      'Task': 'Network Troubleshooting',
      'Server': '',
      'Status': 'Pending',
      'Hours': 0,
      'Notes': 'Scheduled for tomorrow',
    },
  ];

  const summaryData = [
    { 'Metric': 'Total Tasks', 'Value': 3 },
    { 'Metric': 'Completed Tasks', 'Value': 1 },
    { 'Metric': 'In Progress Tasks', 'Value': 1 },
    { 'Metric': 'Pending Tasks', 'Value': 1 },
    { 'Metric': 'Total Hours', 'Value': 3.5 },
    { 'Metric': 'Week Number', 'Value': getWeekNumber(new Date()) },
  ];

  const goalsData = [
    { 'Goal': 'Complete all server updates', 'Priority': 'High', 'Status': 'In Progress', 'Progress %': 60 },
    { 'Goal': 'Document network topology', 'Priority': 'Medium', 'Status': 'Pending', 'Progress %': 0 },
    { 'Goal': 'Train on new monitoring tool', 'Priority': 'Low', 'Status': 'Completed', 'Progress %': 100 },
  ];

  const instructionsData = [
    { 'Column': 'Date', 'Description': 'Task date (YYYY-MM-DD)', 'Required': 'Yes' },
    { 'Column': 'Task', 'Description': 'Task name or description', 'Required': 'Yes' },
    { 'Column': 'Server', 'Description': 'Related server (if any)', 'Required': 'No' },
    { 'Column': 'Status', 'Description': 'Completed, In Progress, Pending', 'Required': 'Yes' },
    { 'Column': 'Hours', 'Description': 'Hours spent on task', 'Required': 'No' },
    { 'Column': 'Notes', 'Description': 'Additional notes', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(weeklyReportData);
  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  const ws3 = XLSX.utils.json_to_sheet(goalsData);
  const ws4 = XLSX.utils.json_to_sheet(instructionsData);

  ws1['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 35 }];
  ws2['!cols'] = [{ wch: 20 }, { wch: 15 }];
  ws3['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  ws4['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Weekly Tasks');
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
  XLSX.utils.book_append_sheet(wb, ws3, 'Goals');
  XLSX.utils.book_append_sheet(wb, ws4, 'Instructions');
  XLSX.writeFile(wb, 'employee-report-template.xlsx');
};

// ==================== Network Template ====================
export const downloadNetworkTemplate = () => {
  const templateData = [
    {
      'Name': 'Main Network',
      'Domain': 'company.local',
      'IP Range': '192.168.1.0/24',
      'Description': 'Production network for all main servers',
    },
    {
      'Name': 'Test Network',
      'Domain': 'test.company.local',
      'IP Range': '192.168.2.0/24',
      'Description': 'Testing and development environment',
    },
  ];

  const instructionsData = [
    { 'Column': 'Name', 'Description': 'Network name', 'Example': 'Main Network', 'Required': 'Yes' },
    { 'Column': 'Domain', 'Description': 'Domain name', 'Example': 'company.local', 'Required': 'Yes' },
    { 'Column': 'IP Range', 'Description': 'IP address range', 'Example': '192.168.1.0/24', 'Required': 'Yes' },
    { 'Column': 'Description', 'Description': 'Network description', 'Example': 'Production network', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(instructionsData);

  ws1['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 40 }];
  ws2['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Networks');
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  XLSX.writeFile(wb, 'network-import-template.xlsx');
};

// ==================== Employee Template V2 ====================
export const downloadEmployeeTemplate = () => {
  const templateData = [
    {
      'profile_id': '',
      'full_name': 'Ahmed Mohammed',
      'email': 'ahmed@company.com',
      'phone': '+966501234567',
      'position': 'System Administrator',
      'department': 'IT',
      'skills': 'Windows Server, Linux, VMware, Networking',
      'certifications': 'MCSA, CCNA, VCP',
    },
    {
      'profile_id': '',
      'full_name': 'Sara Ali',
      'email': 'sara@company.com',
      'phone': '+966509876543',
      'position': 'Network Engineer',
      'department': 'Network',
      'skills': 'Cisco, Juniper, Firewall, SD-WAN',
      'certifications': 'CCNP, JNCIA',
    },
  ];

  const lookupData = [
    { 'Field': 'department', 'Allowed Values': 'IT, Network, Security, DevOps, Support, Development' },
    { 'Field': 'skills', 'Description': 'Comma-separated list of skills' },
    { 'Field': 'certifications', 'Description': 'Comma-separated list of certifications' },
  ];

  const instructionsData = [
    { 'Column': 'profile_id', 'Description': 'Leave empty for reference. Employees are created via system.', 'Required': 'No' },
    { 'Column': 'full_name', 'Description': 'Employee full name', 'Required': 'Yes' },
    { 'Column': 'email', 'Description': 'Email address', 'Required': 'Yes' },
    { 'Column': 'phone', 'Description': 'Phone number with country code', 'Required': 'No' },
    { 'Column': 'position', 'Description': 'Job title/position', 'Required': 'No' },
    { 'Column': 'department', 'Description': 'Department name (see Lookup)', 'Required': 'No' },
    { 'Column': 'skills', 'Description': 'Skills (comma-separated)', 'Required': 'No' },
    { 'Column': 'certifications', 'Description': 'Certifications (comma-separated)', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(lookupData);
  const ws3 = XLSX.utils.json_to_sheet(instructionsData);

  ws1['!cols'] = [
    { wch: 36 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
    { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 25 },
  ];

  ws2['!cols'] = [{ wch: 15 }, { wch: 60 }];
  ws3['!cols'] = [{ wch: 15 }, { wch: 55 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Employees');
  XLSX.utils.book_append_sheet(wb, ws2, 'Lookup Values');
  XLSX.utils.book_append_sheet(wb, ws3, 'Instructions');
  XLSX.writeFile(wb, 'employee-import-template.xlsx');
};

// ==================== Task Template V2 - UNIFIED with export ====================
export const downloadTaskTemplate = () => {
  // Use same column names as professionalExport.ts for round-trip compatibility
  const templateData = [
    {
      'task_id': '',
      'title': 'Server Maintenance',
      'description': 'Monthly maintenance for production servers',
      'assignee_email': 'ahmed@company.com',
      'task_status': 'draft',
      'priority': 'high',
      'frequency': 'monthly',
      'due_date': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      'task_id': '',
      'title': 'Backup Verification',
      'description': 'Weekly backup verification and testing',
      'assignee_email': 'sara@company.com',
      'task_status': 'assigned',
      'priority': 'medium',
      'frequency': 'weekly',
      'due_date': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ];

  const lookupData = [
    { 'Field': 'priority', 'Allowed Values': 'low, medium, high' },
    { 'Field': 'frequency', 'Allowed Values': 'once, daily, weekly, monthly' },
    { 'Field': 'task_status', 'Allowed Values': 'draft, assigned, in_progress, blocked, in_review, done' },
  ];

  const instructionsData = [
    { 'Column': 'task_id', 'Description': 'Leave empty for new. Fill with ID from export to update existing.', 'Required': 'No' },
    { 'Column': 'title', 'Description': 'Task title', 'Required': 'Yes' },
    { 'Column': 'description', 'Description': 'Task description', 'Required': 'No' },
    { 'Column': 'assignee_email', 'Description': 'Assignee email (for auto-linking to profile)', 'Required': 'No' },
    { 'Column': 'task_status', 'Description': 'Kanban status (see Lookup)', 'Required': 'No' },
    { 'Column': 'priority', 'Description': 'Task priority (see Lookup)', 'Required': 'No' },
    { 'Column': 'frequency', 'Description': 'Task frequency (see Lookup)', 'Required': 'No' },
    { 'Column': 'due_date', 'Description': 'Due date (YYYY-MM-DD)', 'Required': 'No' },
  ];

  const importNotes = [
    { 'Note': '1. Export/Import Compatibility: This template matches the export format exactly.' },
    { 'Note': '2. You can export tasks, modify them, and re-import to update.' },
    { 'Note': '3. If task_id is provided, that record will be updated.' },
    { 'Note': '4. If task_id is empty, system matches by title to update or create new.' },
    { 'Note': '5. Assignee linking: Use email address to auto-link to employee profile.' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(lookupData);
  const ws3 = XLSX.utils.json_to_sheet(instructionsData);
  const ws4 = XLSX.utils.json_to_sheet(importNotes);

  ws1['!cols'] = [
    { wch: 36 }, { wch: 25 }, { wch: 40 }, { wch: 25 },
    { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];

  ws2['!cols'] = [{ wch: 12 }, { wch: 60 }];
  ws3['!cols'] = [{ wch: 18 }, { wch: 60 }, { wch: 10 }];
  ws4['!cols'] = [{ wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Tasks');
  XLSX.utils.book_append_sheet(wb, ws2, 'Lookup Values');
  XLSX.utils.book_append_sheet(wb, ws3, 'Instructions');
  XLSX.utils.book_append_sheet(wb, ws4, 'Import Notes');
  XLSX.writeFile(wb, 'task-import-template.xlsx');
};

// ==================== Vacation Template ====================
export const downloadVacationTemplate = () => {
  const templateData = [
    {
      'employee_email': 'ahmed@company.com',
      'vacation_type': 'annual',
      'start_date': new Date().toISOString().split('T')[0],
      'end_date': new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'notes': 'Annual family vacation',
    },
    {
      'employee_email': 'sara@company.com',
      'vacation_type': 'sick',
      'start_date': new Date().toISOString().split('T')[0],
      'end_date': new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'notes': 'Medical appointment',
    },
  ];

  const lookupData = [
    { 'Field': 'vacation_type', 'Allowed Values': 'annual, sick, emergency, unpaid' },
    { 'Field': 'status', 'Description': 'Vacation status (set by system): pending, approved, rejected' },
  ];

  const instructionsData = [
    { 'Column': 'employee_email', 'Description': 'Employee email for auto-linking', 'Required': 'Yes' },
    { 'Column': 'vacation_type', 'Description': 'Type of vacation (see Lookup)', 'Required': 'Yes' },
    { 'Column': 'start_date', 'Description': 'Start date (YYYY-MM-DD)', 'Required': 'Yes' },
    { 'Column': 'end_date', 'Description': 'End date (YYYY-MM-DD)', 'Required': 'Yes' },
    { 'Column': 'notes', 'Description': 'Additional notes', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(lookupData);
  const ws3 = XLSX.utils.json_to_sheet(instructionsData);

  ws1['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  ws2['!cols'] = [{ wch: 15 }, { wch: 60 }];
  ws3['!cols'] = [{ wch: 18 }, { wch: 45 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Vacations');
  XLSX.utils.book_append_sheet(wb, ws2, 'Lookup Values');
  XLSX.utils.book_append_sheet(wb, ws3, 'Instructions');
  XLSX.writeFile(wb, 'vacation-import-template.xlsx');
};

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
