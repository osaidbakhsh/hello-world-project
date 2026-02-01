import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, Monitor } from 'lucide-react';
import { toast } from 'sonner';

interface DeviceInfoData {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  onLine: boolean;
  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  vendor: string;
  timezone: string;
  timezoneOffset: number;
}

const DeviceInfo: React.FC = () => {
  const { t } = useLanguage();
  const [info, setInfo] = useState<DeviceInfoData | null>(null);

  const collectInfo = () => {
    setInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: [...navigator.languages],
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      onLine: navigator.onLine,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenColorDepth: window.screen.colorDepth,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      vendor: navigator.vendor,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
    });
  };

  useEffect(() => {
    collectInfo();
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const copyAll = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    toast.success(t('common.copied'));
  };

  if (!info) return null;

  const sections = [
    {
      title: t('itTools.browser'),
      items: [
        { label: 'User Agent', value: info.userAgent },
        { label: 'Vendor', value: info.vendor },
        { label: 'Platform', value: info.platform },
        { label: 'Language', value: info.language },
        { label: 'Languages', value: info.languages.join(', ') },
        { label: 'Cookies Enabled', value: String(info.cookiesEnabled) },
        { label: 'Do Not Track', value: info.doNotTrack || 'Not set' },
        { label: 'Online', value: String(info.onLine) },
      ]
    },
    {
      title: t('itTools.screen'),
      items: [
        { label: 'Screen Size', value: `${info.screenWidth} × ${info.screenHeight}` },
        { label: 'Window Size', value: `${info.windowWidth} × ${info.windowHeight}` },
        { label: 'Color Depth', value: `${info.screenColorDepth} bits` },
        { label: 'Pixel Ratio', value: String(info.devicePixelRatio) },
      ]
    },
    {
      title: t('itTools.hardware'),
      items: [
        { label: 'CPU Cores', value: String(info.hardwareConcurrency) },
        { label: 'Touch Points', value: String(info.maxTouchPoints) },
      ]
    },
    {
      title: t('itTools.timezone'),
      items: [
        { label: 'Timezone', value: info.timezone },
        { label: 'UTC Offset', value: `${info.timezoneOffset / -60} hours` },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button onClick={collectInfo} variant="outline" className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh')}
        </Button>
        <Button onClick={copyAll} className="flex-1 gap-2">
          <Copy className="h-4 w-4" />
          {t('itTools.copyAll')}
        </Button>
      </div>

      {sections.map(section => (
        <div key={section.title} className="space-y-2">
          <Label className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {section.title}
          </Label>
          <div className="space-y-1">
            {section.items.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                <span className="text-muted-foreground w-32">{label}</span>
                <span className="font-mono flex-1 truncate">{value}</span>
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
        </div>
      ))}
    </div>
  );
};

export default DeviceInfo;
