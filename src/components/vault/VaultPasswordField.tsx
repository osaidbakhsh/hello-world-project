import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useVaultSettings, useVaultMutations } from '@/hooks/useVaultData';
import { useSecureClipboard } from '@/hooks/useVaultAutoLock';
import { cn } from '@/lib/utils';

interface VaultPasswordFieldProps {
  vaultItemId: string;
  hasPassword: boolean;
  canReveal: boolean;
  className?: string;
}

const VaultPasswordField: React.FC<VaultPasswordFieldProps> = ({
  vaultItemId,
  hasPassword,
  canReveal,
  className,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: settings } = useVaultSettings();
  const { revealPassword } = useVaultMutations();
  const { copyToClipboard } = useSecureClipboard();

  const [isRevealed, setIsRevealed] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const revealDuration = settings?.reveal_duration_seconds ?? 10;
  const globalDisabled = settings?.global_reveal_disabled ?? false;

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isRevealed) {
      setIsRevealed(false);
      setPassword(null);
    }
  }, [countdown, isRevealed]);

  const handleReveal = useCallback(async () => {
    if (globalDisabled) {
      toast({
        title: t('vault.emergencyLock'),
        description: t('vault.noPermission'),
        variant: 'destructive',
      });
      return;
    }

    if (isRevealed) {
      setIsRevealed(false);
      setPassword(null);
      setCountdown(0);
      return;
    }

    setIsLoading(true);
    try {
      const decrypted = await revealPassword(vaultItemId);
      setPassword(decrypted);
      setIsRevealed(true);
      setCountdown(revealDuration);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to reveal password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [vaultItemId, revealPassword, revealDuration, globalDisabled, isRevealed, toast, t]);

  const handleCopy = useCallback(async () => {
    if (!password) return;
    
    const success = await copyToClipboard(password);
    if (success) {
      toast({
        title: t('vault.copiedToClipboard'),
        description: t('vault.revealCountdown').replace('{seconds}', '30'),
      });

      // Log copy action
      // Note: This is already logged by the edge function during reveal
    } else {
      toast({
        title: t('common.error'),
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  }, [password, copyToClipboard, toast, t]);

  if (!hasPassword) {
    return (
      <span className="text-muted-foreground text-sm">
        {t('vault.noPermission')}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm min-w-[120px]">
        {isRevealed && password ? password : '••••••••••••'}
      </code>

      {canReveal && !globalDisabled && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReveal}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRevealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>

          {isRevealed && password && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      {countdown > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">
          {countdown}s
        </span>
      )}
    </div>
  );
};

export default VaultPasswordField;
