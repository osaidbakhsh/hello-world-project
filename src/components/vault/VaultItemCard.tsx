import React from 'react';
import { 
  Server, 
  Globe, 
  Network, 
  AppWindow, 
  Key, 
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Link2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import VaultPasswordField from './VaultPasswordField';
import type { VaultItem } from '@/hooks/useVaultData';

interface VaultItemCardProps {
  item: VaultItem;
  ownerName?: string;
  canEdit: boolean;
  canReveal: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const typeIcons: Record<string, React.ElementType> = {
  server: Server,
  website: Globe,
  network_device: Network,
  application: AppWindow,
  api_key: Key,
  other: Key,
};

const VaultItemCard: React.FC<VaultItemCardProps> = ({
  item,
  ownerName,
  canEdit,
  canReveal,
  onEdit,
  onDelete,
}) => {
  const { t, dir } = useLanguage();
  const TypeIcon = typeIcons[item.item_type] || Key;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Icon and Title */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TypeIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
              {item.username && (
                <p className="text-sm text-muted-foreground truncate">
                  <User className="inline w-3 h-3 me-1" />
                  {item.username}
                </p>
              )}
              {item.url && (
                <p className="text-sm text-muted-foreground truncate">
                  <Link2 className="inline w-3 h-3 me-1" />
                  {item.url}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 me-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 me-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Password Field */}
        <div className="mt-4">
          <VaultPasswordField
            vaultItemId={item.id}
            hasPassword={!!item.password_encrypted}
            canReveal={canReveal}
          />
        </div>

        {/* Tags and Metadata */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {t(`vault.type.${item.item_type}`)}
          </Badge>
          {item.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {item.tags && item.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>{ownerName || t('vault.owner')}</span>
          <span>
            {new Date(item.updated_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default VaultItemCard;
