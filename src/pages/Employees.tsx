import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfiles, useYearlyGoals, useTasks, useVacations } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Task, Vacation, YearlyGoal } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Search, User, Calendar, GraduationCap, Mail, Phone, Award, Target, ListTodo, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import EmployeeTaskUpload from '@/components/employees/EmployeeTaskUpload';

const Employees: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { isAdmin } = useAuth();
  
  // Supabase data
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: allTasks } = useTasks();
  const { data: allVacations } = useVacations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isTaskUploadOpen, setIsTaskUploadOpen] = useState(false);

  const filteredEmployees = useMemo(() => {
    return profiles.filter((emp) =>
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.position || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [profiles, searchQuery]);

  // Get employee tasks
  const getEmployeeTasks = (profileId: string): Task[] => {
    return allTasks.filter(t => t.assigned_to === profileId);
  };

  // Get employee vacations
  const getEmployeeVacations = (profileId: string): Vacation[] => {
    return allVacations.filter(v => v.profile_id === profileId);
  };

  const getGoalStatusColor = (status: string) => {
    return {
      'not-started': 'bg-muted text-muted-foreground border-border',
      'in_progress': 'bg-warning/10 text-warning border-warning/20',
      'in-progress': 'bg-warning/10 text-warning border-warning/20',
      'completed': 'bg-success/10 text-success border-success/20',
    }[status] || 'bg-muted text-muted-foreground';
  };

  const getVacationTypeColor = (type: string) => {
    return {
      annual: 'bg-primary/10 text-primary border-primary/20',
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      emergency: 'bg-warning/10 text-warning border-warning/20',
      unpaid: 'bg-muted text-muted-foreground border-border',
    }[type] || 'bg-muted';
  };

  const getTaskStatusColor = (status: string) => {
    return {
      pending: 'bg-warning/10 text-warning',
      completed: 'bg-success/10 text-success',
      overdue: 'bg-destructive/10 text-destructive',
      'in-progress': 'bg-primary/10 text-primary',
    }[status] || 'bg-muted';
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('employees.title')}</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setIsTaskUploadOpen(true)}>
              <Upload className="w-4 h-4 me-2" />
              {t('import.uploadEmployeeTasks')}
            </Button>
          )}
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'لإضافة موظفين جدد، استخدم صفحة "صلاحيات الموظفين"' : 'To add new employees, use the "Employee Permissions" page'}
            </p>
          )}
        </div>
      </div>

      {/* Employee Task Upload Dialog */}
      <EmployeeTaskUpload 
        open={isTaskUploadOpen} 
        onOpenChange={setIsTaskUploadOpen}
        onSuccess={() => {}} 
      />

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
        {profilesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => {
            const tasks = getEmployeeTasks(employee.id);
            const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
            const completedTasks = tasks.filter(t => t.status === 'completed');

            return (
              <Card 
                key={employee.id} 
                className="card-hover stagger-item cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setSelectedEmployee(employee)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{employee.position}</p>
                      </div>
                    </div>
                    <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                      {employee.role === 'admin' ? 'مدير' : 'موظف'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      <span>{employee.department}</span>
                    </div>
                  </div>

                  {/* Task Summary */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <ListTodo className="w-4 h-4" />
                        المهام
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {pendingTasks.length} قيد التنفيذ
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-success/10 text-success">
                          {completedTasks.length} مكتملة
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {employee.skills && employee.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {employee.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {employee.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{employee.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card className="p-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <User className="w-16 h-16 text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-medium">لا يوجد موظفين</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? 'أضف موظفين من صفحة صلاحيات الموظفين' : 'لم يتم العثور على موظفين'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Employee Details Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedEmployee.full_name}</h2>
                    <p className="text-muted-foreground">{selectedEmployee.position} - {selectedEmployee.department}</p>
                    <Badge variant={selectedEmployee.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                      {selectedEmployee.role === 'admin' ? 'مدير النظام' : 'موظف'}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                  <TabsTrigger value="tasks">المهام</TabsTrigger>
                  <TabsTrigger value="vacations">الإجازات</TabsTrigger>
                  <TabsTrigger value="skills">المهارات</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedEmployee.email}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedEmployee.phone || 'غير محدد'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-primary">
                          {getEmployeeTasks(selectedEmployee.id).length}
                        </p>
                        <p className="text-sm text-muted-foreground">إجمالي المهام</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-success">
                          {getEmployeeTasks(selectedEmployee.id).filter(t => t.status === 'completed').length}
                        </p>
                        <p className="text-sm text-muted-foreground">مهام مكتملة</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-warning">
                          {getEmployeeVacations(selectedEmployee.id).length}
                        </p>
                        <p className="text-sm text-muted-foreground">الإجازات</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4 mt-4">
                  {getEmployeeTasks(selectedEmployee.id).length > 0 ? (
                    getEmployeeTasks(selectedEmployee.id).map((task) => (
                      <Card key={task.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              تاريخ الاستحقاق: {new Date(task.due_date).toLocaleDateString('ar-SA')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>لا توجد مهام مسندة</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="vacations" className="space-y-4 mt-4">
                  {getEmployeeVacations(selectedEmployee.id).length > 0 ? (
                    getEmployeeVacations(selectedEmployee.id).map((vacation) => (
                      <Card key={vacation.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge className={getVacationTypeColor(vacation.vacation_type)}>
                                {vacation.vacation_type}
                              </Badge>
                              <p className="text-sm mt-2">
                                {new Date(vacation.start_date).toLocaleDateString('ar-SA')} - {new Date(vacation.end_date).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                            <Badge variant={vacation.status === 'approved' ? 'default' : 'secondary'}>
                              {vacation.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>لا توجد إجازات مسجلة</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="skills" className="space-y-4 mt-4">
                  {/* Skills */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">المهارات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEmployee.skills && selectedEmployee.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.skills.map((skill, i) => (
                            <Badge key={i} variant="outline">{skill}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">لم تُضف مهارات بعد</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Certifications */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        الشهادات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEmployee.certifications && selectedEmployee.certifications.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.certifications.map((cert, i) => (
                            <Badge key={i} className="bg-accent/10 text-accent border-accent/20">{cert}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">لم تُضف شهادات بعد</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;