import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVaultItems, useVaultSharedWithMe, useVaultMutations, type VaultItem } from '@/hooks/useVaultData';
import { useProfiles } from '@/hooks/useSupabaseData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Lock, Shield, AlertTriangle } from 'lucide-react';
import VaultItemCard from '@/components/vault/VaultItemCard';
import VaultItemForm from '@/components/vault/VaultItemForm';
import VaultShareDialog from '@/components/vault/VaultShareDialog';
import { useToast } from '@/hooks/use-toast';

const itemTypes = ['all', 'server', 'website', 'network_device', 'application', 'api_key', 'other'];

const Vault: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: vaultItems, isLoading } = useVaultItems();
  const { data: sharedWithMe, isLoading: sharedLoading } = useVaultSharedWithMe();
  const { data: profiles } = useProfiles();
  const { deleteItem } = useVaultMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [sharingItem, setSharingItem] = useState<VaultItem | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'shared'>('my');

  // Filter my items
  const filteredMyItems = useMemo(() => {
    return (vaultItems || []).filter((item) => {
      // Only show items I own
      if (item.owner_id !== profile?.id) return false;
      
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.url || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [vaultItems, searchQuery, typeFilter, profile?.id]);

  // Filter shared items
  const filteredSharedItems = useMemo(() => {
    return (sharedWithMe || []).filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.url || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [sharedWithMe, searchQuery, typeFilter]);

  const getOwnerName = (ownerId: string) => {
    return profiles?.find((p) => p.id === ownerId)?.full_name || t('vault.owner');
  };

  // Owner-only operations
  const canEditItem = (item: VaultItem) => {
    return item.owner_id === profile?.id;
  };

  const canRevealItem = (item: VaultItem & { _permission_level?: string }) => {
    if (item.owner_id === profile?.id) return true;
    // For shared items, check permission level
    return item._permission_level === 'view_secret';
  };

  const canShareItem = (item: VaultItem) => {
    return item.owner_id === profile?.id;
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

  const handleShare = (item: VaultItem) => {
    setSharingItem(item);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const currentItems = viewMode === 'my' ? filteredMyItems : filteredSharedItems;
  const isCurrentLoading = viewMode === 'my' ? isLoading : sharedLoading;

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

      {/* View Mode Tabs */}
<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'my' | 'shared')}>
        <div className={dir === 'rtl' ? 'flex justify-end' : 'flex justify-start'}>
          <TabsList>
            <TabsTrigger value="my" className="gap-2">
              <Lock className="h-4 w-4" />
              {t('vault.myVault')}
              {filteredMyItems.length > 0 && (
                <Badge variant="secondary" className="ms-1">{filteredMyItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-2">
              <Shield className="h-4 w-4" />
              {t('vault.sharedWithMe')}
              {filteredSharedItems.length > 0 && (
                <Badge variant="secondary" className="ms-1">{filteredSharedItems.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Filters */}
        <Card className="mt-4">
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
        <div className="flex gap-4 mt-4">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {currentItems.length} {t('common.row')}
          </Badge>
        </div>

        {/* Items Grid */}
        <TabsContent value="my" className="mt-4">
          {isCurrentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredMyItems.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyItems.map((item) => (
                <VaultItemCard
                  key={item.id}
                  item={item}
                  ownerName={getOwnerName(item.owner_id)}
                  canEdit={canEditItem(item)}
                  canReveal={canRevealItem(item)}
                  canShare={canShareItem(item)}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item)}
                  onShare={() => handleShare(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-4">
          {sharedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredSharedItems.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('vault.noShares')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSharedItems.map((item) => (
                <VaultItemCard
                  key={item.id}
                  item={item}
                  ownerName={getOwnerName(item.owner_id)}
                  canEdit={false}
                  canReveal={canRevealItem(item)}
                  canShare={false}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onShare={() => {}}
                  isShared
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      <VaultItemForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        editItem={editingItem}
        onSuccess={handleFormClose}
      />

      {/* Share Dialog */}
      {sharingItem && (
        <VaultShareDialog
          open={!!sharingItem}
          onOpenChange={(open) => !open && setSharingItem(null)}
          item={sharingItem}
        />
      )}
    </div>
  );
};

export default Vault;
