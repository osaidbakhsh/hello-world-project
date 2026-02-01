import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

interface KeyInfo {
  key: string;
  code: string;
  keyCode: number;
  which: number;
  location: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

const KeycodeInfo: React.FC = () => {
  const { t } = useLanguage();
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setKeyInfo({
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        which: e.which,
        location: e.location,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const locationNames = ['Standard', 'Left', 'Right', 'Numpad'];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-muted/30 rounded-lg text-center min-h-32 flex items-center justify-center">
        {keyInfo ? (
          <div>
            <div className="text-5xl font-mono font-bold mb-2">
              {keyInfo.key === ' ' ? 'Space' : keyInfo.key}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('itTools.pressAnyKey')}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <Keyboard className="h-12 w-12" />
            <span>{t('itTools.pressAnyKey')}</span>
          </div>
        )}
      </div>

      {keyInfo && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-mono font-bold">{keyInfo.keyCode}</div>
              <div className="text-xs text-muted-foreground">event.keyCode</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-mono font-bold">{keyInfo.which}</div>
              <div className="text-xs text-muted-foreground">event.which</div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'event.key', value: keyInfo.key === ' ' ? '" "' : `"${keyInfo.key}"` },
              { label: 'event.code', value: `"${keyInfo.code}"` },
              { label: 'event.location', value: `${keyInfo.location} (${locationNames[keyInfo.location]})` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <span className="text-sm text-muted-foreground w-28">{label}</span>
                <span className="font-mono text-sm flex-1">{value}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(value)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-center">
            {[
              { label: 'Ctrl', active: keyInfo.ctrlKey },
              { label: 'Shift', active: keyInfo.shiftKey },
              { label: 'Alt', active: keyInfo.altKey },
              { label: 'Meta', active: keyInfo.metaKey },
            ].map(({ label, active }) => (
              <div 
                key={label}
                className={`px-3 py-1 rounded text-sm ${
                  active 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KeycodeInfo;
