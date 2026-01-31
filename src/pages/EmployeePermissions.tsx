import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useDomains, useDomainMemberships } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Shield, Network, Search, Edit, Save, UserCog, Eye, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DomainPermission {
  domain_id: string;
  domain_name: string;
  can_view: boolean;
  can_edit: boolean;
}

const EmployeePermissions: React.FC = () => {
  const { t, dir } = useLanguage();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { data: memberships, refetch: refetchMemberships } = useDomainMemberships();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<DomainPermission[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter non-admin profiles
  const employeeProfiles = profiles.filter(p => p.role === 'employee');
  
  const filteredProfiles = employeeProfiles.filter(profile =>
    profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load permissions when a profile is selected
  useEffect(() => {
    if (selectedProfile && domains.length > 0) {
      const profileMemberships = memberships.filter(m => m.profile_id === selectedProfile);
      
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

  const handleOpenPermissions = (profileId: string) => {
    setSelectedProfile(profileId);
    setIsDialogOpen(true);
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

  const handleSavePermissions = async () => {
    if (!selectedProfile) return;
    
    setIsSaving(true);
    try {
      // Delete existing memberships for this profile
      const { error: deleteError } = await supabase
        .from('domain_memberships')
        .delete()
        .eq('profile_id', selectedProfile);

      if (deleteError) throw deleteError;

      // Insert new memberships
      const newMemberships = permissions
        .filter(p => p.can_view)
        .map(p => ({
          profile_id: selectedProfile,
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
      toast({ title: t('common.success'), description: 'تم حفظ الصلاحيات بنجاح' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({ 
        title: t('common.error'), 
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

  const selectedProfileData = profiles.find(p => p.id === selectedProfile);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <UserCog className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">إدارة صلاحيات الموظفين</h1>
          <p className="text-muted-foreground">تحديد الدومينات والشبكات التي يمكن لكل موظف الوصول إليها</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="البحث عن موظف..."
          className="ps-10"
        />
      </div>

      {/* Employees List */}
      <div className="grid gap-4">
        {profilesLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              جاري التحميل...
            </CardContent>
          </Card>
        ) : filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لا يوجد موظفين
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                قائمة الموظفين ({filteredProfiles.length})
              </CardTitle>
              <CardDescription>
                اضغط على "تعديل الصلاحيات" لتحديد الدومينات المتاحة لكل موظف
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>الدومينات المتاحة</TableHead>
                    <TableHead className="text-end">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const domainCount = getProfileDomainCount(profile.id);
                    const profileDomains = getProfileDomains(profile.id);
                    
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                        <TableCell>{profile.department || 'IT'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {domainCount === 0 ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                لا يوجد
                              </Badge>
                            ) : (
                              profileDomains.slice(0, 3).map((d, i) => (
                                <Badge 
                                  key={i} 
                                  variant="secondary"
                                  className={cn(
                                    d.can_edit ? 'bg-primary/10 text-primary' : ''
                                  )}
                                >
                                  {d.name}
                                  {d.can_edit && <Pencil className="w-3 h-3 ms-1" />}
                                </Badge>
                              ))
                            )}
                            {profileDomains.length > 3 && (
                              <Badge variant="outline">+{profileDomains.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPermissions(profile.id)}
                          >
                            <Shield className="w-4 h-4 me-2" />
                            تعديل الصلاحيات
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Permissions Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              صلاحيات الموظف: {selectedProfileData?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              حدد الدومينات التي يمكن للموظف الوصول إليها. صلاحية "التعديل" تتيح له إضافة وتعديل السيرفرات والمهام.
            </p>

            {domainsLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                جاري التحميل...
              </div>
            ) : domains.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                لا يوجد دومينات. قم بإضافة دومين أولاً من صفحة الشبكات.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الدومين</TableHead>
                      <TableHead className="text-center w-32">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-4 h-4" />
                          عرض
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-32">
                        <div className="flex items-center justify-center gap-1">
                          <Pencil className="w-4 h-4" />
                          تعديل
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

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSavePermissions} disabled={isSaving}>
                <Save className="w-4 h-4 me-2" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePermissions;