import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLicenses, useDomains, useServers, useLicenseMutations } from '@/hooks/useSupabaseData';
import type { License } from '@/types/supabase-models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, KeyRound, AlertTriangle, CheckCircle, Clock, Loader2, BarChart3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTableHeader, licenseSortOptions, applySortToData } from '@/components/DataTableHeader';
import LicenseCostDashboard from '@/components/licenses/LicenseCostDashboard';

interface LicenseFormData {
  name: string;
  vendor: string;
  license_key: string;
  purchase_date: string;
  expiry_date: string;
  domain_id: string;
  assigned_to: string;
  cost: number;
  quantity: number;
  notes: string;
}

const initialFormData: LicenseFormData = {
  name: '',
  vendor: '',
  license_key: '',
  purchase_date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  domain_id: '',
  assigned_to: '',
  cost: 0,
  quantity: 1,
  notes: '',
};

const Licenses: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { toast } = useToast();
  
  // Supabase data
  const { data: licenses, isLoading, refetch: refetchLicenses } = useLicenses();
  const { data: domains } = useDomains();
  const { data: servers } = useServers();
  const { profile } = useAuth();
  const { createLicense, updateLicense, deleteLicense } = useLicenseMutations(profile?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortValue, setSortValue] = useState<string>('expiry_date-asc');
  const [activeTab, setActiveTab] = useState<string>('list');
  
  const [formData, setFormData] = useState<LicenseFormData>(initialFormData);

  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const getLicenseStatus = (expiryDate: string | null) => {
    if (!expiryDate) return 'active';
    const expiry = new Date(expiryDate);
    if (expiry < now) return 'expired';
    if (expiry.getTime() - now.getTime() <= thirtyDays) return 'expiring-soon';
    return 'active';
  };

  const getDaysLeft = (expiryDate: string | null) => {
    if (!expiryDate) return 999;
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredLicenses = useMemo(() => {
    return licenses.filter((license) => {
      const matchesSearch =
        license.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (license.vendor || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const status = getLicenseStatus(license.expiry_date);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesDomain = domainFilter === 'all' || license.domain_id === domainFilter;
      
      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [licenses, searchQuery, statusFilter, domainFilter]);

  // Apply sorting
  const sortedLicenses = useMemo(() => {
    return applySortToData(filteredLicenses, sortValue);
  }, [filteredLicenses, sortValue]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.expiry_date) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingLicense) {
        const { error } = await updateLicense(editingLicense.id, {
          name: formData.name,
          vendor: formData.vendor,
          license_key: formData.license_key,
          purchase_date: formData.purchase_date || null,
          expiry_date: formData.expiry_date,
          domain_id: formData.domain_id || null,
          assigned_to: formData.assigned_to || null,
          cost: formData.cost,
          quantity: formData.quantity,
          notes: formData.notes || null,
        });
        if (error) throw error;
        toast({ title: t('common.success'), description: 'License updated' });
      } else {
        const { error } = await createLicense({
          name: formData.name,
          vendor: formData.vendor,
          license_key: formData.license_key,
          purchase_date: formData.purchase_date || null,
          expiry_date: formData.expiry_date,
          domain_id: formData.domain_id || null,
          assigned_to: formData.assigned_to || null,
          cost: formData.cost,
          quantity: formData.quantity,
          notes: formData.notes || null,
          status: 'active',
        });
        if (error) throw error;
        toast({ title: t('common.success'), description: 'License added' });
      }

      resetForm();
      setIsDialogOpen(false);
      refetchLicenses();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to save license',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    setFormData({
      name: license.name,
      vendor: license.vendor || '',
      license_key: license.license_key || '',
      purchase_date: license.purchase_date || '',
      expiry_date: license.expiry_date || '',
      domain_id: license.domain_id || '',
      assigned_to: license.assigned_to || '',
      cost: license.cost || 0,
      quantity: license.quantity || 1,
      notes: license.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteLicense(id);
    if (error) {
      toast({ title: t('common.error'), description: 'Failed to delete license', variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: 'License deleted' });
      refetchLicenses();
    }
  };

  const resetForm = () => {
    setEditingLicense(null);
    setFormData(initialFormData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return { class: 'badge-production', icon: AlertTriangle, label: 'Expired' };
      case 'expiring-soon':
        return { class: 'badge-testing', icon: Clock, label: 'Expiring Soon' };
      default:
        return { class: 'badge-development', icon: CheckCircle, label: 'Active' };
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: licenses.length,
    active: licenses.filter((l) => getLicenseStatus(l.expiry_date) === 'active').length,
    expiringSoon: licenses.filter((l) => getLicenseStatus(l.expiry_date) === 'expiring-soon').length,
    expired: licenses.filter((l) => getLicenseStatus(l.expiry_date) === 'expired').length,
  }), [licenses]);

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('licenses.title')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 me-2" />
              {t('licenses.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingLicense ? t('common.edit') : t('licenses.add')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('licenses.name')} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('licenses.vendor')}</Label>
                  <Input
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('licenses.key')}</Label>
                <Input
                  value={formData.license_key}
                  onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('licenses.startDate')}</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('licenses.expiryDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('licenses.cost')}</Label>
                  <Input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Select
                    value={formData.domain_id}
                    onValueChange={(value) => setFormData({ ...formData, domain_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Input
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    placeholder="Server or user"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('licenses.notes')}</Label>
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
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            {language === 'ar' ? 'القائمة' : 'List'}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            {language === 'ar' ? 'تحليل التكلفة' : 'Cost Analysis'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <LicenseCostDashboard licenses={licenses} domains={domains} />
        </TabsContent>

        <TabsContent value="list" className="mt-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{t('common.all')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">{t('common.active')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Expiring</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search')}
                className="ps-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('common.domain')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allDomains')}</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort Controls */}
          <div className="mt-4">
            <DataTableHeader
              sortOptions={licenseSortOptions}
              currentSort={sortValue}
              onSortChange={setSortValue}
            />
          </div>
        </CardContent>
      </Card>

      {/* Licenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('licenses.name')}</TableHead>
                  <TableHead>{t('licenses.vendor')}</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>{t('licenses.expiryDate')}</TableHead>
                  <TableHead>{t('licenses.daysLeft')}</TableHead>
                  <TableHead>{t('licenses.cost')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sortedLicenses.length > 0 ? (
                  sortedLicenses.map((license) => {
                    const status = getLicenseStatus(license.expiry_date);
                    const daysLeft = getDaysLeft(license.expiry_date);
                    const statusBadge = getStatusBadge(status);
                    const StatusIcon = statusBadge.icon;
                    const domain = domains.find(d => d.id === license.domain_id);

                    return (
                      <TableRow key={license.id} className="stagger-item">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <KeyRound className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{license.name}</p>
                              {license.assigned_to && (
                                <p className="text-xs text-muted-foreground">{license.assigned_to}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{license.vendor || '-'}</TableCell>
                        <TableCell>{domain?.name || '-'}</TableCell>
                        <TableCell>
                          {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString(
                            dir === 'rtl' ? 'ar-SA' : 'en-US'
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', statusBadge.class)}>
                            <StatusIcon className="w-3 h-3" />
                            {daysLeft > 0 ? `${daysLeft} ${t('common.days')}` : statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(license.cost || 0) > 0 ? `${license.cost} SAR` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(license)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(license.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <KeyRound className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No licenses found</p>
                        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                          <Plus className="w-4 h-4 me-2" />
                          Add your first license
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Licenses;