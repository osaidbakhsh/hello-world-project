import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVacations, useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Plus, Search, Calendar, User, Check, X, Clock, Download, FileSpreadsheet, FileText, List, CalendarDays } from 'lucide-react';
import VacationCalendar from '@/components/vacations/VacationCalendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DataTableHeader, vacationSortOptions, applySortToData } from '@/components/DataTableHeader';
import { exportVacationsPDF, calculateVacationSummary } from '@/utils/pdfExport';
import * as XLSX from 'xlsx';

const Vacations: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { data: vacations, isLoading, refetch } = useVacations();
  const { data: profiles } = useProfiles();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [sortValue, setSortValue] = useState<string>('start_date-desc');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    profile_id: '',
    start_date: '',
    end_date: '',
    vacation_type: 'annual',
    status: 'pending',
    notes: '',
  });

  // Get profile info for each vacation
  const vacationsWithProfiles = useMemo(() => {
    return vacations.map((vac) => {
      const emp = profiles.find((p) => p.id === vac.profile_id);
      return {
        ...vac,
        employeeName: emp?.full_name || 'Unknown',
        employeePosition: emp?.position || '',
      };
    });
  }, [vacations, profiles]);

  // Filter vacations
  const filteredVacations = useMemo(() => {
    return vacationsWithProfiles.filter((vac) => {
      const matchesSearch = vac.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || vac.status === filterStatus;
      const matchesType = filterType === 'all' || vac.vacation_type === filterType;
      const matchesEmployee = filterEmployee === 'all' || vac.profile_id === filterEmployee;
      return matchesSearch && matchesStatus && matchesType && matchesEmployee;
    });
  }, [vacationsWithProfiles, searchQuery, filterStatus, filterType, filterEmployee]);

  // Apply sorting
  const sortedVacations = useMemo(() => {
    const fieldMapping: Record<string, keyof typeof filteredVacations[0]> = {
      employee: 'employeeName',
    };
    return applySortToData(filteredVacations, sortValue, fieldMapping);
  }, [filteredVacations, sortValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    if (!formData.start_date || !formData.end_date) {
      toast({
        title: t('common.error'),
        description: t('vacations.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Check employee selection for admin
    if (isAdmin && !formData.profile_id) {
      toast({
        title: t('common.error'),
        description: t('vacations.selectEmployee'),
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Ensure profile.id exists for non-admin users
    if (!isAdmin && !profile?.id) {
      toast({
        title: t('common.error'),
        description: t('vacations.profileNotFound'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const vacationData = {
        profile_id: isAdmin ? formData.profile_id : profile!.id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        vacation_type: formData.vacation_type,
        // Auto-approve for employees (as per user preference), admins can choose status
        status: isAdmin ? formData.status : 'approved',
        notes: formData.notes || null,
        days_count: calculateDays(formData.start_date, formData.end_date),
      };

      const { error } = await supabase.from('vacations').insert([vacationData]);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: t('vacations.addSuccess') });
      resetForm();
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      // Ignore AbortError - happens when component unmounts
      if (error.name === 'AbortError') {
        setIsSubmitting(false);
        return;
      }
      
      console.error('Vacation insert error:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('vacations.addError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (vacationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('vacations')
        .update({ status: newStatus, approved_by: profile?.id })
        .eq('id', vacationId);
      
      if (error) throw error;
      toast({ title: t('common.success'), description: 'تم تحديث الحالة' });
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
    if (!confirm('هل أنت متأكد من حذف هذه الإجازة؟')) return;
    
    try {
      const { error } = await supabase.from('vacations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'تم حذف الإجازة' });
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
      start_date: '',
      end_date: '',
      vacation_type: 'annual',
      status: 'pending',
      notes: '',
    });
  };

  // Export functions
  const handleExportExcel = (forEmployee: boolean) => {
    const dataToExport = forEmployee && filterEmployee !== 'all'
      ? sortedVacations.filter(v => v.profile_id === filterEmployee)
      : sortedVacations;

    const employeeName = forEmployee && filterEmployee !== 'all'
      ? profiles.find(p => p.id === filterEmployee)?.full_name || 'employee'
      : 'all';

    const exportData = dataToExport.map((v) => ({
      'اسم الموظف': v.employeeName,
      'المنصب': v.employeePosition,
      'نوع الإجازة': t(`vacations.${v.vacation_type}`),
      'تاريخ البداية': v.start_date,
      'تاريخ النهاية': v.end_date,
      'عدد الأيام': v.days_count || calculateDays(v.start_date, v.end_date),
      'الحالة': t(`vacations.${v.status}`),
      'ملاحظات': v.notes || '',
    }));

    // Calculate summary
    const summary = calculateVacationSummary(dataToExport);
    const summaryData = [
      { 'البند': 'إجمالي الأيام', 'القيمة': summary.totalDays },
      { 'البند': 'إجازات سنوية', 'القيمة': summary.annualDays },
      { 'البند': 'إجازات مرضية', 'القيمة': summary.sickDays },
      { 'البند': 'إجازات طارئة', 'القيمة': summary.emergencyDays },
      { 'البند': 'إجازات بدون راتب', 'القيمة': summary.unpaidDays },
      { 'البند': 'موافق عليها', 'القيمة': summary.approvedCount },
      { 'البند': 'معلقة', 'القيمة': summary.pendingCount },
      { 'البند': 'مرفوضة', 'القيمة': summary.rejectedCount },
    ];

    const ws1 = XLSX.utils.json_to_sheet(exportData);
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    
    ws1['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, 
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'الإجازات');
    XLSX.utils.book_append_sheet(wb, ws2, 'ملخص');
    XLSX.writeFile(wb, `vacations-${employeeName}-${Date.now()}.xlsx`);
    
    toast({ title: t('common.success'), description: 'تم التصدير بنجاح' });
  };

  const handleExportPDF = (forEmployee: boolean) => {
    const dataToExport = forEmployee && filterEmployee !== 'all'
      ? sortedVacations.filter(v => v.profile_id === filterEmployee)
      : sortedVacations;

    const employeeName = forEmployee && filterEmployee !== 'all'
      ? profiles.find(p => p.id === filterEmployee)?.full_name || 'employee'
      : dir === 'rtl' ? 'جميع الموظفين' : 'All Employees';

    const exportData = dataToExport.map(v => ({
      employeeName: v.employeeName,
      employeePosition: v.employeePosition,
      vacationType: t(`vacations.${v.vacation_type}`),
      startDate: v.start_date,
      endDate: v.end_date,
      daysCount: v.days_count || calculateDays(v.start_date, v.end_date),
      status: t(`vacations.${v.status}`),
      notes: v.notes || '',
    }));

    const summary = calculateVacationSummary(dataToExport);
    
    exportVacationsPDF(exportData, employeeName, summary, dir === 'rtl');
    toast({ title: t('common.success'), description: 'تم التصدير بنجاح' });
  };

  const getTypeColor = (type: string) => {
    return {
      annual: 'bg-primary/10 text-primary border-primary/20',
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      emergency: 'bg-warning/10 text-warning border-warning/20',
      unpaid: 'bg-muted text-muted-foreground border-border',
    }[type] || 'bg-muted text-muted-foreground border-border';
  };

  const getStatusColor = (status: string) => {
    return {
      pending: 'bg-warning/10 text-warning border-warning/20',
      approved: 'bg-success/10 text-success border-success/20',
      rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    }[status] || 'bg-muted text-muted-foreground border-border';
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Stats
  const pendingCount = vacations.filter((v) => v.status === 'pending').length;
  const approvedCount = vacations.filter((v) => v.status === 'approved').length;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('vacations.title')}</h1>
            <p className="text-muted-foreground">
              {pendingCount} {t('vacations.pending')} • {approvedCount} {t('vacations.approved')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 me-2" />
                {t('servers.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExportExcel(false)}>
                <FileSpreadsheet className="w-4 h-4 me-2" />
                Excel - جميع الموظفين
              </DropdownMenuItem>
              {filterEmployee !== 'all' && (
                <DropdownMenuItem onClick={() => handleExportExcel(true)}>
                  <FileSpreadsheet className="w-4 h-4 me-2" />
                  Excel - الموظف المحدد
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportPDF(false)}>
                <FileText className="w-4 h-4 me-2" />
                PDF - جميع الموظفين
              </DropdownMenuItem>
              {filterEmployee !== 'all' && (
                <DropdownMenuItem onClick={() => handleExportPDF(true)}>
                  <FileText className="w-4 h-4 me-2" />
                  PDF - الموظف المحدد
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                {t('employees.addVacation')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('employees.addVacation')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                {isAdmin && (
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
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('vacations.startDate')} *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('vacations.endDate')} *</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('vacations.type')}</Label>
                    <Select
                      value={formData.vacation_type}
                      onValueChange={(value) => setFormData({ ...formData, vacation_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">{t('vacations.annual')}</SelectItem>
                        <SelectItem value="sick">{t('vacations.sick')}</SelectItem>
                        <SelectItem value="emergency">{t('vacations.emergency')}</SelectItem>
                        <SelectItem value="unpaid">{t('vacations.unpaid')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>{t('vacations.status')}</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('vacations.pending')}</SelectItem>
                          <SelectItem value="approved">{t('vacations.approved')}</SelectItem>
                          <SelectItem value="rejected">{t('vacations.rejected')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('employeeReports.notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vacations.listView') || (dir === 'rtl' ? 'عرض القائمة' : 'List View')}</span>
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vacations.calendarView') || (dir === 'rtl' ? 'عرض التقويم' : 'Calendar View')}</span>
          </Button>
        </div>
        
        <Badge variant="secondary" className="text-sm">
          {sortedVacations.length} {t('reports.records')}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
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
          {isAdmin && (
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-[200px]">
                <User className="w-4 h-4 me-2" />
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
          )}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('vacations.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="pending">{t('vacations.pending')}</SelectItem>
              <SelectItem value="approved">{t('vacations.approved')}</SelectItem>
              <SelectItem value="rejected">{t('vacations.rejected')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('vacations.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="annual">{t('vacations.annual')}</SelectItem>
              <SelectItem value="sick">{t('vacations.sick')}</SelectItem>
              <SelectItem value="emergency">{t('vacations.emergency')}</SelectItem>
              <SelectItem value="unpaid">{t('vacations.unpaid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Sort Controls - only show in list mode */}
        {viewMode === 'list' && (
          <DataTableHeader
            sortOptions={vacationSortOptions}
            currentSort={sortValue}
            onSortChange={setSortValue}
          />
        )}
      </div>

      {/* Conditional Display Based on Mode */}
      {viewMode === 'calendar' ? (
        <VacationCalendar
          vacations={sortedVacations}
          profiles={profiles}
        />
      ) : (
      /* Vacations Table */
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('vacations.employee')}</TableHead>
                <TableHead>{t('vacations.type')}</TableHead>
                <TableHead>{t('vacations.startDate')}</TableHead>
                <TableHead>{t('vacations.endDate')}</TableHead>
                <TableHead>{t('vacations.days')}</TableHead>
                <TableHead>{t('vacations.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    جارٍ التحميل...
                  </TableCell>
                </TableRow>
              ) : sortedVacations.length > 0 ? (
                sortedVacations.map((vacation) => (
                  <TableRow key={vacation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{vacation.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{vacation.employeePosition}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border', getTypeColor(vacation.vacation_type))}>
                        {t(`vacations.${vacation.vacation_type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(vacation.start_date).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      {new Date(vacation.end_date).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {vacation.days_count || calculateDays(vacation.start_date, vacation.end_date)} {t('common.days')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border', getStatusColor(vacation.status))}>
                        {vacation.status === 'pending' && <Clock className="w-3 h-3 me-1" />}
                        {vacation.status === 'approved' && <Check className="w-3 h-3 me-1" />}
                        {vacation.status === 'rejected' && <X className="w-3 h-3 me-1" />}
                        {t(`vacations.${vacation.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isAdmin && vacation.status === 'pending' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-success h-8 w-8"
                              onClick={() => handleStatusChange(vacation.id, 'approved')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive h-8 w-8"
                              onClick={() => handleStatusChange(vacation.id, 'rejected')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive h-8 w-8"
                            onClick={() => handleDelete(vacation.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    لا توجد إجازات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default Vacations;
