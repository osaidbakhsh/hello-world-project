import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

const IPConverter: React.FC = () => {
  const { t } = useLanguage();
  const [ip, setIp] = useState('192.168.1.1');
  const [conversions, setConversions] = useState<{
    decimal: string;
    binary: string;
    hex: string;
    octal: string;
  } | null>(null);

  const convertIP = () => {
    try {
      const octets = ip.split('.').map(o => parseInt(o));
      if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
        toast.error(t('itTools.invalidIP'));
        return;
      }

      const decimalValue = octets.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
      
      setConversions({
        decimal: decimalValue.toString(),
        binary: octets.map(o => o.toString(2).padStart(8, '0')).join('.'),
        hex: octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join('.'),
        octal: octets.map(o => o.toString(8).padStart(3, '0')).join('.'),
      });
    } catch (error) {
      toast.error(t('itTools.invalidIP'));
    }
  };

  useEffect(() => {
    if (ip) convertIP();
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.ipAddress')}</Label>
        <div className="flex gap-2">
          <Input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.1"
            className="font-mono"
          />
          <Button onClick={convertIP}>
            {t('itTools.convert')}
          </Button>
        </div>
      </div>

      {conversions && (
        <div className="grid gap-3">
          {[
            { label: 'Decimal', value: conversions.decimal },
            { label: 'Binary', value: conversions.binary },
            { label: 'Hexadecimal', value: conversions.hex },
            { label: 'Octal', value: conversions.octal },
          ].map((item, index) => (
            <Card key={index}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-mono font-medium truncate">{item.value}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(item.value)}
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

export default IPConverter;
