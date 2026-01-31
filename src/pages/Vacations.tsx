import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees } from '@/hooks/useLocalStorage';
import { Vacation } from '@/types';
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
import { Plus, Search, Calendar, User, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Vacations: React.FC = () => {
  const { t, dir } = useLanguage();
  const [employees, setEmployees] = useEmployees();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    type: 'annual' as Vacation['type'],
    status: 'pending' as Vacation['status'],
    notes: '',
  });

  // Flatten all vacations with employee info
  const allVacations = employees.flatMap((emp) =>
    emp.vacations.map((vac) => ({
      ...vac,
      employeeId: emp.id,
      employeeName: emp.name,
      employeePosition: emp.position,
    }))
  );

  // Filter vacations
  const filteredVacations = allVacations.filter((vac) => {
    const matchesSearch = vac.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || vac.status === filterStatus;
    const matchesType = filterType === 'all' || vac.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort by start date (newest first)
  const sortedVacations = [...filteredVacations].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const handleSubmit = () => {
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const newVacation: Vacation = {
      id: crypto.randomUUID(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      type: formData.type,
      status: formData.status,
      notes: formData.notes,
    };

    setEmployees(employees.map((emp) =>
      emp.id === formData.employeeId
        ? { ...emp, vacations: [...emp.vacations, newVacation] }
        : emp
    ));

    toast({ title: t('common.success'), description: 'Vacation added' });
    resetForm();
    setIsDialogOpen(false);
  };

  const handleStatusChange = (employeeId: string, vacationId: string, newStatus: Vacation['status']) => {
    setEmployees(employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            vacations: emp.vacations.map((vac) =>
              vac.id === vacationId ? { ...vac, status: newStatus } : vac
            ),
          }
        : emp
    ));
    toast({ title: t('common.success'), description: 'Status updated' });
  };

  const handleDelete = (employeeId: string, vacationId: string) => {
    setEmployees(employees.map((emp) =>
      emp.id === employeeId
        ? { ...emp, vacations: emp.vacations.filter((vac) => vac.id !== vacationId) }
        : emp
    ));
    toast({ title: t('common.success'), description: 'Vacation deleted' });
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      startDate: '',
      endDate: '',
      type: 'annual',
      status: 'pending',
      notes: '',
    });
  };

  const getTypeColor = (type: Vacation['type']) => {
    return {
      annual: 'bg-primary/10 text-primary border-primary/20',
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      emergency: 'bg-warning/10 text-warning border-warning/20',
      unpaid: 'bg-muted text-muted-foreground border-border',
    }[type];
  };

  const getStatusColor = (status: Vacation['status']) => {
    return {
      pending: 'bg-warning/10 text-warning border-warning/20',
      approved: 'bg-success/10 text-success border-success/20',
      rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    }[status];
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Stats
  const pendingCount = allVacations.filter((v) => v.status === 'pending').length;
  const approvedCount = allVacations.filter((v) => v.status === 'approved').length;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('vacations.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {pendingCount} {t('vacations.pending')} • {approvedCount} {t('vacations.approved')}
          </p>
        </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vacations.startDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('vacations.endDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vacations.type')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as Vacation['type'] })}
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
                <div className="space-y-2">
                  <Label>{t('vacations.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as Vacation['status'] })}
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
              </div>
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
              <Button onClick={handleSubmit}>
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

      {/* Vacations Table */}
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
              {sortedVacations.length > 0 ? (
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
                      <Badge className={cn('border', getTypeColor(vacation.type))}>
                        {t(`vacations.${vacation.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(vacation.startDate).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      {new Date(vacation.endDate).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {calculateDays(vacation.startDate, vacation.endDate)} {t('common.days')}
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
                        {vacation.status === 'pending' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-success h-8 w-8"
                              onClick={() => handleStatusChange(vacation.employeeId, vacation.id, 'approved')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive h-8 w-8"
                              onClick={() => handleStatusChange(vacation.employeeId, vacation.id, 'rejected')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDelete(vacation.employeeId, vacation.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
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

export default Vacations;
