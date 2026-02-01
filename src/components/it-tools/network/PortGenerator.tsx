import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PortGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [count, setCount] = useState(1);
  const [portType, setPortType] = useState<'any' | 'user' | 'dynamic'>('any');
  const [ports, setPorts] = useState<number[]>([]);

  const portRanges = {
    any: { min: 1, max: 65535 },
    user: { min: 1024, max: 49151 },
    dynamic: { min: 49152, max: 65535 },
  };

  const generatePorts = () => {
    const range = portRanges[portType];
    const newPorts: number[] = [];
    const usedPorts = new Set<number>();

    for (let i = 0; i < count && newPorts.length < count; i++) {
      const port = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      if (!usedPorts.has(port)) {
        usedPorts.add(port);
        newPorts.push(port);
      }
    }
    setPorts(newPorts.sort((a, b) => a - b));
  };

  const copyToClipboard = async (port?: number) => {
    const text = port !== undefined ? port.toString() : ports.join('\n');
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
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-3">
        <Label>{t('itTools.portRange')}</Label>
        <RadioGroup value={portType} onValueChange={(v) => setPortType(v as typeof portType)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="any" id="any" />
            <Label htmlFor="any" className="font-normal">
              {t('itTools.anyPort')} (1-65535)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="user" id="user" />
            <Label htmlFor="user" className="font-normal">
              {t('itTools.userPorts')} (1024-49151)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dynamic" id="dynamic" />
            <Label htmlFor="dynamic" className="font-normal">
              {t('itTools.dynamicPorts')} (49152-65535)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-2">
        <Button onClick={generatePorts} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('itTools.generate')}
        </Button>
        {ports.length > 0 && (
          <>
            <Button variant="outline" onClick={() => copyToClipboard()} className="gap-2">
              <Copy className="h-4 w-4" />
              {t('itTools.copyAll')}
            </Button>
            <Button variant="outline" onClick={() => setPorts([])} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {ports.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.result')} ({ports.length})</Label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {ports.map((port, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="font-mono"
                onClick={() => copyToClipboard(port)}
              >
                {port}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortGenerator;
