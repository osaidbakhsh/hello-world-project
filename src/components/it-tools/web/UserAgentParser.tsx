import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedUA {
  browser: { name: string; version: string };
  os: { name: string; version: string };
  device: { type: string; vendor: string; model: string };
  engine: { name: string; version: string };
}

const UserAgentParser: React.FC = () => {
  const { t } = useLanguage();
  const [userAgent, setUserAgent] = useState(navigator.userAgent);
  const [parsed, setParsed] = useState<ParsedUA | null>(null);

  const parseUserAgent = (ua: string): ParsedUA => {
    const result: ParsedUA = {
      browser: { name: 'Unknown', version: '' },
      os: { name: 'Unknown', version: '' },
      device: { type: 'Desktop', vendor: '', model: '' },
      engine: { name: 'Unknown', version: '' }
    };

    // Browser detection
    if (ua.includes('Firefox/')) {
      result.browser.name = 'Firefox';
      result.browser.version = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Edg/')) {
      result.browser.name = 'Edge';
      result.browser.version = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Chrome/')) {
      result.browser.name = 'Chrome';
      result.browser.version = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      result.browser.name = 'Safari';
      result.browser.version = ua.match(/Version\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
      result.browser.name = 'Internet Explorer';
      result.browser.version = ua.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || '';
    }

    // OS detection
    if (ua.includes('Windows NT')) {
      result.os.name = 'Windows';
      const version = ua.match(/Windows NT ([\d.]+)/)?.[1];
      const versionMap: Record<string, string> = {
        '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista'
      };
      result.os.version = versionMap[version || ''] || version || '';
    } else if (ua.includes('Mac OS X')) {
      result.os.name = 'macOS';
      result.os.version = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
    } else if (ua.includes('Linux')) {
      result.os.name = 'Linux';
      if (ua.includes('Android')) {
        result.os.name = 'Android';
        result.os.version = ua.match(/Android ([\d.]+)/)?.[1] || '';
      }
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      result.os.name = 'iOS';
      result.os.version = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
    }

    // Device type
    if (ua.includes('Mobile') || ua.includes('Android')) {
      result.device.type = 'Mobile';
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
      result.device.type = 'Tablet';
    }

    // Engine
    if (ua.includes('Gecko/')) {
      result.engine.name = 'Gecko';
      result.engine.version = ua.match(/rv:([\d.]+)/)?.[1] || '';
    } else if (ua.includes('AppleWebKit/')) {
      result.engine.name = 'WebKit';
      result.engine.version = ua.match(/AppleWebKit\/([\d.]+)/)?.[1] || '';
    } else if (ua.includes('Trident/')) {
      result.engine.name = 'Trident';
      result.engine.version = ua.match(/Trident\/([\d.]+)/)?.[1] || '';
    }

    return result;
  };

  const handleParse = () => {
    setParsed(parseUserAgent(userAgent));
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(userAgent);
    toast.success(t('common.copied'));
  };

  const useCurrentUA = () => {
    setUserAgent(navigator.userAgent);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>User-Agent</Label>
          <Button variant="ghost" size="sm" onClick={useCurrentUA}>
            {t('itTools.useCurrent')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
          <div className="flex flex-col gap-1">
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Button onClick={handleParse} className="w-full gap-2">
        <Search className="h-4 w-4" />
        {t('itTools.parse')}
      </Button>

      {parsed && (
        <div className="space-y-4">
          {[
            { title: t('itTools.browser'), data: parsed.browser },
            { title: t('itTools.operatingSystem'), data: parsed.os },
            { title: t('itTools.device'), data: parsed.device },
            { title: t('itTools.engine'), data: parsed.engine },
          ].map(section => (
            <div key={section.title} className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">{section.title}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(section.data).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground capitalize">{key}: </span>
                    <span className="font-mono">{value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserAgentParser;
