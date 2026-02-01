import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfiles, useYearlyGoals, useTasks, useVacations } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Task, Vacation, YearlyGoal } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, User, Calendar, GraduationCap, Mail, Phone, Award, Target, ListTodo, Upload, Edit, X, Plus, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import EmployeeTaskUpload from '@/components/employees/EmployeeTaskUpload';
import { useToast } from '@/hooks/use-toast';

const Employees: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { isAdmin, isSuperAdmin, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  
  // Supabase data
  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const { data: allTasks } = useTasks();
  const { data: allVacations } = useVacations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isTaskUploadOpen, setIsTaskUploadOpen] = useState(false);
  
  // Skills/Certs editing states
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [editedSkills, setEditedSkills] = useState<string[]>([]);
  const [editedCertifications, setEditedCertifications] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  
  // Profile editing states (Super Admin only)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDepartment, setEditingDepartment] = useState('');
  const [editingPosition, setEditingPosition] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  // Check if current user can edit the selected employee
  const canEditSkills = selectedEmployee && (
    isSuperAdmin || selectedEmployee.id === currentUserProfile?.id
  );

  // Start editing skills
  const handleStartEditSkills = () => {
    if (!selectedEmployee) return;
    setEditedSkills(selectedEmployee.skills || []);
    setEditedCertifications(selectedEmployee.certifications || []);
    setIsEditingSkills(true);
  };

  // Save skills/certifications
  const handleSaveSkills = async () => {
    if (!selectedEmployee) return;
    setIsSavingSkills(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          skills: editedSkills,
          certifications: editedCertifications,
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ المهارات والشهادات بنجاح' : 'Skills and certifications saved successfully',
      });
      
      await refetchProfiles();
      setIsEditingSkills(false);
      
      // Update selected employee with new data
      setSelectedEmployee(prev => prev ? {
        ...prev,
        skills: editedSkills,
        certifications: editedCertifications,
      } : null);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingSkills(false);
    }
  };

  // Start editing profile (Super Admin)
  const handleStartEditProfile = () => {
    if (!selectedEmployee || !isSuperAdmin) return;
    setEditingName(selectedEmployee.full_name);
    setEditingDepartment(selectedEmployee.department || 'IT');
    setEditingPosition(selectedEmployee.position || '');
    setIsEditingProfile(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!selectedEmployee) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingName,
          department: editingDepartment,
          position: editingPosition,
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم تحديث بيانات الموظف بنجاح' : 'Employee profile updated successfully',
      });
      
      await refetchProfiles();
      setIsEditingProfile(false);
      
      // Update selected employee with new data
      setSelectedEmployee(prev => prev ? {
        ...prev,
        full_name: editingName,
        department: editingDepartment,
        position: editingPosition,
      } : null);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !editedSkills.includes(newSkill.trim())) {
      setEditedSkills([...editedSkills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setEditedSkills(editedSkills.filter(s => s !== skill));
  };

  const addCertification = () => {
    if (newCertification.trim() && !editedCertifications.includes(newCertification.trim())) {
      setEditedCertifications([...editedCertifications, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const removeCertification = (cert: string) => {
    setEditedCertifications(editedCertifications.filter(c => c !== cert));
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedEmployee.full_name}</h2>
                      <p className="text-muted-foreground">{selectedEmployee.position} - {selectedEmployee.department}</p>
                      <Badge 
                        variant={selectedEmployee.role === 'super_admin' ? 'destructive' : selectedEmployee.role === 'admin' ? 'default' : 'secondary'} 
                        className="mt-1"
                      >
                        {selectedEmployee.role === 'super_admin' ? 'مسؤول أعلى' : selectedEmployee.role === 'admin' ? 'مدير النظام' : 'موظف'}
                      </Badge>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline" onClick={handleStartEditProfile}>
                      <Edit className="w-4 h-4 me-2" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                  )}
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
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">{language === 'ar' ? 'المهارات' : 'Skills'}</CardTitle>
                      {canEditSkills && !isEditingSkills && (
                        <Button size="sm" variant="outline" onClick={handleStartEditSkills}>
                          <Edit className="w-4 h-4 me-2" />
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {isEditingSkills ? (
                        <div className="space-y-4">
                          {/* Skills editing */}
                          <div className="flex flex-wrap gap-2">
                            {editedSkills.map((skill, i) => (
                              <Badge key={i} variant="outline" className="flex items-center gap-1">
                                {skill}
                                <button onClick={() => removeSkill(skill)} className="ms-1 hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              placeholder={language === 'ar' ? 'أضف مهارة جديدة' : 'Add new skill'}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                              className="flex-1"
                            />
                            <Button size="sm" type="button" onClick={addSkill}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : selectedEmployee.skills && selectedEmployee.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.skills.map((skill, i) => (
                            <Badge key={i} variant="outline">{skill}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {language === 'ar' ? 'لم تُضف مهارات بعد' : 'No skills added yet'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Certifications */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        {language === 'ar' ? 'الشهادات' : 'Certifications'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditingSkills ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {editedCertifications.map((cert, i) => (
                              <Badge key={i} className="bg-accent/10 text-accent border-accent/20 flex items-center gap-1">
                                {cert}
                                <button onClick={() => removeCertification(cert)} className="ms-1 hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={newCertification}
                              onChange={(e) => setNewCertification(e.target.value)}
                              placeholder={language === 'ar' ? 'أضف شهادة جديدة' : 'Add new certification'}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                              className="flex-1"
                            />
                            <Button size="sm" type="button" onClick={addCertification}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : selectedEmployee.certifications && selectedEmployee.certifications.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.certifications.map((cert, i) => (
                            <Badge key={i} className="bg-accent/10 text-accent border-accent/20">{cert}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {language === 'ar' ? 'لم تُضف شهادات بعد' : 'No certifications added yet'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Save/Cancel buttons for editing */}
                  {isEditingSkills && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEditingSkills(false)} disabled={isSavingSkills}>
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </Button>
                      <Button onClick={handleSaveSkills} disabled={isSavingSkills}>
                        {isSavingSkills ? (
                          <Loader2 className="w-4 h-4 me-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 me-2" />
                        )}
                        {language === 'ar' ? 'حفظ' : 'Save'}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog (Super Admin only) */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Employee Profile'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
              <Input 
                value={editingName} 
                onChange={(e) => setEditingName(e.target.value)} 
                placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
              <Select value={editingDepartment} onValueChange={setEditingDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">{t('dept.it')}</SelectItem>
                  <SelectItem value="DevOps">{t('dept.devops')}</SelectItem>
                  <SelectItem value="Security">{t('dept.security')}</SelectItem>
                  <SelectItem value="Network">{t('dept.network')}</SelectItem>
                  <SelectItem value="Support">{t('dept.support')}</SelectItem>
                  <SelectItem value="System Admin">{t('dept.sysadmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المنصب' : 'Position'}</Label>
              <Input 
                value={editingPosition} 
                onChange={(e) => setEditingPosition(e.target.value)} 
                placeholder={language === 'ar' ? 'المنصب الوظيفي' : 'Job position'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 me-2" />
              )}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;