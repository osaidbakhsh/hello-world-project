import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDomains, useNetworks as useSupabaseNetworks, useServers } from '@/hooks/useSupabaseData';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Network as NetworkIcon, Server, Globe, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DomainForm {
  name: string;
  description: string;
}

interface NetworkForm {
  name: string;
  domain_id: string;
  subnet: string;
  gateway: string;
  dns_servers: string;
  description: string;
}

const Networks: React.FC = () => {
  const { t, dir } = useLanguage();
  const { data: domains, refetch: refetchDomains, isLoading: domainsLoading } = useDomains();
  const { data: networks, refetch: refetchNetworks } = useSupabaseNetworks();
  const { data: servers } = useServers();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('domains');
  
  // Domain dialog state
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<any | null>(null);
  const [domainForm, setDomainForm] = useState<DomainForm>({ name: '', description: '' });
  
  // Network dialog state
  const [isNetworkDialogOpen, setIsNetworkDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<any | null>(null);
  const [networkForm, setNetworkForm] = useState<NetworkForm>({
    name: '',
    domain_id: '',
    subnet: '',
    gateway: '',
    dns_servers: '',
    description: '',
  });

  const filteredDomains = domains.filter((domain) =>
    domain.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNetworks = networks.filter((network) =>
    network.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Domain CRUD operations
  const handleDomainSubmit = async () => {
    if (!domainForm.name) {
      toast({ title: t('common.error'), description: 'اسم الدومين مطلوب', variant: 'destructive' });
      return;
    }

    try {
      if (editingDomain) {
        const { error } = await supabase
          .from('domains')
          .update({ name: domainForm.name, description: domainForm.description })
          .eq('id', editingDomain.id);
        
        if (error) throw error;
        toast({ title: t('common.success'), description: 'تم تحديث الدومين' });
      } else {
        const { error } = await supabase
          .from('domains')
          .insert({ name: domainForm.name, description: domainForm.description });
        
        if (error) throw error;
        toast({ title: t('common.success'), description: 'تم إضافة الدومين' });
      }
      
      resetDomainForm();
      setIsDomainDialogOpen(false);
      refetchDomains();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleEditDomain = (domain: any) => {
    setEditingDomain(domain);
    setDomainForm({ name: domain.name, description: domain.description || '' });
    setIsDomainDialogOpen(true);
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      const { error } = await supabase.from('domains').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'تم حذف الدومين' });
      refetchDomains();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const resetDomainForm = () => {
    setEditingDomain(null);
    setDomainForm({ name: '', description: '' });
  };

  // Network CRUD operations
  const handleNetworkSubmit = async () => {
    if (!networkForm.name || !networkForm.domain_id) {
      toast({ title: t('common.error'), description: 'اسم الشبكة والدومين مطلوبين', variant: 'destructive' });
      return;
    }

    try {
      const dnsServers = networkForm.dns_servers
        ? networkForm.dns_servers.split(',').map(s => s.trim())
        : null;

      if (editingNetwork) {
        const { error } = await supabase
          .from('networks')
          .update({
            name: networkForm.name,
            domain_id: networkForm.domain_id,
            subnet: networkForm.subnet || null,
            gateway: networkForm.gateway || null,
            dns_servers: dnsServers,
            description: networkForm.description || null,
          })
          .eq('id', editingNetwork.id);
        
        if (error) throw error;
        toast({ title: t('common.success'), description: 'تم تحديث الشبكة' });
      } else {
        const { error } = await supabase
          .from('networks')
          .insert({
            name: networkForm.name,
            domain_id: networkForm.domain_id,
            subnet: networkForm.subnet || null,
            gateway: networkForm.gateway || null,
            dns_servers: dnsServers,
            description: networkForm.description || null,
          });
        
        if (error) throw error;
        toast({ title: t('common.success'), description: 'تم إضافة الشبكة' });
      }
      
      resetNetworkForm();
      setIsNetworkDialogOpen(false);
      refetchNetworks();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleEditNetwork = (network: any) => {
    setEditingNetwork(network);
    setNetworkForm({
      name: network.name,
      domain_id: network.domain_id,
      subnet: network.subnet || '',
      gateway: network.gateway || '',
      dns_servers: network.dns_servers?.join(', ') || '',
      description: network.description || '',
    });
    setIsNetworkDialogOpen(true);
  };

  const handleDeleteNetwork = async (id: string) => {
    try {
      const { error } = await supabase.from('networks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'تم حذف الشبكة' });
      refetchNetworks();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const resetNetworkForm = () => {
    setEditingNetwork(null);
    setNetworkForm({
      name: '',
      domain_id: '',
      subnet: '',
      gateway: '',
      dns_servers: '',
      description: '',
    });
  };

  const getNetworkCount = (domainId: string) => {
    return networks.filter((n) => n.domain_id === domainId).length;
  };

  const getServerCount = (networkId: string) => {
    return servers.filter((s) => s.network_id === networkId).length;
  };

  const getDomainName = (domainId: string) => {
    return domains.find((d) => d.id === domainId)?.name || 'غير محدد';
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('nav.networks')}</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="domains" className="gap-2">
              <Building2 className="w-4 h-4" />
              الدومينات ({domains.length})
            </TabsTrigger>
            <TabsTrigger value="networks" className="gap-2">
              <NetworkIcon className="w-4 h-4" />
              الشبكات ({networks.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'domains' ? (
            <Dialog open={isDomainDialogOpen} onOpenChange={(open) => {
              setIsDomainDialogOpen(open);
              if (!open) resetDomainForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 me-2" />
                  إضافة دومين
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingDomain ? t('common.edit') : 'إضافة دومين جديد'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>اسم الدومين *</Label>
                    <Input
                      value={domainForm.name}
                      onChange={(e) => setDomainForm({ ...domainForm, name: e.target.value })}
                      placeholder="example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={domainForm.description}
                      onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })}
                      rows={3}
                      placeholder="وصف الدومين..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDomainDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleDomainSubmit}>
                    {t('common.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isNetworkDialogOpen} onOpenChange={(open) => {
              setIsNetworkDialogOpen(open);
              if (!open) resetNetworkForm();
            }}>
              <DialogTrigger asChild>
                <Button disabled={domains.length === 0}>
                  <Plus className="w-4 h-4 me-2" />
                  إضافة شبكة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingNetwork ? t('common.edit') : 'إضافة شبكة جديدة'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>اسم الشبكة *</Label>
                    <Input
                      value={networkForm.name}
                      onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
                      placeholder="Main Office Network"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الدومين *</Label>
                    <Select
                      value={networkForm.domain_id}
                      onValueChange={(value) => setNetworkForm({ ...networkForm, domain_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدومين" />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subnet</Label>
                      <Input
                        value={networkForm.subnet}
                        onChange={(e) => setNetworkForm({ ...networkForm, subnet: e.target.value })}
                        placeholder="192.168.1.0/24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gateway</Label>
                      <Input
                        value={networkForm.gateway}
                        onChange={(e) => setNetworkForm({ ...networkForm, gateway: e.target.value })}
                        placeholder="192.168.1.1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>DNS Servers (مفصولة بفواصل)</Label>
                    <Input
                      value={networkForm.dns_servers}
                      onChange={(e) => setNetworkForm({ ...networkForm, dns_servers: e.target.value })}
                      placeholder="8.8.8.8, 8.8.4.4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={networkForm.description}
                      onChange={(e) => setNetworkForm({ ...networkForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsNetworkDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleNetworkSubmit}>
                    {t('common.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md mt-4">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="ps-10"
          />
        </div>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDomains.length > 0 ? (
              filteredDomains.map((domain) => {
                const networkCount = getNetworkCount(domain.id);
                
                return (
                  <Card key={domain.id} className="card-hover stagger-item overflow-hidden">
                    <div className="h-2 bg-primary" />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{domain.name}</CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {domain.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {domain.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Badge variant="outline" className="gap-1">
                          <NetworkIcon className="w-3 h-3" />
                          {networkCount} شبكات
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditDomain(domain)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeleteDomain(domain.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <Building2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  قم بإضافة دومين للبدء
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Networks Tab */}
        <TabsContent value="networks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNetworks.length > 0 ? (
              filteredNetworks.map((network) => {
                const serverCount = getServerCount(network.id);
                
                return (
                  <Card key={network.id} className="card-hover stagger-item overflow-hidden">
                    <div className="h-2 bg-accent" />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                            <NetworkIcon className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{network.name}</CardTitle>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Globe className="w-3 h-3" />
                              {getDomainName(network.domain_id)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {network.subnet && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Subnet: </span>
                          <code className="bg-secondary px-2 py-1 rounded">{network.subnet}</code>
                        </div>
                      )}
                      
                      {network.gateway && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Gateway: </span>
                          <code className="bg-secondary px-2 py-1 rounded">{network.gateway}</code>
                        </div>
                      )}
                      
                      {network.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {network.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Badge variant="outline" className="gap-1">
                          <Server className="w-3 h-3" />
                          {serverCount} سيرفر
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditNetwork(network)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeleteNetwork(network.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <NetworkIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {domains.length === 0 
                    ? 'قم بإضافة دومين أولاً ثم أضف شبكات'
                    : 'قم بإضافة شبكة للبدء'}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Networks;
