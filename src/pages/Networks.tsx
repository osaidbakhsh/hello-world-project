import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNetworks, useServers } from '@/hooks/useLocalStorage';
import { Network } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Network as NetworkIcon, Server, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Networks: React.FC = () => {
  const { t, dir } = useLanguage();
  const [networks, setNetworks] = useNetworks();
  const [servers] = useServers();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  
  const [formData, setFormData] = useState<Partial<Network>>({
    name: '',
    domain: '',
    ipRange: '',
    description: '',
  });

  const filteredNetworks = networks.filter((network) =>
    network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    network.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!formData.name || !formData.domain) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    
    if (editingNetwork) {
      setNetworks(networks.map((n) =>
        n.id === editingNetwork.id
          ? { ...n, ...formData } as Network
          : n
      ));
      toast({ title: t('common.success'), description: 'Network updated' });
    } else {
      const newNetwork: Network = {
        id: crypto.randomUUID(),
        name: formData.name || '',
        domain: formData.domain || '',
        ipRange: formData.ipRange || '',
        description: formData.description || '',
        createdAt: now,
      };
      setNetworks([...networks, newNetwork]);
      toast({ title: t('common.success'), description: 'Network added' });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (network: Network) => {
    setEditingNetwork(network);
    setFormData(network);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setNetworks(networks.filter((n) => n.id !== id));
    toast({ title: t('common.success'), description: 'Network deleted' });
  };

  const resetForm = () => {
    setEditingNetwork(null);
    setFormData({
      name: '',
      domain: '',
      ipRange: '',
      description: '',
    });
  };

  const getServerCount = (networkId: string) => {
    return servers.filter((s) => s.networkId === networkId).length;
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('nav.networks')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 me-2" />
              Add Network
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingNetwork ? t('common.edit') : 'Add Network'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Network Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Office Network"
                />
              </div>
              <div className="space-y-2">
                <Label>Domain *</Label>
                <Input
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="os1.com"
                />
              </div>
              <div className="space-y-2">
                <Label>IP Range</Label>
                <Input
                  value={formData.ipRange}
                  onChange={(e) => setFormData({ ...formData, ipRange: e.target.value })}
                  placeholder="192.168.1.0/24"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
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

      {/* Networks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNetworks.length > 0 ? (
          filteredNetworks.map((network) => {
            const serverCount = getServerCount(network.id);
            
            return (
              <Card key={network.id} className="card-hover stagger-item overflow-hidden">
                <div className="h-2 stat-primary" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <NetworkIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{network.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          {network.domain}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {network.ipRange && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">IP Range: </span>
                      <code className="bg-secondary px-2 py-1 rounded">{network.ipRange}</code>
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
                      {serverCount} {t('nav.servers')}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(network)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(network.id)}
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
              Add your first network to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Networks;
