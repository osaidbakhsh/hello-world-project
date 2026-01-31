import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVaultItems, useVaultMutations, type VaultItem } from '@/hooks/useVaultData';
import { useProfiles } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Lock, Shield, AlertTriangle } from 'lucide-react';
import VaultItemCard from '@/components/vault/VaultItemCard';
import VaultItemForm from '@/components/vault/VaultItemForm';
import { useToast } from '@/hooks/use-toast';

const itemTypes = ['all', 'server', 'website', 'network_device', 'application', 'api_key', 'other'];

const Vault: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: vaultItems, isLoading } = useVaultItems();
  const { data: profiles } = useProfiles();
  const { deleteItem } = useVaultMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

  const filteredItems = useMemo(() => {
    return (vaultItems || []).filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.url || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [vaultItems, searchQuery, typeFilter]);

  const getOwnerName = (ownerId: string) => {
    return profiles?.find((p) => p.id === ownerId)?.full_name || t('vault.owner');
  };

  const canEditItem = (item: VaultItem) => {
    return isAdmin || item.owner_id === profile?.id;
  };

  const canRevealItem = (item: VaultItem) => {
    return isAdmin || item.owner_id === profile?.id;
  };

  const handleEdit = (item: VaultItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (item: VaultItem) => {
    if (!confirm(t('common.confirm'))) return;
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: t('common.success'), description: 'Credential deleted' });
    } catch (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Lock className="h-8 w-8" />
            {t('vault.title')}
          </h1>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t('vault.addCredential')}
        </Button>
      </div>

      {/* Security Warning */}
      <Alert variant="default" className="border-warning bg-warning/10">
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span>{t('vault.sensitiveData')} - {t('vault.accessLogged')}</span>
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('vault.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? t('common.all') : t(`vault.type.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex gap-4">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {filteredItems.length} {t('common.row')}
        </Badge>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <VaultItemCard
              key={item.id}
              item={item}
              ownerName={getOwnerName(item.owner_id)}
              canEdit={canEditItem(item)}
              canReveal={canRevealItem(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <VaultItemForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        editItem={editingItem}
        onSuccess={handleFormClose}
      />
    </div>
  );
};

export default Vault;
