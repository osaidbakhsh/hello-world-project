import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Shield } from 'lucide-react';
import { toast } from 'sonner';

const algorithms = [
  { value: 'SHA-1', label: 'HMAC-SHA1' },
  { value: 'SHA-256', label: 'HMAC-SHA256' },
  { value: 'SHA-384', label: 'HMAC-SHA384' },
  { value: 'SHA-512', label: 'HMAC-SHA512' },
];

const HmacGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [result, setResult] = useState('');

  const generateHmac = async () => {
    if (!text || !secretKey) return;
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: algorithm },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(text)
      );

      const hashArray = Array.from(new Uint8Array(signature));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setResult(hashHex);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('itTools.enterText')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.secretKey')}</Label>
        <Input
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder={t('itTools.enterSecretKey')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.algorithm')}</Label>
        <Select value={algorithm} onValueChange={setAlgorithm}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {algorithms.map(algo => (
              <SelectItem key={algo.value} value={algo.value}>
                {algo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={generateHmac} 
        disabled={!text || !secretKey}
        className="w-full gap-2"
      >
        <Shield className="h-4 w-4" />
        {t('itTools.generateHmac')}
      </Button>

      {result && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Input
              value={result}
              readOnly
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HmacGenerator;
