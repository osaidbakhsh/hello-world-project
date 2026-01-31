import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWebsiteApplications, useDomains } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { 
  Globe, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Loader2,
  Server,
  Mail,
  FileText,
  Database,
  Shield,
  Cloud,
  Monitor,
  Layers,
  Link
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface WebAppForm {
  name: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  domain_id: string;
  is_active: boolean;
}

const initialFormData: WebAppForm = {
  name: '',
  url: '',
  description: '',
  icon: 'globe',
  category: '',
  domain_id: '',
  is_active: true,
};

const iconOptions = [
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'server', label: 'Server', icon: Server },
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'file', label: 'File', icon: FileText },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'cloud', label: 'Cloud', icon: Cloud },
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'layers', label: 'Layers', icon: Layers },
];

const categoryOptions = [
  { value: 'infrastructure', label: 'البنية التحتية' },
  { value: 'security', label: 'الأمان' },
  { value: 'monitoring', label: 'المراقبة' },
  { value: 'communication', label: 'التواصل' },
  { value: 'development', label: 'التطوير' },
  { value: 'other', label: 'أخرى' },
];

const WebApps: React.FC = () => {
  const { t, dir } = useLanguage();
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const { data: apps, isLoading, refetch } = useWebsiteApplications();
  const { data: domains } = useDomains();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [deletingApp, setDeletingApp] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WebAppForm>(initialFormData);

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!formData.name || !formData.url) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingApp) {
        const { error } = await supabase
          .from('website_applications')
          .update({
            name: formData.name,
            url: formData.url,
            description: formData.description || null,
            icon: formData.icon,
            category: formData.category || null,
            domain_id: formData.domain_id || null,
            is_active: formData.is_active,
          })
          .eq('id', editingApp.id);

        if (error) throw error;
        toast({ title: 'تم بنجاح', description: 'تم تحديث التطبيق' });
      } else {
        const { error } = await supabase
          .from('website_applications')
          .insert({
            name: formData.name,
            url: formData.url,
            description: formData.description || null,
            icon: formData.icon,
            category: formData.category || null,
            domain_id: formData.domain_id || null,
            is_active: formData.is_active,
            created_by: profile?.id || null,
          });

        if (error) throw error;
        toast({ title: 'تم بنجاح', description: 'تم إضافة التطبيق' });
      }

      resetForm();
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في حفظ التطبيق',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (app: any) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      url: app.url,
      description: app.description || '',
      icon: app.icon || 'globe',
      category: app.category || '',
      domain_id: app.domain_id || '',
      is_active: app.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingApp) return;

    try {
      const { error } = await supabase
        .from('website_applications')
        .delete()
        .eq('id', deletingApp.id);

      if (error) throw error;
      toast({ title: 'تم بنجاح', description: 'تم حذف التطبيق' });
      refetch();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في حذف التطبيق',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteOpen(false);
      setDeletingApp(null);
    }
  };

  const resetForm = () => {
    setEditingApp(null);
    setFormData(initialFormData);
  };

  const getIcon = (iconName: string): React.ElementType => {
    const found = iconOptions.find((i) => i.value === iconName);
    return found?.icon || Globe;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-lg">ليس لديك صلاحية للوصول لهذه الصفحة</p>
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
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('webApps.title')}</h1>
            <p className="text-muted-foreground">إدارة روابط تطبيقات الويب</p>
          </div>
        </div>

        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t('webApps.add')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apps.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي التطبيقات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Link className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apps.filter((a) => a.is_active).length}</p>
                <p className="text-sm text-muted-foreground">نشط</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث عن تطبيق..."
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Apps Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التطبيق</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>النطاق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">لا توجد تطبيقات</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app) => {
                    const IconComponent = getIcon(app.icon || 'globe');
                    const domain = domains.find((d) => d.id === app.domain_id);

                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <IconComponent className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{app.name}</p>
                              {app.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {app.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{app.url}</span>
                          </a>
                        </TableCell>
                        <TableCell>
                          {app.category && (
                            <Badge variant="secondary">{app.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {domain ? (
                            <Badge variant="outline">{domain.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">عام</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={app.is_active ? 'default' : 'secondary'}>
                            {app.is_active ? 'نشط' : 'معطل'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(app)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingApp(app);
                                setIsDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingApp ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingApp ? 'تعديل التطبيق' : 'إضافة تطبيق'}
            </DialogTitle>
            <DialogDescription>
              أضف رابط لتطبيق ويب للوصول السريع من لوحة التحكم
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم التطبيق *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: Jira"
                />
              </div>
              <div className="space-y-2">
                <Label>الأيقونة</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>الرابط (URL) *</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر للتطبيق"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>النطاق</Label>
                <Select
                  value={formData.domain_id}
                  onValueChange={(value) => setFormData({ ...formData, domain_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="عام للجميع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">عام للجميع</SelectItem>
                    {domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label>مفعّل</Label>
                <p className="text-xs text-muted-foreground">إظهار التطبيق في لوحة التحكم</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {editingApp ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التطبيق "{deletingApp?.name}" نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WebApps;
