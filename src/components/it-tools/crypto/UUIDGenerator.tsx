import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const UUIDGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);

  const generateUUIDs = () => {
    const newUuids: string[] = [];
    for (let i = 0; i < count; i++) {
      newUuids.push(crypto.randomUUID());
    }
    setUuids(newUuids);
  };

  const copyToClipboard = async (uuid?: string) => {
    const text = uuid || uuids.join('\n');
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const clearAll = () => {
    setUuids([]);
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

      <div className="flex gap-2">
        <Button onClick={generateUUIDs} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('itTools.generate')}
        </Button>
        {uuids.length > 0 && (
          <>
            <Button variant="outline" onClick={() => copyToClipboard()} className="gap-2">
              <Copy className="h-4 w-4" />
              {t('itTools.copyAll')}
            </Button>
            <Button variant="outline" onClick={clearAll} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {uuids.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.result')} ({uuids.length})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uuids.map((uuid, index) => (
              <div key={index} className="flex gap-2">
                <Input 
                  value={uuid} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => copyToClipboard(uuid)}
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

export default UUIDGenerator;
