import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLicenses, useServers } from '@/hooks/useLocalStorage';
import { License } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, KeyRound, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Licenses: React.FC = () => {
  const { t, dir } = useLanguage();
  const [licenses, setLicenses] = useLicenses();
  const [servers] = useServers();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  
  const [formData, setFormData] = useState<Partial<License>>({
    name: '',
    product: '',
    licenseKey: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    serverId: '',
    cost: 0,
    currency: 'SAR',
    vendor: '',
    notes: '',
  });

  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const getLicenseStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    if (expiry < now) return 'expired';
    if (expiry.getTime() - now.getTime() <= thirtyDays) return 'expiring-soon';
    return 'active';
  };

  const getDaysLeft = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredLicenses = licenses.filter((license) => {
    const matchesSearch =
      license.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getLicenseStatus(license.expiryDate);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.expiryDate) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    
    if (editingLicense) {
      setLicenses(licenses.map((l) =>
        l.id === editingLicense.id
          ? { ...l, ...formData } as License
          : l
      ));
      toast({ title: t('common.success'), description: 'License updated' });
    } else {
      const newLicense: License = {
        id: crypto.randomUUID(),
        name: formData.name || '',
        product: formData.product || '',
        licenseKey: formData.licenseKey || '',
        startDate: formData.startDate || now,
        expiryDate: formData.expiryDate || '',
        serverId: formData.serverId,
        cost: formData.cost || 0,
        currency: formData.currency || 'SAR',
        vendor: formData.vendor || '',
        notes: formData.notes,
        createdAt: now,
      };
      setLicenses([...licenses, newLicense]);
      toast({ title: t('common.success'), description: 'License added' });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    setFormData(license);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setLicenses(licenses.filter((l) => l.id !== id));
    toast({ title: t('common.success'), description: 'License deleted' });
  };

  const resetForm = () => {
    setEditingLicense(null);
    setFormData({
      name: '',
      product: '',
      licenseKey: '',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      serverId: '',
      cost: 0,
      currency: 'SAR',
      vendor: '',
      notes: '',
    });
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
  const stats = {
    total: licenses.length,
    active: licenses.filter((l) => getLicenseStatus(l.expiryDate) === 'active').length,
    expiringSoon: licenses.filter((l) => getLicenseStatus(l.expiryDate) === 'expiring-soon').length,
    expired: licenses.filter((l) => getLicenseStatus(l.expiryDate) === 'expired').length,
  };

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
                  <Label>{t('licenses.product')}</Label>
                  <Input
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('licenses.key')}</Label>
                <Input
                  value={formData.licenseKey}
                  onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('licenses.startDate')}</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('licenses.expiryDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('licenses.vendor')}</Label>
                  <Input
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('licenses.server')}</Label>
                  <Select
                    value={formData.serverId || ''}
                    onValueChange={(value) => setFormData({ ...formData, serverId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button onClick={handleSubmit}>
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                  <TableHead>{t('licenses.product')}</TableHead>
                  <TableHead>{t('licenses.vendor')}</TableHead>
                  <TableHead>{t('licenses.expiryDate')}</TableHead>
                  <TableHead>{t('licenses.daysLeft')}</TableHead>
                  <TableHead>{t('licenses.cost')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLicenses.length > 0 ? (
                  filteredLicenses.map((license) => {
                    const status = getLicenseStatus(license.expiryDate);
                    const daysLeft = getDaysLeft(license.expiryDate);
                    const statusBadge = getStatusBadge(status);
                    const StatusIcon = statusBadge.icon;

                    return (
                      <TableRow key={license.id} className="stagger-item">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <KeyRound className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{license.name}</p>
                              {license.serverId && (
                                <p className="text-xs text-muted-foreground">
                                  {servers.find((s) => s.id === license.serverId)?.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{license.product}</TableCell>
                        <TableCell>{license.vendor}</TableCell>
                        <TableCell>
                          {new Date(license.expiryDate).toLocaleDateString(
                            dir === 'rtl' ? 'ar-SA' : 'en-US'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', statusBadge.class)}>
                            <StatusIcon className="w-3 h-3" />
                            {daysLeft > 0 ? `${daysLeft} ${t('common.days')}` : statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {license.cost > 0 ? `${license.cost} ${license.currency}` : '-'}
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
                      <KeyRound className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-muted-foreground">{t('common.noData')}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Licenses;
