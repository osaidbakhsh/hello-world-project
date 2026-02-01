import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ULID implementation
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let str = '';
  for (let i = len; i > 0; i--) {
    const mod = now % ENCODING_LEN;
    str = ENCODING[mod] + str;
    now = Math.floor(now / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = '';
  const randomBytes = new Uint8Array(len);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < len; i++) {
    str += ENCODING[randomBytes[i] % ENCODING_LEN];
  }
  return str;
}

function generateULID(): string {
  const time = Date.now();
  return encodeTime(time, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

function decodeTime(ulid: string): Date {
  const timeStr = ulid.substring(0, TIME_LEN);
  let time = 0;
  for (let i = 0; i < timeStr.length; i++) {
    time = time * ENCODING_LEN + ENCODING.indexOf(timeStr[i]);
  }
  return new Date(time);
}

const UlidGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [count, setCount] = useState(1);
  const [ulids, setUlids] = useState<string[]>([]);

  const generateUlids = () => {
    const newUlids: string[] = [];
    for (let i = 0; i < count; i++) {
      newUlids.push(generateULID());
    }
    setUlids(newUlids);
  };

  const copyToClipboard = async (ulid?: string) => {
    const text = ulid || ulids.join('\n');
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const clearAll = () => {
    setUlids([]);
  };

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <p className="font-medium mb-1">ULID (Universally Unique Lexicographically Sortable Identifier)</p>
        <p className="text-muted-foreground text-xs">
          {t('itTools.ulidDesc')}
        </p>
      </div>

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
        <Button onClick={generateUlids} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('itTools.generate')}
        </Button>
        {ulids.length > 0 && (
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

      {ulids.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.result')} ({ulids.length})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {ulids.map((ulid, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input 
                  value={ulid} 
                  readOnly 
                  className="font-mono text-sm flex-1"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {decodeTime(ulid).toISOString()}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => copyToClipboard(ulid)}
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

export default UlidGenerator;
