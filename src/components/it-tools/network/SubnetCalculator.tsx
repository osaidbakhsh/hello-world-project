import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

const SubnetCalculator: React.FC = () => {
  const { t } = useLanguage();
  const [cidr, setCidr] = useState('192.168.1.0/24');
  const [result, setResult] = useState<{
    network: string;
    broadcast: string;
    firstHost: string;
    lastHost: string;
    totalHosts: number;
    mask: string;
    maskBits: number;
  } | null>(null);

  const ipToNumber = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  };

  const numberToIp = (num: number): string => {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255,
    ].join('.');
  };

  const calculateSubnet = () => {
    try {
      const [ip, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr);

      if (isNaN(prefix) || prefix < 0 || prefix > 32) {
        toast.error(t('itTools.invalidCidr'));
        return;
      }

      const mask = prefix === 0 ? 0 : ~(2 ** (32 - prefix) - 1);
      const ipNum = ipToNumber(ip);
      const network = ipNum & mask;
      const broadcast = network | ~mask;
      const totalHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : 2 ** (32 - prefix) - 2;

      setResult({
        network: numberToIp(network >>> 0),
        broadcast: numberToIp(broadcast >>> 0),
        firstHost: prefix >= 31 ? numberToIp(network >>> 0) : numberToIp((network + 1) >>> 0),
        lastHost: prefix >= 31 ? numberToIp(broadcast >>> 0) : numberToIp((broadcast - 1) >>> 0),
        totalHosts,
        mask: numberToIp(mask >>> 0),
        maskBits: prefix,
      });
    } catch (error) {
      toast.error(t('itTools.invalidCidr'));
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.cidrNotation')}</Label>
        <div className="flex gap-2">
          <Input
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            placeholder="192.168.1.0/24"
            className="font-mono"
          />
          <Button onClick={calculateSubnet} className="gap-2">
            <Calculator className="h-4 w-4" />
            {t('itTools.calculate')}
          </Button>
        </div>
      </div>

      {result && (
        <div className="grid gap-3">
          {[
            { label: t('itTools.networkAddress'), value: result.network },
            { label: t('itTools.broadcastAddress'), value: result.broadcast },
            { label: t('itTools.firstHost'), value: result.firstHost },
            { label: t('itTools.lastHost'), value: result.lastHost },
            { label: t('itTools.subnetMask'), value: result.mask },
            { label: t('itTools.totalHosts'), value: result.totalHosts.toLocaleString() },
          ].map((item, index) => (
            <Card key={index}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-mono font-medium">{item.value}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(String(item.value))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubnetCalculator;
