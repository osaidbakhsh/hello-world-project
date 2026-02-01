import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const MACGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(true);
  const [separator, setSeparator] = useState(':');
  const [macs, setMacs] = useState<string[]>([]);

  const generateMAC = () => {
    const newMacs: string[] = [];
    for (let i = 0; i < count; i++) {
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      // Set locally administered bit and clear multicast bit
      bytes[0] = (bytes[0] & 0xfe) | 0x02;
      
      let mac = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(separator);
      
      if (uppercase) mac = mac.toUpperCase();
      newMacs.push(mac);
    }
    setMacs(newMacs);
  };

  const copyToClipboard = async (mac?: string) => {
    const text = mac || macs.join('\n');
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.count')}: {count}</Label>
        <Slider
          value={[count]}
          onValueChange={(v) => setCount(v[0])}
          min={1}
          max={50}
          step={1}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="uppercase"
            checked={uppercase}
            onCheckedChange={(checked) => setUppercase(!!checked)}
          />
          <Label htmlFor="uppercase">{t('itTools.uppercase')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label>{t('itTools.separator')}:</Label>
          <select
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
            className="border rounded px-2 py-1 bg-background"
          >
            <option value=":">:</option>
            <option value="-">-</option>
            <option value=".">.</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={generateMAC} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('itTools.generate')}
        </Button>
        {macs.length > 0 && (
          <>
            <Button variant="outline" onClick={() => copyToClipboard()} className="gap-2">
              <Copy className="h-4 w-4" />
              {t('itTools.copyAll')}
            </Button>
            <Button variant="outline" onClick={() => setMacs([])} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {macs.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.result')} ({macs.length})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {macs.map((mac, index) => (
              <div key={index} className="flex gap-2">
                <Input value={mac} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(mac)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MACGenerator;
