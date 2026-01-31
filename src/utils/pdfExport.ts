import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface VacationExportData {
  employeeName: string;
  employeePosition: string;
  vacationType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: string;
  notes: string;
}

interface VacationSummary {
  totalDays: number;
  annualDays: number;
  sickDays: number;
  emergencyDays: number;
  unpaidDays: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export const calculateVacationSummary = (vacations: any[]): VacationSummary => {
  return {
    totalDays: vacations.reduce((sum, v) => sum + (v.days_count || 0), 0),
    annualDays: vacations.filter(v => v.vacation_type === 'annual').reduce((sum, v) => sum + (v.days_count || 0), 0),
    sickDays: vacations.filter(v => v.vacation_type === 'sick').reduce((sum, v) => sum + (v.days_count || 0), 0),
    emergencyDays: vacations.filter(v => v.vacation_type === 'emergency').reduce((sum, v) => sum + (v.days_count || 0), 0),
    unpaidDays: vacations.filter(v => v.vacation_type === 'unpaid').reduce((sum, v) => sum + (v.days_count || 0), 0),
    approvedCount: vacations.filter(v => v.status === 'approved').length,
    pendingCount: vacations.filter(v => v.status === 'pending').length,
    rejectedCount: vacations.filter(v => v.status === 'rejected').length,
  };
};

export const exportVacationsPDF = (
  vacations: VacationExportData[],
  employeeName: string,
  summary: VacationSummary,
  isArabic: boolean = true
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add font support for Arabic (basic)
  doc.setFont('helvetica');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  const title = isArabic ? 'تقرير الإجازات' : 'Vacation Report';
  doc.text(title, pageWidth / 2, 25, { align: 'center' });

  // Employee Name
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const employeeLabel = isArabic ? `الموظف: ${employeeName}` : `Employee: ${employeeName}`;
  doc.text(employeeLabel, pageWidth / 2, 35, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  const dateLabel = isArabic ? `تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}` : `Report Date: ${new Date().toLocaleDateString()}`;
  doc.text(dateLabel, pageWidth / 2, 42, { align: 'center' });

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, 48, pageWidth - margin * 2, 35, 3, 3, 'F');

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const summaryTitle = isArabic ? 'ملخص الإجازات' : 'Vacation Summary';
  doc.text(summaryTitle, margin + 5, 56);

  doc.setFontSize(10);
  const summaryItems = [
    { label: isArabic ? 'إجمالي الأيام:' : 'Total Days:', value: summary.totalDays },
    { label: isArabic ? 'سنوية:' : 'Annual:', value: summary.annualDays },
    { label: isArabic ? 'مرضية:' : 'Sick:', value: summary.sickDays },
    { label: isArabic ? 'طارئة:' : 'Emergency:', value: summary.emergencyDays },
    { label: isArabic ? 'بدون راتب:' : 'Unpaid:', value: summary.unpaidDays },
  ];

  let xPos = margin + 5;
  summaryItems.forEach((item, index) => {
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, xPos, 65);
    doc.setTextColor(0, 0, 0);
    doc.text(String(item.value), xPos + doc.getTextWidth(item.label) + 2, 65);
    xPos += 35;
  });

  // Status summary
  const statusItems = [
    { label: isArabic ? 'موافق عليها:' : 'Approved:', value: summary.approvedCount, color: [46, 204, 113] },
    { label: isArabic ? 'معلقة:' : 'Pending:', value: summary.pendingCount, color: [241, 196, 15] },
    { label: isArabic ? 'مرفوضة:' : 'Rejected:', value: summary.rejectedCount, color: [231, 76, 60] },
  ];

  xPos = margin + 5;
  statusItems.forEach((item) => {
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, xPos, 75);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(String(item.value), xPos + doc.getTextWidth(item.label) + 2, 75);
    xPos += 45;
  });

  // Vacations Table
  const tableHeaders = isArabic 
    ? [['النوع', 'تاريخ البداية', 'تاريخ النهاية', 'الأيام', 'الحالة', 'ملاحظات']]
    : [['Type', 'Start Date', 'End Date', 'Days', 'Status', 'Notes']];

  const tableData = vacations.map((v) => [
    v.vacationType,
    v.startDate,
    v.endDate,
    String(v.daysCount),
    v.status,
    v.notes.substring(0, 30) + (v.notes.length > 30 ? '...' : ''),
  ]);

  doc.autoTable({
    head: tableHeaders,
    body: tableData,
    startY: 90,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: isArabic ? 'right' : 'left',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 28 },
      2: { cellWidth: 28 },
      3: { cellWidth: 15 },
      4: { cellWidth: 22 },
      5: { cellWidth: 'auto' },
    },
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY || 90;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footer = isArabic ? 'تم إنشاء التقرير بواسطة نظام إدارة البنية التحتية' : 'Generated by IT Infrastructure Management System';
  doc.text(footer, pageWidth / 2, finalY + 15, { align: 'center' });

  // Save
  const filename = `vacations-${employeeName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(filename);
};
