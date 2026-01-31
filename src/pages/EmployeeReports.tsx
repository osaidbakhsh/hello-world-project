import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, FileSpreadsheet, Upload, Download, Trash2, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface EmployeeReport {
  id: string;
  employeeId: string;
  employeeName: string;
  fileName: string;
  reportDate: string;
  uploadDate: string;
  notes: string;
  data: any[];
}

const useEmployeeReports = () => {
  const [reports, setReports] = useState<EmployeeReport[]>(() => {
    const saved = localStorage.getItem('it-manager-employee-reports');
    return saved ? JSON.parse(saved) : [];
  });

  const saveReports = (newReports: EmployeeReport[]) => {
    setReports(newReports);
    localStorage.setItem('it-manager-employee-reports', JSON.stringify(newReports));
  };

  return [reports, saveReports] as const;
};

const EmployeeReports: React.FC = () => {
  const { t, dir } = useLanguage();
  const [employees] = useEmployees();
  const [reports, setReports] = useEmployeeReports();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    reportDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmployee = filterEmployee === 'all' || report.employeeId === filterEmployee;
    return matchesSearch && matchesEmployee;
  });

  // Sort by upload date (newest first)
  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setPreviewData(jsonData.slice(0, 5)); // Preview first 5 rows
      } catch (error) {
        toast({
          title: t('common.error'),
          description: 'Failed to read Excel file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = () => {
    if (!formData.employeeId || !selectedFile) {
      toast({
        title: t('common.error'),
        description: 'Please select employee and file',
        variant: 'destructive',
      });
      return;
    }

    const employee = employees.find((e) => e.id === formData.employeeId);
    if (!employee) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newReport: EmployeeReport = {
          id: crypto.randomUUID(),
          employeeId: formData.employeeId,
          employeeName: employee.name,
          fileName: selectedFile.name,
          reportDate: formData.reportDate,
          uploadDate: new Date().toISOString(),
          notes: formData.notes,
          data: jsonData,
        };

        setReports([...reports, newReport]);
        toast({ title: t('common.success'), description: 'Report uploaded' });
        resetForm();
        setIsDialogOpen(false);
      } catch (error) {
        toast({
          title: t('common.error'),
          description: 'Failed to process file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDownload = (report: EmployeeReport) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(report.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${report.employeeName}_${report.reportDate}.xlsx`);
      toast({ title: t('common.success'), description: 'Report downloaded' });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (id: string) => {
    setReports(reports.filter((r) => r.id !== id));
    toast({ title: t('common.success'), description: 'Report deleted' });
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      reportDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setSelectedFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('employeeReports.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {reports.length} {t('employeeReports.archive')}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 me-2" />
              {t('employeeReports.upload')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('employeeReports.upload')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('vacations.employee')} *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('vacations.employee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('employeeReports.date')}</Label>
                <Input
                  type="date"
                  value={formData.reportDate}
                  onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('employeeReports.file')} * (Excel)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </div>
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview (first 5 rows)</Label>
                  <div className="max-h-40 overflow-auto border rounded-md p-2 bg-muted/50">
                    <pre className="text-xs">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('employeeReports.notes')}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={!selectedFile}>
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="ps-10"
          />
        </div>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('vacations.employee')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('vacations.employee')}</TableHead>
                <TableHead>{t('employeeReports.file')}</TableHead>
                <TableHead>{t('employeeReports.date')}</TableHead>
                <TableHead>{t('employeeReports.uploadedBy')}</TableHead>
                <TableHead>{t('employeeReports.notes')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports.length > 0 ? (
                sortedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{report.employeeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-success" />
                        <span className="text-sm">{report.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(report.reportDate).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.uploadDate).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {report.notes || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleDownload(report)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{t('common.noData')}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeReports;
