import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDatacenters, useClusters, useClusterNodes, useVMs } from '@/hooks/useDatacenter';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Database, MoreHorizontal, Pencil, Trash2, MapPin, Zap, Thermometer, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Datacenter } from '@/types/datacenter';

interface Props {
  domainId: string;
}

interface DatacenterFormData {
  name: string;
  location: string;
  notes: string;
  power_capacity_kw: number | null;
  cooling_type: string;
  tier_level: string;
  rack_count: number | null;
  floor_space_sqm: number | null;
  certifications: string[];
  contact_person: string;
  emergency_contact: string;
}

const defaultFormData: DatacenterFormData = {
  name: '',
  location: '',
  notes: '',
  power_capacity_kw: null,
  cooling_type: '',
  tier_level: '',
  rack_count: null,
  floor_space_sqm: null,
  certifications: [],
  contact_person: '',
  emergency_contact: '',
};

const DatacenterTable: React.FC<Props> = ({ domainId }) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: datacenters, isLoading } = useDatacenters(domainId);
  const { data: clusters } = useClusters(domainId);
  const { data: nodes } = useClusterNodes(domainId);
  const { data: vms } = useVMs(domainId);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDC, setEditingDC] = useState<Datacenter | null>(null);
  const [dcToDelete, setDcToDelete] = useState<Datacenter | null>(null);
  const [formData, setFormData] = useState<DatacenterFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get counts for each datacenter
  const getDatacenterStats = (dcId: string) => {
    const dcClusters = clusters?.filter(c => c.datacenter_id === dcId) || [];
    const clusterIds = dcClusters.map(c => c.id);
    const dcNodes = nodes?.filter(n => clusterIds.includes(n.cluster_id)) || [];
    const dcVMs = vms?.filter(v => clusterIds.includes(v.cluster_id)) || [];
    return {
      clustersCount: dcClusters.length,
      nodesCount: dcNodes.length,
      vmsCount: dcVMs.length,
    };
  };

  const filteredDatacenters = datacenters?.filter((dc) =>
    dc.name.toLowerCase().includes(search.toLowerCase()) ||
    dc.location?.toLowerCase().includes(search.toLowerCase())
  );

  const coolingTypes = [
    { value: 'air', label: language === 'ar' ? 'تبريد هوائي' : 'Air Cooling' },
    { value: 'water', label: language === 'ar' ? 'تبريد مائي' : 'Water Cooling' },
    { value: 'liquid', label: language === 'ar' ? 'تبريد سائل' : 'Liquid Cooling' },
    { value: 'hybrid', label: language === 'ar' ? 'هجين' : 'Hybrid' },
  ];

  const tierLevels = [
    { value: 'tier1', label: 'Tier 1 - Basic' },
    { value: 'tier2', label: 'Tier 2 - Redundant' },
    { value: 'tier3', label: 'Tier 3 - Concurrently Maintainable' },
    { value: 'tier4', label: 'Tier 4 - Fault Tolerant' },
  ];

  const openEditForm = (dc: Datacenter) => {
    setEditingDC(dc);
    setFormData({
      name: dc.name,
      location: dc.location || '',
      notes: dc.notes || '',
      power_capacity_kw: (dc as any).power_capacity_kw || null,
      cooling_type: (dc as any).cooling_type || '',
      tier_level: (dc as any).tier_level || '',
      rack_count: (dc as any).rack_count || null,
      floor_space_sqm: (dc as any).floor_space_sqm || null,
      certifications: (dc as any).certifications || [],
      contact_person: (dc as any).contact_person || '',
      emergency_contact: (dc as any).emergency_contact || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الاسم مطلوب' : 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const dcData = {
        domain_id: domainId,
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        notes: formData.notes.trim() || null,
        power_capacity_kw: formData.power_capacity_kw,
        cooling_type: formData.cooling_type || null,
        tier_level: formData.tier_level || null,
        rack_count: formData.rack_count,
        floor_space_sqm: formData.floor_space_sqm,
        certifications: formData.certifications.length > 0 ? formData.certifications : null,
        contact_person: formData.contact_person.trim() || null,
        emergency_contact: formData.emergency_contact.trim() || null,
      };

      if (editingDC) {
        const { error } = await supabase
          .from('datacenters')
          .update(dcData)
          .eq('id', editingDC.id);

        if (error) throw error;
        toast({
          title: language === 'ar' ? 'تم بنجاح' : 'Success',
          description: language === 'ar' ? 'تم تحديث مركز البيانات بنجاح' : 'Datacenter updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('datacenters')
          .insert([dcData]);

        if (error) throw error;
        toast({
          title: language === 'ar' ? 'تم بنجاح' : 'Success',
          description: language === 'ar' ? 'تم إنشاء مركز البيانات بنجاح' : 'Datacenter created successfully',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['datacenters'] });
      closeForm();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!dcToDelete) return;

    try {
      const { error } = await supabase
        .from('datacenters')
        .delete()
        .eq('id', dcToDelete.id);

      if (error) throw error;
      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم حذف مركز البيانات' : 'Datacenter deleted',
      });
      queryClient.invalidateQueries({ queryKey: ['datacenters'] });
      setDcToDelete(null);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDC(null);
    setFormData(defaultFormData);
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'tier4': return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'tier3': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'tier2': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          {language === 'ar' ? 'مراكز البيانات' : 'Datacenters'} ({filteredDatacenters?.length || 0})
        </CardTitle>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 me-2" />
          {language === 'ar' ? 'إضافة مركز بيانات' : 'Add Datacenter'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                <TableHead>{language === 'ar' ? 'المستوى' : 'Tier'}</TableHead>
                <TableHead>{language === 'ar' ? 'الكلسترات' : 'Clusters'}</TableHead>
                <TableHead>{language === 'ar' ? 'النودات' : 'Nodes'}</TableHead>
                <TableHead>{language === 'ar' ? 'الأجهزة الافتراضية' : 'VMs'}</TableHead>
                <TableHead className="w-[70px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDatacenters?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد مراكز بيانات' : 'No datacenters found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDatacenters?.map((dc) => {
                  const stats = getDatacenterStats(dc.id);
                  return (
                    <TableRow key={dc.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          {dc.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {dc.location ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {dc.location}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {(dc as any).tier_level ? (
                          <Badge className={getTierBadgeColor((dc as any).tier_level)}>
                            {(dc as any).tier_level?.toUpperCase()}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{stats.clustersCount}</TableCell>
                      <TableCell>{stats.nodesCount}</TableCell>
                      <TableCell>{stats.vmsCount}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                            <DropdownMenuItem onClick={() => openEditForm(dc)}>
                              <Pencil className="w-4 h-4 me-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDcToDelete(dc)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 me-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
<Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editingDC 
                ? (language === 'ar' ? 'تعديل مركز البيانات' : 'Edit Datacenter')
                : (language === 'ar' ? 'إضافة مركز بيانات' : 'Add Datacenter')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label>{t('common.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'مركز البيانات الرئيسي' : 'Main Datacenter'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={language === 'ar' ? 'الرياض، السعودية' : 'Riyadh, Saudi Arabia'}
              />
            </div>

            {/* Technical Specs */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {language === 'ar' ? 'سعة الطاقة (كيلوواط)' : 'Power Capacity (kW)'}
              </Label>
              <Input
                type="number"
                value={formData.power_capacity_kw || ''}
                onChange={(e) => setFormData({ ...formData, power_capacity_kw: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="500"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                {language === 'ar' ? 'نوع التبريد' : 'Cooling Type'}
              </Label>
              <Select value={formData.cooling_type} onValueChange={(v) => setFormData({ ...formData, cooling_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {coolingTypes.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'مستوى المركز' : 'Tier Level'}</Label>
              <Select value={formData.tier_level} onValueChange={(v) => setFormData({ ...formData, tier_level: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {tierLevels.map((tl) => (
                    <SelectItem key={tl.value} value={tl.value}>{tl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'عدد الخزائن' : 'Rack Count'}</Label>
              <Input
                type="number"
                value={formData.rack_count || ''}
                onChange={(e) => setFormData({ ...formData, rack_count: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المساحة (م²)' : 'Floor Space (sqm)'}</Label>
              <Input
                type="number"
                value={formData.floor_space_sqm || ''}
                onChange={(e) => setFormData({ ...formData, floor_space_sqm: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم الطوارئ' : 'Emergency Contact'}</Label>
              <Input
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="+966 5XXXXXXXX"
              />
            </div>

            {/* Notes - Full width */}
            <div className="space-y-2 col-span-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!dcToDelete} onOpenChange={(open) => !open && setDcToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف مركز البيانات "${dcToDelete?.name}"؟ سيؤدي هذا إلى فصل جميع الكلسترات المرتبطة.`
                : `Are you sure you want to delete datacenter "${dcToDelete?.name}"? This will unlink all associated clusters.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DatacenterTable;
