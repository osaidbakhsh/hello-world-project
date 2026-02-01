import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const IPv6UlaGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [ulaAddress, setUlaAddress] = useState('');
  const [prefix, setPrefix] = useState('');
  const [firstAddress, setFirstAddress] = useState('');
  const [lastAddress, setLastAddress] = useState('');

  const generateRandomHex = (bytes: number): string => {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateUla = () => {
    // ULA format: fd00::/8 + 40-bit random + subnet ID + interface ID
    // Generate 40-bit (5 bytes) random Global ID
    const globalId = generateRandomHex(5);
    
    // Format: fdXX:XXXX:XXXX::/48
    const g1 = globalId.substring(0, 2);
    const g2 = globalId.substring(2, 6);
    const g3 = globalId.substring(6, 10);
    
    const ulaPrefix = `fd${g1}:${g2}:${g3}`;
    setPrefix(`${ulaPrefix}::/48`);
    
    // Generate a /64 subnet with subnet ID 0001
    const subnet = `${ulaPrefix}:0001`;
    setUlaAddress(`${subnet}::/64`);
    
    // First usable address
    setFirstAddress(`${subnet}:0000:0000:0000:0001`);
    
    // Last address (before broadcast)
    setLastAddress(`${subnet}:ffff:ffff:ffff:fffe`);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <p className="font-medium mb-1">IPv6 Unique Local Address (ULA)</p>
        <p className="text-muted-foreground text-xs">
          {t('itTools.ulaDesc')}
        </p>
      </div>

      <Button onClick={generateUla} className="w-full gap-2">
        <RefreshCw className="h-4 w-4" />
        {t('itTools.generate')}
      </Button>

      {ulaAddress && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('itTools.ulaPrefix')} (/48)</Label>
            <div className="flex gap-2">
              <Input value={prefix} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(prefix)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('itTools.subnet')} (/64)</Label>
            <div className="flex gap-2">
              <Input value={ulaAddress} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(ulaAddress)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('itTools.firstHost')}</Label>
            <div className="flex gap-2">
              <Input value={firstAddress} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(firstAddress)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('itTools.lastHost')}</Label>
            <div className="flex gap-2">
              <Input value={lastAddress} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(lastAddress)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
            <p><strong>fc00::/7</strong> - {t('itTools.ulaRange')}</p>
            <p><strong>fd00::/8</strong> - {t('itTools.ulaLocallyAssigned')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPv6UlaGenerator;
