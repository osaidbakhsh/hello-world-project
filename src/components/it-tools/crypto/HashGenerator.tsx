import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Hash } from 'lucide-react';
import { toast } from 'sonner';

const HashGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [hash, setHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const algorithms = [
    { value: 'SHA-1', label: 'SHA-1' },
    { value: 'SHA-256', label: 'SHA-256' },
    { value: 'SHA-384', label: 'SHA-384' },
    { value: 'SHA-512', label: 'SHA-512' },
  ];

  const generateHash = async () => {
    if (!input) {
      toast.error(t('itTools.enterText'));
      return;
    }

    setIsLoading(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setHash(hashHex);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('itTools.enterTextToHash')}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.algorithm')}</Label>
        <Select value={algorithm} onValueChange={setAlgorithm}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {algorithms.map((alg) => (
              <SelectItem key={alg.value} value={alg.value}>
                {alg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={generateHash} disabled={isLoading} className="w-full gap-2">
        <Hash className="h-4 w-4" />
        {isLoading ? t('common.loading') : t('itTools.generateHash')}
      </Button>

      {hash && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Textarea 
              value={hash} 
              readOnly 
              className="font-mono text-sm resize-none"
              rows={3}
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

export default HashGenerator;
