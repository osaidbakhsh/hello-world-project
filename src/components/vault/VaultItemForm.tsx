import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useNetworks, useWebsiteApplications } from '@/hooks/useSupabaseData';
import { useVaultMutations, type VaultItem } from '@/hooks/useVaultData';
import { useToast } from '@/hooks/use-toast';
import { generatePassword, checkPasswordStrength, defaultPasswordOptions, type PasswordOptions } from '@/utils/passwordGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, EyeOff, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VaultItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: VaultItem | null;
  onSuccess?: () => void;
}

const itemTypes = [
  { value: 'server', labelKey: 'vault.type.server' },
  { value: 'website', labelKey: 'vault.type.website' },
  { value: 'network_device', labelKey: 'vault.type.network_device' },
  { value: 'application', labelKey: 'vault.type.application' },
  { value: 'api_key', labelKey: 'vault.type.api_key' },
  { value: 'other', labelKey: 'vault.type.other' },
];

const VaultItemForm: React.FC<VaultItemFormProps> = ({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}) => {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { data: servers } = useServers();
  const { data: networks } = useNetworks();
  const { data: webApps } = useWebsiteApplications();
  const { createItem, updateItem } = useVaultMutations();

  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    item_type: 'other',
    linked_server_id: '',
    linked_network_id: '',
    linked_application_id: '',
    notes: '',
    tags: [] as string[],
    requires_2fa_reveal: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>(defaultPasswordOptions);

  const passwordStrength = checkPasswordStrength(formData.password);

  useEffect(() => {
    if (editItem) {
      setFormData({
        title: editItem.title,
        username: editItem.username || '',
        password: '', // Never pre-fill password
        url: editItem.url || '',
        item_type: editItem.item_type,
        linked_server_id: editItem.linked_server_id || '',
        linked_network_id: editItem.linked_network_id || '',
        linked_application_id: editItem.linked_application_id || '',
        notes: editItem.notes || '',
        tags: editItem.tags || [],
        requires_2fa_reveal: editItem.requires_2fa_reveal,
      });
    } else {
      setFormData({
        title: '',
        username: '',
        password: '',
        url: '',
        item_type: 'other',
        linked_server_id: '',
        linked_network_id: '',
        linked_application_id: '',
        notes: '',
        tags: [],
        requires_2fa_reveal: false,
      });
    }
  }, [editItem, open]);

  const handleGeneratePassword = () => {
    const generated = generatePassword(passwordOptions);
    setFormData({ ...formData, password: generated });
    setShowPassword(true);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: t('common.error'),
        description: t('validation.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        title: formData.title,
        username: formData.username || null,
        password: formData.password || undefined,
        url: formData.url || null,
        item_type: formData.item_type,
        linked_server_id: formData.linked_server_id || null,
        linked_network_id: formData.linked_network_id || null,
        linked_application_id: formData.linked_application_id || null,
        notes: formData.notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        requires_2fa_reveal: formData.requires_2fa_reveal,
      };

      if (editItem) {
        await updateItem.mutateAsync({ id: editItem.id, ...data });
        toast({ title: t('common.success'), description: 'Credential updated' });
      } else {
        await createItem.mutateAsync(data);
        toast({ title: t('common.success'), description: 'Credential added' });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle>
            {editItem ? t('common.edit') : t('vault.addCredential')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>{t('vault.itemTitle')} *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Production DB Root"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>{t('vault.type')}</Label>
            <Select
              value={formData.item_type}
              onValueChange={(value) => setFormData({ ...formData, item_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label>{t('vault.username')}</Label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="admin"
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label>{t('vault.url')}</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com or 192.168.1.1"
            />
          </div>

          {/* Password */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('vault.password')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editItem ? '(unchanged)' : '••••••••'}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                <RefreshCw className="h-4 w-4 me-2" />
                {t('vault.generatePassword')}
              </Button>
            </div>
            {formData.password && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">{t('vault.passwordStrength')}:</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all', passwordStrength.color)}
                    style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                  />
                </div>
                <span className="text-xs">{t(`vault.${passwordStrength.label}`)}</span>
              </div>
            )}
          </div>

          {/* Linked Server */}
          <div className="space-y-2">
            <Label>{t('vault.linkedServer')}</Label>
            <Select
              value={formData.linked_server_id}
              onValueChange={(value) => setFormData({ ...formData, linked_server_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {servers?.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Network */}
          <div className="space-y-2">
            <Label>{t('vault.linkedNetwork')}</Label>
            <Select
              value={formData.linked_network_id}
              onValueChange={(value) => setFormData({ ...formData, linked_network_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {networks?.map((network) => (
                  <SelectItem key={network.id} value={network.id}>
                    {network.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linked Application */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('vault.linkedApplication')}</Label>
            <Select
              value={formData.linked_application_id}
              onValueChange={(value) => setFormData({ ...formData, linked_application_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {webApps?.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('vault.tags')}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('vault.notes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes (Markdown supported)"
            />
          </div>

          {/* 2FA Reveal */}
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch
              checked={formData.requires_2fa_reveal}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, requires_2fa_reveal: checked })
              }
            />
            <Label>{t('vault.require2FA')}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VaultItemForm;
