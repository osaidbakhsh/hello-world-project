import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees, useServers } from '@/hooks/useLocalStorage';
import { Employee, Vacation, Training } from '@/types';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, User, Calendar, GraduationCap, Server, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Employees: React.FC = () => {
  const { t, dir } = useLanguage();
  const [employees, setEmployees] = useEmployees();
  const [servers] = useServers();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    position: '',
    email: '',
    phone: '',
    department: 'IT',
    hireDate: new Date().toISOString().split('T')[0],
    vacations: [],
    trainings: [],
    assignedServerIds: [],
    status: 'active',
  });

  const [vacationForm, setVacationForm] = useState<Partial<Vacation>>({
    startDate: '',
    endDate: '',
    type: 'annual',
    status: 'pending',
    notes: '',
  });

  const [trainingForm, setTrainingForm] = useState<Partial<Training>>({
    name: '',
    provider: '',
    startDate: '',
    endDate: '',
    status: 'planned',
    notes: '',
  });

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    
    if (editingEmployee) {
      setEmployees(employees.map((e) =>
        e.id === editingEmployee.id
          ? { ...e, ...formData } as Employee
          : e
      ));
      toast({ title: t('common.success'), description: 'Employee updated' });
    } else {
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        name: formData.name || '',
        position: formData.position || '',
        email: formData.email || '',
        phone: formData.phone || '',
        department: formData.department || 'IT',
        hireDate: formData.hireDate || now,
        vacations: [],
        trainings: [],
        assignedServerIds: formData.assignedServerIds || [],
        status: formData.status || 'active',
        createdAt: now,
      };
      setEmployees([...employees, newEmployee]);
      toast({ title: t('common.success'), description: 'Employee added' });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleAddVacation = () => {
    if (!selectedEmployee || !vacationForm.startDate || !vacationForm.endDate) return;

    const newVacation: Vacation = {
      id: crypto.randomUUID(),
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      type: vacationForm.type as Vacation['type'],
      status: vacationForm.status as Vacation['status'],
      notes: vacationForm.notes,
    };

    setEmployees(employees.map((e) =>
      e.id === selectedEmployee.id
        ? { ...e, vacations: [...e.vacations, newVacation] }
        : e
    ));

    setSelectedEmployee({
      ...selectedEmployee,
      vacations: [...selectedEmployee.vacations, newVacation],
    });

    setVacationForm({
      startDate: '',
      endDate: '',
      type: 'annual',
      status: 'pending',
      notes: '',
    });

    toast({ title: t('common.success'), description: 'Vacation added' });
  };

  const handleAddTraining = () => {
    if (!selectedEmployee || !trainingForm.name || !trainingForm.startDate) return;

    const newTraining: Training = {
      id: crypto.randomUUID(),
      name: trainingForm.name,
      provider: trainingForm.provider || '',
      startDate: trainingForm.startDate,
      endDate: trainingForm.endDate || trainingForm.startDate,
      status: trainingForm.status as Training['status'],
      notes: trainingForm.notes,
    };

    setEmployees(employees.map((e) =>
      e.id === selectedEmployee.id
        ? { ...e, trainings: [...e.trainings, newTraining] }
        : e
    ));

    setSelectedEmployee({
      ...selectedEmployee,
      trainings: [...selectedEmployee.trainings, newTraining],
    });

    setTrainingForm({
      name: '',
      provider: '',
      startDate: '',
      endDate: '',
      status: 'planned',
      notes: '',
    });

    toast({ title: t('common.success'), description: 'Training added' });
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));
    toast({ title: t('common.success'), description: 'Employee deleted' });
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      position: '',
      email: '',
      phone: '',
      department: 'IT',
      hireDate: new Date().toISOString().split('T')[0],
      vacations: [],
      trainings: [],
      assignedServerIds: [],
      status: 'active',
    });
  };

  const getVacationTypeColor = (type: Vacation['type']) => {
    return {
      annual: 'bg-primary/10 text-primary border-primary/20',
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      emergency: 'bg-warning/10 text-warning border-warning/20',
      unpaid: 'bg-muted text-muted-foreground border-border',
    }[type];
  };

  const getTrainingStatusColor = (status: Training['status']) => {
    return {
      planned: 'bg-info/10 text-info border-info/20',
      'in-progress': 'bg-warning/10 text-warning border-warning/20',
      completed: 'bg-success/10 text-success border-success/20',
    }[status];
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('employees.title')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 me-2" />
              {t('employees.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? t('common.edit') : t('employees.add')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('employees.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('employees.email')} *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('employees.phone')}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.position')}</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('employees.department')}</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Network">Network</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as Employee['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('common.active')}</SelectItem>
                      <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          className="ps-10"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => {
            const assignedServers = servers.filter((s) =>
              employee.assignedServerIds.includes(s.id)
            );

            return (
              <Card key={employee.id} className="card-hover stagger-item">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{employee.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{employee.position}</p>
                      </div>
                    </div>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                      {employee.status === 'active' ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 me-1" />
                      {employee.vacations.length} {t('employees.vacations')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <GraduationCap className="w-3 h-3 me-1" />
                      {employee.trainings.length} {t('employees.trainings')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Server className="w-3 h-3 me-1" />
                      {assignedServers.length} {t('nav.servers')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      {t('common.edit')} {t('employees.vacations')}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(employee)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <User className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Employee Details Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="vacations">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vacations">{t('employees.vacations')}</TabsTrigger>
              <TabsTrigger value="trainings">{t('employees.trainings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="vacations" className="space-y-4">
              {/* Add Vacation Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('employees.addVacation')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('licenses.startDate')}</Label>
                      <Input
                        type="date"
                        value={vacationForm.startDate}
                        onChange={(e) => setVacationForm({ ...vacationForm, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('licenses.expiryDate')}</Label>
                      <Input
                        type="date"
                        value={vacationForm.endDate}
                        onChange={(e) => setVacationForm({ ...vacationForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={vacationForm.type}
                      onValueChange={(value) => setVacationForm({ ...vacationForm, type: value as Vacation['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={vacationForm.status}
                      onValueChange={(value) => setVacationForm({ ...vacationForm, status: value as Vacation['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleAddVacation}>
                    <Plus className="w-4 h-4 me-1" />
                    {t('employees.addVacation')}
                  </Button>
                </CardContent>
              </Card>

              {/* Vacations List */}
              <div className="space-y-2">
                {selectedEmployee?.vacations.map((vacation) => (
                  <div
                    key={vacation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={cn('border', getVacationTypeColor(vacation.type))}>
                        {vacation.type}
                      </Badge>
                      <span className="text-sm">
                        {vacation.startDate} → {vacation.endDate}
                      </span>
                    </div>
                    <Badge variant={vacation.status === 'approved' ? 'default' : 'secondary'}>
                      {vacation.status}
                    </Badge>
                  </div>
                ))}
                {(!selectedEmployee?.vacations || selectedEmployee.vacations.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">{t('common.noData')}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trainings" className="space-y-4">
              {/* Add Training Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('employees.addTraining')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={trainingForm.name}
                        onChange={(e) => setTrainingForm({ ...trainingForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Provider</Label>
                      <Input
                        value={trainingForm.provider}
                        onChange={(e) => setTrainingForm({ ...trainingForm, provider: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      type="date"
                      value={trainingForm.startDate}
                      onChange={(e) => setTrainingForm({ ...trainingForm, startDate: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={trainingForm.endDate}
                      onChange={(e) => setTrainingForm({ ...trainingForm, endDate: e.target.value })}
                    />
                    <Select
                      value={trainingForm.status}
                      onValueChange={(value) => setTrainingForm({ ...trainingForm, status: value as Training['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleAddTraining}>
                    <Plus className="w-4 h-4 me-1" />
                    {t('employees.addTraining')}
                  </Button>
                </CardContent>
              </Card>

              {/* Trainings List */}
              <div className="space-y-2">
                {selectedEmployee?.trainings.map((training) => (
                  <div
                    key={training.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{training.name}</p>
                      <p className="text-xs text-muted-foreground">{training.provider}</p>
                    </div>
                    <Badge className={cn('border', getTrainingStatusColor(training.status))}>
                      {training.status}
                    </Badge>
                  </div>
                ))}
                {(!selectedEmployee?.trainings || selectedEmployee.trainings.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">{t('common.noData')}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
