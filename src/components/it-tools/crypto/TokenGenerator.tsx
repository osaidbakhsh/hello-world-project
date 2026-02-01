import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const TokenGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [length, setLength] = useState(32);
  const [options, setOptions] = useState({
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: false,
  });
  const [token, setToken] = useState('');

  const generateToken = () => {
    const chars = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    };

    let pool = '';
    if (options.lowercase) pool += chars.lowercase;
    if (options.uppercase) pool += chars.uppercase;
    if (options.numbers) pool += chars.numbers;
    if (options.symbols) pool += chars.symbols;

    if (!pool) {
      toast.error(t('itTools.selectAtLeastOne'));
      return;
    }

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    const result = Array.from(array, x => pool[x % pool.length]).join('');
    setToken(result);
  };

  const copyToClipboard = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('itTools.length')}: {length}</Label>
          <Slider
            value={[length]}
            onValueChange={(v) => setLength(v[0])}
            min={4}
            max={128}
            step={1}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowercase"
              checked={options.lowercase}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, lowercase: !!checked }))
              }
            />
            <Label htmlFor="lowercase">{t('itTools.lowercase')} (a-z)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="uppercase"
              checked={options.uppercase}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, uppercase: !!checked }))
              }
            />
            <Label htmlFor="uppercase">{t('itTools.uppercase')} (A-Z)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="numbers"
              checked={options.numbers}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, numbers: !!checked }))
              }
            />
            <Label htmlFor="numbers">{t('itTools.numbers')} (0-9)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="symbols"
              checked={options.symbols}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, symbols: !!checked }))
              }
            />
            <Label htmlFor="symbols">{t('itTools.symbols')}</Label>
          </div>
        </div>
      </div>

      <Button onClick={generateToken} className="w-full gap-2">
        <RefreshCw className="h-4 w-4" />
        {t('itTools.generate')}
      </Button>

      {token && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Input 
              value={token} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenGenerator;
