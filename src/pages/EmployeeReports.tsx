import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeReports, useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, FileSpreadsheet, Upload, Download, Trash2, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const EmployeeReports: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { data: reports, isLoading, refetch } = useEmployeeReports();
  const { data: profiles } = useProfiles();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    profile_id: '',
    report_date: new Date().toISOString().split('T')[0],
    report_type: 'weekly',
    notes: '',
  });

  // Get profile info for each report
  const reportsWithProfiles = reports.map((report) => {
    const emp = profiles.find((p) => p.id === report.profile_id);
    return {
      ...report,
      employeeName: emp?.full_name || 'Unknown',
    };
  });

  // Filter reports
  const filteredReports = reportsWithProfiles.filter((report) => {
    const matchesSearch = 
      report.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.file_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesEmployee = filterEmployee === 'all' || report.profile_id === filterEmployee;
    return matchesSearch && matchesEmployee;
  });

  // Sort by created_at (newest first)
  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
          description: t('employeeReports.readError'),
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.profile_id || !selectedFile) {
      toast({
        title: t('common.error'),
        description: t('employeeReports.selectRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const reportData = {
        profile_id: formData.profile_id,
        report_date: formData.report_date,
        report_type: formData.report_type,
        file_name: selectedFile.name,
        notes: formData.notes || null,
        uploaded_by: profile?.id,
      };

      const { error } = await supabase.from('employee_reports').insert([reportData]);

      if (error) throw error;

      toast({ title: t('common.success'), description: t('employeeReports.uploadSuccess') });
      resetForm();
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('employeeReports.deleteConfirm'))) return;
    
    try {
      const { error } = await supabase.from('employee_reports').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: t('employeeReports.deleteSuccess') });
      refetch();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      profile_id: '',
      report_date: new Date().toISOString().split('T')[0],
      report_type: 'weekly',
      notes: '',
    });
    setSelectedFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return t('employeeReports.daily');
      case 'weekly':
        return t('employeeReports.weekly');
      case 'monthly':
        return t('employeeReports.monthly');
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('employeeReports.title')}</h1>
            <p className="text-muted-foreground">
              {reports.length} {t('employeeReports.archive')}
            </p>
          </div>
        </div>
        {isAdmin && (
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
              <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>{t('vacations.employee')} *</Label>
                  <Select
                    value={formData.profile_id}
                    onValueChange={(value) => setFormData({ ...formData, profile_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('vacations.employee')} />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} - {p.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('employeeReports.date')}</Label>
                    <Input
                      type="date"
                      value={formData.report_date}
                      onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('employeeReports.reportType')}</Label>
                    <Select
                      value={formData.report_type}
                      onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t('employeeReports.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('employeeReports.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('employeeReports.monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label>{t('employeeReports.preview')}</Label>
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!selectedFile}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
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
                <TableHead>{t('employeeReports.reportType')}</TableHead>
                <TableHead>{t('employeeReports.date')}</TableHead>
                <TableHead>{t('employeeReports.notes')}</TableHead>
                {isAdmin && <TableHead>{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : sortedReports.length > 0 ? (
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
                        <span className="text-sm">{report.file_name || t('employeeReports.report')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getReportTypeLabel(report.report_type || '')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {new Date(report.report_date).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {report.notes || '-'}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
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
