import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

const BaseConverter: React.FC = () => {
  const { t } = useLanguage();
  const [decimal, setDecimal] = useState('255');
  const [binary, setBinary] = useState('');
  const [hex, setHex] = useState('');
  const [octal, setOctal] = useState('');

  const convert = (value: string, base: number) => {
    try {
      const num = parseInt(value, base);
      if (isNaN(num)) {
        toast.error(t('itTools.invalidNumber'));
        return;
      }
      setDecimal(num.toString(10));
      setBinary(num.toString(2));
      setHex(num.toString(16).toUpperCase());
      setOctal(num.toString(8));
    } catch (error) {
      toast.error(t('itTools.invalidNumber'));
    }
  };

  useEffect(() => {
    convert('255', 10);
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <Label>Decimal (Base 10)</Label>
          <div className="flex gap-2">
            <Input
              value={decimal}
              onChange={(e) => setDecimal(e.target.value)}
              onBlur={() => convert(decimal, 10)}
              onKeyDown={(e) => e.key === 'Enter' && convert(decimal, 10)}
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(decimal)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label>Binary (Base 2)</Label>
          <div className="flex gap-2">
            <Input
              value={binary}
              onChange={(e) => setBinary(e.target.value)}
              onBlur={() => convert(binary, 2)}
              onKeyDown={(e) => e.key === 'Enter' && convert(binary, 2)}
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(binary)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label>Hexadecimal (Base 16)</Label>
          <div className="flex gap-2">
            <Input
              value={hex}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              onBlur={() => convert(hex, 16)}
              onKeyDown={(e) => e.key === 'Enter' && convert(hex, 16)}
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(hex)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label>Octal (Base 8)</Label>
          <div className="flex gap-2">
            <Input
              value={octal}
              onChange={(e) => setOctal(e.target.value)}
              onBlur={() => convert(octal, 8)}
              onKeyDown={(e) => e.key === 'Enter' && convert(octal, 8)}
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(octal)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BaseConverter;
