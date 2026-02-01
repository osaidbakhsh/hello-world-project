import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Link, Unlock } from 'lucide-react';
import { toast } from 'sonner';

const SafelinkDecoder: React.FC = () => {
  const { t } = useLanguage();
  const [safelink, setSafelink] = useState('');
  const [decoded, setDecoded] = useState('');

  const decode = () => {
    try {
      let url = safelink;
      
      // Microsoft Safelinks pattern
      const msPattern = /https?:\/\/.*safelinks\.protection\.outlook\.com\/\?url=([^&]+)/i;
      const msMatch = url.match(msPattern);
      if (msMatch) {
        const encodedUrl = msMatch[1];
        setDecoded(decodeURIComponent(encodedUrl));
        return;
      }

      // Google redirect pattern
      const googlePattern = /https?:\/\/www\.google\.com\/url\?.*?url=([^&]+)/i;
      const googleMatch = url.match(googlePattern);
      if (googleMatch) {
        const encodedUrl = googleMatch[1];
        setDecoded(decodeURIComponent(encodedUrl));
        return;
      }

      // Generic URL parameter extraction
      const urlObj = new URL(url);
      const possibleParams = ['url', 'u', 'link', 'redirect', 'target', 'destination'];
      for (const param of possibleParams) {
        const value = urlObj.searchParams.get(param);
        if (value) {
          setDecoded(decodeURIComponent(value));
          return;
        }
      }

      // If no pattern matched, just try to decode the URL
      setDecoded(decodeURIComponent(url));
    } catch (error) {
      toast.error(t('itTools.invalidUrl'));
    }
  };

  const copyToClipboard = async () => {
    if (!decoded) return;
    await navigator.clipboard.writeText(decoded);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <p>{t('itTools.safelinkDesc')}</p>
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.safelink')}</Label>
        <Input
          value={safelink}
          onChange={(e) => setSafelink(e.target.value)}
          placeholder="https://safelinks.protection.outlook.com/..."
          className="font-mono text-xs"
        />
      </div>

      <Button onClick={decode} className="w-full gap-2">
        <Unlock className="h-4 w-4" />
        {t('itTools.decode')}
      </Button>

      {decoded && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.originalUrl')}</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <a 
              href={decoded} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline break-all flex items-center gap-2"
            >
              <Link className="h-4 w-4 shrink-0" />
              {decoded}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafelinkDecoder;
