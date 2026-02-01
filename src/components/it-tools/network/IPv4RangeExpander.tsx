import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const IPv4RangeExpander: React.FC = () => {
  const { t } = useLanguage();
  const [startIp, setStartIp] = useState('');
  const [endIp, setEndIp] = useState('');
  const [expandedIps, setExpandedIps] = useState<string[]>([]);

  const ipToNumber = (ip: string): number => {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  };

  const numberToIp = (num: number): string => {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');
  };

  const isValidIp = (ip: string): boolean => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  };

  const expandRange = () => {
    if (!isValidIp(startIp) || !isValidIp(endIp)) {
      toast.error(t('itTools.invalidIP'));
      return;
    }

    const start = ipToNumber(startIp);
    const end = ipToNumber(endIp);

    if (start > end) {
      toast.error(t('itTools.startGreaterThanEnd'));
      return;
    }

    if (end - start > 1000) {
      toast.error(t('itTools.rangeTooLarge'));
      return;
    }

    const ips: string[] = [];
    for (let i = start; i <= end; i++) {
      ips.push(numberToIp(i));
    }
    setExpandedIps(ips);
  };

  const copyToClipboard = async () => {
    if (expandedIps.length === 0) return;
    await navigator.clipboard.writeText(expandedIps.join('\n'));
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itTools.startIp')}</Label>
          <Input
            value={startIp}
            onChange={(e) => setStartIp(e.target.value)}
            placeholder="192.168.1.1"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('itTools.endIp')}</Label>
          <Input
            value={endIp}
            onChange={(e) => setEndIp(e.target.value)}
            placeholder="192.168.1.10"
          />
        </div>
      </div>

      <Button onClick={expandRange} className="w-full gap-2">
        <ArrowRight className="h-4 w-4" />
        {t('itTools.expandRange')}
      </Button>

      {expandedIps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.result')} ({expandedIps.length} IPs)</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-sm">
              {expandedIps.map((ip, index) => (
                <span key={index}>{ip}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPv4RangeExpander;
