import * as XLSX from 'xlsx';

// Server Import Template
export const downloadServerTemplate = () => {
  const templateData = [
    {
      Name: 'Server-01',
      IP: '192.168.1.10',
      OS: 'Windows Server',
      Version: '2022',
      Environment: 'production',
      Owner: 'Ahmed',
      Responsible: 'Mohammed',
      Description: 'Main Database Server',
      Status: 'active',
      Network: 'main-network',
      'Disk_C_Total_GB': 500,
      'Disk_C_Used_GB': 250,
      'Disk_D_Total_GB': 1000,
      'Disk_D_Used_GB': 400,
    },
    {
      Name: 'Server-02',
      IP: '192.168.1.11',
      OS: 'Ubuntu Server',
      Version: '22.04 LTS',
      Environment: 'testing',
      Owner: 'Sara',
      Responsible: 'Khalid',
      Description: 'Web Application Server',
      Status: 'active',
      Network: 'test-network',
      'Disk_C_Total_GB': 200,
      'Disk_C_Used_GB': 80,
      'Disk_D_Total_GB': 0,
      'Disk_D_Used_GB': 0,
    },
  ];

  // Create instructions sheet
  const instructionsData = [
    { 'Column': 'Name', 'Description': 'Server name (required)', 'Example': 'Server-01', 'Required': 'Yes' },
    { 'Column': 'IP', 'Description': 'IP Address (required)', 'Example': '192.168.1.10', 'Required': 'Yes' },
    { 'Column': 'OS', 'Description': 'Operating System', 'Example': 'Windows Server, Ubuntu Server, CentOS, Red Hat, Debian', 'Required': 'No' },
    { 'Column': 'Version', 'Description': 'OS Version', 'Example': '2022, 2019, 22.04 LTS', 'Required': 'No' },
    { 'Column': 'Environment', 'Description': 'Server environment', 'Example': 'production, testing, development, staging', 'Required': 'No' },
    { 'Column': 'Owner', 'Description': 'Server owner name', 'Example': 'Ahmed Mohammed', 'Required': 'No' },
    { 'Column': 'Responsible', 'Description': 'Responsible person name', 'Example': 'Khalid Ali', 'Required': 'No' },
    { 'Column': 'Description', 'Description': 'Server description', 'Example': 'Main Database Server', 'Required': 'No' },
    { 'Column': 'Status', 'Description': 'Server status', 'Example': 'active, inactive, maintenance', 'Required': 'No' },
    { 'Column': 'Network', 'Description': 'Network name', 'Example': 'main-network', 'Required': 'No' },
    { 'Column': 'Disk_C_Total_GB', 'Description': 'C: drive total space in GB', 'Example': '500', 'Required': 'No' },
    { 'Column': 'Disk_C_Used_GB', 'Description': 'C: drive used space in GB', 'Example': '250', 'Required': 'No' },
    { 'Column': 'Disk_D_Total_GB', 'Description': 'D: drive total space in GB', 'Example': '1000', 'Required': 'No' },
    { 'Column': 'Disk_D_Used_GB', 'Description': 'D: drive used space in GB', 'Example': '400', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(instructionsData);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  ];
  
  ws2['!cols'] = [
    { wch: 18 }, { wch: 35 }, { wch: 40 }, { wch: 10 },
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Servers');
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  XLSX.writeFile(wb, 'server-import-template.xlsx');
};

// Employee Report Template
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

// License Template
export const downloadLicenseTemplate = () => {
  const templateData = [
    {
      'Name': 'Microsoft Office 365',
      'Product': 'Office Suite',
      'License Key': 'XXXXX-XXXXX-XXXXX-XXXXX',
      'Start Date': '2024-01-01',
      'Expiry Date': '2025-01-01',
      'Server': 'Server-01',
      'Cost': 299.99,
      'Currency': 'USD',
      'Vendor': 'Microsoft',
      'Notes': 'Enterprise license for 50 users',
    },
    {
      'Name': 'Windows Server 2022',
      'Product': 'Operating System',
      'License Key': 'YYYYY-YYYYY-YYYYY-YYYYY',
      'Start Date': '2024-01-01',
      'Expiry Date': '2027-01-01',
      'Server': 'Server-02',
      'Cost': 999.99,
      'Currency': 'USD',
      'Vendor': 'Microsoft',
      'Notes': 'Datacenter edition',
    },
  ];

  const instructionsData = [
    { 'Column': 'Name', 'Description': 'License name', 'Example': 'Microsoft Office 365', 'Required': 'Yes' },
    { 'Column': 'Product', 'Description': 'Product name', 'Example': 'Office Suite', 'Required': 'Yes' },
    { 'Column': 'License Key', 'Description': 'License key/serial', 'Example': 'XXXXX-XXXXX-XXXXX', 'Required': 'Yes' },
    { 'Column': 'Start Date', 'Description': 'License start date', 'Example': '2024-01-01', 'Required': 'Yes' },
    { 'Column': 'Expiry Date', 'Description': 'License expiry date', 'Example': '2025-01-01', 'Required': 'Yes' },
    { 'Column': 'Server', 'Description': 'Assigned server name', 'Example': 'Server-01', 'Required': 'No' },
    { 'Column': 'Cost', 'Description': 'License cost', 'Example': '299.99', 'Required': 'No' },
    { 'Column': 'Currency', 'Description': 'Currency code', 'Example': 'USD, SAR, EUR', 'Required': 'No' },
    { 'Column': 'Vendor', 'Description': 'License vendor', 'Example': 'Microsoft', 'Required': 'No' },
    { 'Column': 'Notes', 'Description': 'Additional notes', 'Example': 'Enterprise license', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(instructionsData);

  ws1['!cols'] = [
    { wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 },
  ];

  ws2['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Licenses');
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  XLSX.writeFile(wb, 'license-import-template.xlsx');
};

// Network Template
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

// Employee Template
export const downloadEmployeeTemplate = () => {
  const templateData = [
    {
      'Name': 'Ahmed Mohammed',
      'Email': 'ahmed@company.com',
      'Phone': '+966501234567',
      'Position': 'System Administrator',
      'Department': 'System Admin',
      'Hire Date': '2023-01-15',
      'Status': 'active',
      'Skills': 'Windows Server, Linux, VMware, Networking',
      'Certifications': 'MCSA, CCNA, VCP',
      'Yearly Goals': 'Complete VCP-DCV certification, Implement new backup solution',
    },
    {
      'Name': 'Sara Ali',
      'Email': 'sara@company.com',
      'Phone': '+966509876543',
      'Position': 'Network Engineer',
      'Department': 'Network',
      'Hire Date': '2022-06-01',
      'Status': 'active',
      'Skills': 'Cisco, Juniper, Firewall, SD-WAN',
      'Certifications': 'CCNP, JNCIA',
      'Yearly Goals': 'Achieve CCIE certification, Upgrade core network switches',
    },
  ];

  const instructionsData = [
    { 'Column': 'Name', 'Description': 'Employee full name', 'Example': 'Ahmed Mohammed', 'Required': 'Yes' },
    { 'Column': 'Email', 'Description': 'Email address', 'Example': 'ahmed@company.com', 'Required': 'Yes' },
    { 'Column': 'Phone', 'Description': 'Phone number', 'Example': '+966501234567', 'Required': 'No' },
    { 'Column': 'Position', 'Description': 'Job title', 'Example': 'System Administrator', 'Required': 'No' },
    { 'Column': 'Department', 'Description': 'Department', 'Example': 'IT, Network, System Admin, Security, DevOps, Support', 'Required': 'No' },
    { 'Column': 'Hire Date', 'Description': 'Hire date (YYYY-MM-DD)', 'Example': '2023-01-15', 'Required': 'No' },
    { 'Column': 'Status', 'Description': 'Employee status', 'Example': 'active, inactive', 'Required': 'No' },
    { 'Column': 'Skills', 'Description': 'Technical skills (comma separated)', 'Example': 'Windows Server, Linux, VMware', 'Required': 'No' },
    { 'Column': 'Certifications', 'Description': 'Certifications (comma separated)', 'Example': 'MCSA, CCNA, VCP', 'Required': 'No' },
    { 'Column': 'Yearly Goals', 'Description': 'Yearly goals (comma separated)', 'Example': 'Complete certification, Lead project', 'Required': 'No' },
  ];

  const ws1 = XLSX.utils.json_to_sheet(templateData);
  const ws2 = XLSX.utils.json_to_sheet(instructionsData);

  ws1['!cols'] = [
    { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
    { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 25 }, { wch: 50 },
  ];

  ws2['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 50 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Employees');
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  XLSX.writeFile(wb, 'employee-import-template.xlsx');
};

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
