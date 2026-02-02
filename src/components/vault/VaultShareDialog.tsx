import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibleEmployees } from '@/hooks/useVisibleEmployees';
import { useVaultPermissions, useVaultMutations, type VaultItem } from '@/hooks/useVaultData';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Share2, UserX, Loader2, Eye, Key } from 'lucide-react';

interface VaultShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VaultItem;
}

const VaultShareDialog: React.FC<VaultShareDialogProps> = ({
  open,
  onOpenChange,
  item,
}) => {
  const { t, dir } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: visibleEmployees, isLoading: employeesLoading } = useVisibleEmployees();
  const { data: permissions, isLoading: permissionsLoading } = useVaultPermissions(item.id);
  const { shareItem, revokeShare } = useVaultMutations();

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [permissionLevel, setPermissionLevel] = useState<'view_metadata' | 'view_secret'>('view_metadata');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out already shared users (owner is already excluded by RPC)
  const availableProfiles = visibleEmployees?.filter(p => {
    if (permissions?.some(perm => perm.profile_id === p.id)) return false;
    return true;
  }) || [];

  const handleShare = async () => {
    if (!selectedProfileId) {
      toast({
        title: t('common.error'),
        description: t('vault.selectEmployee'),
        variant: 'destructive',
      });
      return;
    }

    if (selectedProfileId === profile?.id) {
      toast({
        title: t('common.error'),
        description: t('vault.cannotShareWithSelf'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await shareItem.mutateAsync({
        vaultItemId: item.id,
        profileId: selectedProfileId,
        permissionLevel,
      });
      
      toast({
        title: t('common.success'),
        description: t('vault.shareCreated'),
      });
      
      setSelectedProfileId('');
      setPermissionLevel('view_metadata');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to share',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (profileId: string) => {
    if (!confirm(t('common.confirm'))) return;
    
    try {
      await revokeShare.mutateAsync({
        vaultItemId: item.id,
        profileId,
      });
      
      toast({
        title: t('common.success'),
        description: t('vault.shareRevoked'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to revoke',
        variant: 'destructive',
      });
    }
  };

  const getProfileName = (profileId: string) => {
    return visibleEmployees?.find(p => p.id === profileId)?.full_name || t('common.unknown');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('vault.share')} - {item.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new share */}
          <div className="space-y-3">
            <Label>{t('vault.shareWith')}</Label>
            {employeesLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableProfiles.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-2">
                {t('vault.noEmployeesAvailable')}
              </div>
            ) : (
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('vault.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}{p.email ? ` (${p.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Label>{t('vault.permissionLevel')}</Label>
            <Select 
              value={permissionLevel} 
              onValueChange={(v) => setPermissionLevel(v as 'view_metadata' | 'view_secret')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view_metadata">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t('vault.viewMetadataOnly')}
                  </div>
                </SelectItem>
                <SelectItem value="view_secret">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {t('vault.viewSecret')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={handleShare} 
              disabled={isSubmitting || !selectedProfileId}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('vault.share')}
            </Button>
          </div>

          <Separator />

          {/* Current shares */}
          <div className="space-y-2">
            <Label>{t('vault.currentShares')}</Label>
            {permissionsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : permissions && permissions.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div 
                      key={perm.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getProfileName(perm.profile_id)}
                        </span>
                        <Badge variant={perm.permission_level === 'view_secret' ? 'default' : 'secondary'}>
                          {perm.permission_level === 'view_secret' 
                            ? t('vault.viewSecret') 
                            : t('vault.viewMetadataOnly')}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevoke(perm.profile_id)}
                        title={t('vault.revokeAccess')}
                      >
                        <UserX className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('vault.noShares')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VaultShareDialog;
