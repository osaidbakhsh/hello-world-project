import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PasswordCriteria {
  label: string;
  met: boolean;
}

const PasswordAnalyzer: React.FC = () => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  const [criteria, setCriteria] = useState<PasswordCriteria[]>([]);

  useEffect(() => {
    if (!password) {
      setStrength(0);
      setCriteria([]);
      return;
    }

    const newCriteria: PasswordCriteria[] = [
      { label: t('itTools.minLength'), met: password.length >= 8 },
      { label: t('itTools.hasLowercase'), met: /[a-z]/.test(password) },
      { label: t('itTools.hasUppercase'), met: /[A-Z]/.test(password) },
      { label: t('itTools.hasNumber'), met: /\d/.test(password) },
      { label: t('itTools.hasSymbol'), met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
      { label: t('itTools.noCommonPatterns'), met: !/(123|abc|password|qwerty)/i.test(password) },
    ];

    setCriteria(newCriteria);

    const metCount = newCriteria.filter(c => c.met).length;
    const lengthBonus = Math.min(password.length / 20, 0.2);
    setStrength(Math.round((metCount / newCriteria.length + lengthBonus) * 100));
  }, [password, t]);

  const getStrengthLabel = () => {
    if (strength < 25) return { label: t('itTools.veryWeak'), color: 'text-destructive' };
    if (strength < 50) return { label: t('itTools.weak'), color: 'text-orange-500' };
    if (strength < 75) return { label: t('itTools.medium'), color: 'text-yellow-500' };
    if (strength < 90) return { label: t('itTools.strong'), color: 'text-green-500' };
    return { label: t('itTools.veryStrong'), color: 'text-green-600' };
  };

  const getProgressColor = () => {
    if (strength < 25) return 'bg-destructive';
    if (strength < 50) return 'bg-orange-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const strengthInfo = getStrengthLabel();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.password')}</Label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('itTools.enterPassword')}
            className="pe-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-0 top-0 h-full px-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {password && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('itTools.strength')}</Label>
              <Badge className={cn(strengthInfo.color, "bg-transparent border")}>
                {strengthInfo.label}
              </Badge>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-300", getProgressColor())}
                style={{ width: `${strength}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-end">{strength}%</p>
          </div>

          <div className="space-y-2">
            <Label>{t('itTools.criteria')}</Label>
            <div className="space-y-2">
              {criteria.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {item.met ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={item.met ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {password.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {t('itTools.characterCount')}: <span className="font-mono font-medium">{password.length}</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PasswordAnalyzer;
