import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useDomains, useDomainMemberships } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Shield, Network, Search, Save, UserCog, Eye, Pencil, 
  Plus, Key, Download, Mail, Phone, Building, User, Loader2,
  RefreshCw, Trash2, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Profile } from '@/lib/supabase';

interface DomainPermission {
  domain_id: string;
  domain_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface NewEmployeeForm {
  email: string;
  password: string;
  full_name: string;
  department: string;
  position: string;
  phone: string;
  role: 'admin' | 'employee';
}

const EmployeePermissions: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { data: memberships, refetch: refetchMemberships } = useDomainMemberships();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<DomainPermission[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Dialog states
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLdapImportOpen, setIsLdapImportOpen] = useState(false);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Form data
  const [newEmployeeForm, setNewEmployeeForm] = useState<NewEmployeeForm>({
    email: '',
    password: '',
    full_name: '',
    department: 'IT',
    position: '',
    phone: '',
    role: 'employee',
  });
  
  const [newPassword, setNewPassword] = useState('');

  // Filter profiles based on search and active tab
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (profile.department?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'admins') return matchesSearch && profile.role === 'admin';
    if (activeTab === 'employees') return matchesSearch && profile.role === 'employee';
    return matchesSearch;
  });

  // Load permissions when a profile is selected
  useEffect(() => {
    if (selectedProfile && domains.length > 0) {
      const profileMemberships = memberships.filter(m => m.profile_id === selectedProfile.id);
      
      const domainPermissions: DomainPermission[] = domains.map(domain => {
        const membership = profileMemberships.find(m => m.domain_id === domain.id);
        return {
          domain_id: domain.id,
          domain_name: domain.name,
          can_view: !!membership,
          can_edit: membership?.can_edit || false,
        };
      });
      
      setPermissions(domainPermissions);
    }
  }, [selectedProfile, domains, memberships]);

  const handleOpenPermissions = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsPermissionsOpen(true);
  };

  const handleOpenResetPassword = (profile: Profile) => {
    setSelectedProfile(profile);
    setNewPassword('');
    setIsResetPasswordOpen(true);
  };

  const handleOpenDeleteConfirm = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsDeleteConfirmOpen(true);
  };

  const handleToggleView = (domainId: string, checked: boolean) => {
    setPermissions(prev => prev.map(p => 
      p.domain_id === domainId 
        ? { ...p, can_view: checked, can_edit: checked ? p.can_edit : false }
        : p
    ));
  };

  const handleToggleEdit = (domainId: string, checked: boolean) => {
    setPermissions(prev => prev.map(p => 
      p.domain_id === domainId 
        ? { ...p, can_edit: checked, can_view: checked ? true : p.can_view }
        : p
    ));
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeForm.email || !newEmployeeForm.password || !newEmployeeForm.full_name) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    if (newEmployeeForm.password.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone format (must start with 05 and be 10 digits)
    if (newEmployeeForm.phone && !/^05\d{8}$/.test(newEmployeeForm.phone)) {
      toast({
        title: 'خطأ',
        description: 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingEmployee(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('غير مسجل الدخول');
      }

      // Call the Edge Function to create employee
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: newEmployeeForm.email,
            password: newEmployeeForm.password,
            full_name: newEmployeeForm.full_name,
            department: newEmployeeForm.department,
            position: newEmployeeForm.position,
            phone: newEmployeeForm.phone,
            role: newEmployeeForm.role,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في إضافة الموظف');
      }

      await refetchProfiles();
      
      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة الموظف بنجاح.',
      });
      
      setIsAddEmployeeOpen(false);
      setNewEmployeeForm({
        email: '',
        password: '',
        full_name: '',
        department: 'IT',
        position: '',
        phone: '',
        role: 'employee',
      });
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إضافة الموظف',
        variant: 'destructive',
      });
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedProfile || !newPassword) return;

    if (newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(selectedProfile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني',
      });
      
      setIsResetPasswordOpen(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إعادة تعيين كلمة المرور',
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;

    try {
      // Delete from profiles table (this will cascade due to RLS)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedProfile.id);

      if (error) throw error;

      await refetchProfiles();
      toast({
        title: 'تم بنجاح',
        description: 'تم حذف الموظف بنجاح',
      });
      
      setIsDeleteConfirmOpen(false);
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الموظف. قد يكون مرتبطًا ببيانات أخرى.',
        variant: 'destructive',
      });
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedProfile) return;
    
    setIsSaving(true);
    try {
      // Delete existing memberships for this profile
      const { error: deleteError } = await supabase
        .from('domain_memberships')
        .delete()
        .eq('profile_id', selectedProfile.id);

      if (deleteError) throw deleteError;

      // Insert new memberships
      const newMemberships = permissions
        .filter(p => p.can_view)
        .map(p => ({
          profile_id: selectedProfile.id,
          domain_id: p.domain_id,
          can_edit: p.can_edit,
        }));

      if (newMemberships.length > 0) {
        const { error: insertError } = await supabase
          .from('domain_memberships')
          .insert(newMemberships);

        if (insertError) throw insertError;
      }

      await refetchMemberships();
      toast({ title: 'تم بنجاح', description: 'تم حفظ الصلاحيات بنجاح' });
      setIsPermissionsOpen(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({ 
        title: 'خطأ', 
        description: 'فشل في حفظ الصلاحيات',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getProfileDomainCount = (profileId: string) => {
    return memberships.filter(m => m.profile_id === profileId).length;
  };

  const getProfileDomains = (profileId: string) => {
    const profileMemberships = memberships.filter(m => m.profile_id === profileId);
    return profileMemberships.map(m => {
      const domain = domains.find(d => d.id === m.domain_id);
      return { name: domain?.name || 'Unknown', can_edit: m.can_edit };
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-lg">{t('permissions.noAccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('permissions.title')}</h1>
            <p className="text-muted-foreground">{t('permissions.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsLdapImportOpen(true)}>
            <Download className="w-4 h-4 me-2" />
            {t('permissions.ldapImport')}
          </Button>
          <Button onClick={() => setIsAddEmployeeOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t('permissions.addEmployee')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('permissions.totalEmployees')}</p>
                <p className="text-3xl font-bold">{profiles.length}</p>
              </div>
              <Users className="w-10 h-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('permissions.admins')}</p>
                <p className="text-3xl font-bold text-accent">{profiles.filter(p => p.role === 'admin').length}</p>
              </div>
              <Shield className="w-10 h-10 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted/50 to-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('permissions.employees')}</p>
                <p className="text-3xl font-bold">{profiles.filter(p => p.role === 'employee').length}</p>
              </div>
              <User className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">{t('permissions.all')} ({profiles.length})</TabsTrigger>
            <TabsTrigger value="admins">{t('permissions.admins')} ({profiles.filter(p => p.role === 'admin').length})</TabsTrigger>
            <TabsTrigger value="employees">{t('permissions.employees')} ({profiles.filter(p => p.role === 'employee').length})</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('permissions.searchEmployee')}
            className="ps-10"
          />
        </div>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('permissions.employeeList')}
              </CardTitle>
              <CardDescription>
                {t('permissions.employeeListDesc')}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetchProfiles()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">{t('common.loading')}</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('permissions.noEmployees')}</p>
              <Button className="mt-4" onClick={() => setIsAddEmployeeOpen(true)}>
                <Plus className="w-4 h-4 me-2" />
                {t('permissions.addNewEmployee')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('employees.name')}</TableHead>
                    <TableHead>{t('form.email')}</TableHead>
                    <TableHead>{t('form.department')}</TableHead>
                    <TableHead>{t('form.role')}</TableHead>
                    <TableHead>{t('permissions.domains')}</TableHead>
                    <TableHead className="text-end">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const profileDomains = getProfileDomains(profile.id);
                    
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground">{profile.position || t('permissions.notSpecified')}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {profile.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Building className="w-3 h-3 me-1" />
                            {profile.department || 'IT'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={profile.role === 'admin' ? 'default' : 'secondary'}
                            className={profile.role === 'admin' ? 'bg-accent text-accent-foreground' : ''}
                          >
                            {profile.role === 'admin' ? t('permissions.admins') : t('permissions.employees')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {profileDomains.length === 0 ? (
                              <span className="text-muted-foreground text-sm">{t('permissions.notAssigned')}</span>
                            ) : (
                              <>
                                {profileDomains.slice(0, 2).map((d, i) => (
                                  <Badge 
                                    key={i} 
                                    variant="secondary"
                                    className={cn(
                                      "text-xs",
                                      d.can_edit ? 'bg-primary/10 text-primary' : ''
                                    )}
                                  >
                                    {d.name}
                                    {d.can_edit && <Pencil className="w-2 h-2 ms-1" />}
                                  </Badge>
                                ))}
                                {profileDomains.length > 2 && (
                                  <Badge variant="outline" className="text-xs">+{profileDomains.length - 2}</Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenPermissions(profile)}
                              title={t('common.permissions')}
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenResetPassword(profile)}
                              title={t('common.resetPassword')}
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleOpenDeleteConfirm(profile)}
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('permissions.addNewEmployee')}
            </DialogTitle>
            <DialogDescription>
              {t('permissions.addEmployeeDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('form.fullName')} *</Label>
                <Input
                  id="full_name"
                  value={newEmployeeForm.full_name}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, full_name: e.target.value })}
                  placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('form.role')} *</Label>
                <Select
                  value={newEmployeeForm.role}
                  onValueChange={(value: 'admin' | 'employee') => 
                    setNewEmployeeForm({ ...newEmployeeForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t('employees.employee')}</SelectItem>
                    <SelectItem value="admin">{t('employees.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('form.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={newEmployeeForm.email}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                placeholder="employee@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('form.password')} *</Label>
              <Input
                id="password"
                type="password"
                value={newEmployeeForm.password}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })}
                placeholder={language === 'ar' ? '6 أحرف على الأقل' : '6 characters minimum'}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">{t('form.department')}</Label>
                <Select
                  value={newEmployeeForm.department}
                  onValueChange={(value) => setNewEmployeeForm({ ...newEmployeeForm, department: value })}
                >
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
                <Label htmlFor="position">{t('form.position')}</Label>
                <Input
                  id="position"
                  value={newEmployeeForm.position}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, position: e.target.value })}
                  placeholder={language === 'ar' ? 'مهندس أنظمة' : 'System Engineer'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('form.phone')}</Label>
              <Input
                id="phone"
                value={newEmployeeForm.phone}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length > 10) value = value.slice(0, 10);
                  setNewEmployeeForm({ ...newEmployeeForm, phone: value });
                }}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="text-left font-mono"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">{t('form.example')}: 0512345678</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddEmployee} disabled={isAddingEmployee}>
              {isAddingEmployee ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('permissions.adding')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 me-2" />
                  {t('permissions.addEmployeeBtn')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('permissions.permissionsFor')}: {selectedProfile?.full_name}
            </DialogTitle>
            <DialogDescription>
              {t('permissions.permissionsDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {domainsLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : domains.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('permissions.noDomains')}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('permissions.domain')}</TableHead>
                      <TableHead className="text-center w-32">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-4 h-4" />
                          {t('permissions.canView')}
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-32">
                        <div className="flex items-center justify-center gap-1">
                          <Pencil className="w-4 h-4" />
                          {t('permissions.canEdit')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow key={permission.domain_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-muted-foreground" />
                            {permission.domain_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permission.can_view}
                              onCheckedChange={(checked) => 
                                handleToggleView(permission.domain_id, checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permission.can_edit}
                              disabled={!permission.can_view}
                              onCheckedChange={(checked) => 
                                handleToggleEdit(permission.domain_id, checked as boolean)
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 me-2" />
                  {t('permissions.savePermissions')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t('common.resetPassword')}
            </DialogTitle>
            <DialogDescription>
              {t('permissions.resetPasswordDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{selectedProfile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedProfile?.email}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword}>
              {isResettingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 me-2" />
                  {language === 'ar' ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t('permissions.deleteEmployee')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('permissions.deleteConfirm')} "{selectedProfile?.full_name}"? 
              {t('permissions.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 me-2" />
              {t('permissions.deleteEmployee')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LDAP Import Dialog */}
      <Dialog open={isLdapImportOpen} onOpenChange={setIsLdapImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              {language === 'ar' ? 'استيراد من Active Directory' : 'Import from Active Directory'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'استيراد الموظفين من خادم LDAP / Active Directory' : 'Import employees from LDAP / Active Directory server'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 border border-dashed rounded-lg text-center">
              <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {language === 'ar' ? 'لاستخدام هذه الميزة، تأكد من إعداد LDAP في صفحة الإعدادات أولاً.' : 'To use this feature, make sure to configure LDAP in the Settings page first.'}
              </p>
              <Button variant="outline" onClick={() => {
                setIsLdapImportOpen(false);
                window.location.href = '/settings';
              }}>
                {language === 'ar' ? 'الذهاب للإعدادات' : 'Go to Settings'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLdapImportOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePermissions;
