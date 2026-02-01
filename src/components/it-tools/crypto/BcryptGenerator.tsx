import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Copy, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

const BcryptGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [rounds, setRounds] = useState(10);
  const [hash, setHash] = useState('');
  const [verifyHash, setVerifyHash] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateHash = async () => {
    if (!text) return;
    setIsLoading(true);
    try {
      const salt = await bcrypt.genSalt(rounds);
      const hashedText = await bcrypt.hash(text, salt);
      setHash(hashedText);
    } catch (error) {
      toast.error(t('common.error'));
    }
    setIsLoading(false);
  };

  const verifyPassword = async () => {
    if (!text || !verifyHash) return;
    setIsLoading(true);
    try {
      const result = await bcrypt.compare(text, verifyHash);
      setIsValid(result);
    } catch (error) {
      setIsValid(false);
    }
    setIsLoading(false);
  };

  const copyToClipboard = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.enterText')}</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('itTools.enterPassword')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.rounds')}: {rounds}</Label>
        <Slider
          value={[rounds]}
          onValueChange={(v) => setRounds(v[0])}
          min={4}
          max={16}
          step={1}
        />
        <p className="text-xs text-muted-foreground">
          {t('itTools.higherRoundsSlower')}
        </p>
      </div>

      <Button onClick={generateHash} disabled={!text || isLoading} className="w-full gap-2">
        <Lock className="h-4 w-4" />
        {isLoading ? t('common.loading') : t('itTools.generateHash')}
      </Button>

      {hash && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Input value={hash} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">{t('itTools.verifyHash')}</h4>
        <div className="space-y-2">
          <Label>{t('itTools.bcryptHash')}</Label>
          <Input
            value={verifyHash}
            onChange={(e) => {
              setVerifyHash(e.target.value);
              setIsValid(null);
            }}
            placeholder="$2a$10$..."
            className="font-mono text-xs"
          />
        </div>

        <Button 
          onClick={verifyPassword} 
          disabled={!text || !verifyHash || isLoading}
          variant="outline"
          className="w-full gap-2"
        >
          <Check className="h-4 w-4" />
          {t('itTools.verify')}
        </Button>

        {isValid !== null && (
          <div className={`p-3 rounded-lg ${isValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {isValid ? t('itTools.hashMatch') : t('itTools.hashNoMatch')}
          </div>
        )}
      </div>
    </div>
  );
};

export default BcryptGenerator;
