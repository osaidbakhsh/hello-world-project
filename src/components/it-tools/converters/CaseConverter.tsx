import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

const CaseConverter: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const conversions = [
    { label: 'UPPERCASE', fn: (s: string) => s.toUpperCase() },
    { label: 'lowercase', fn: (s: string) => s.toLowerCase() },
    { label: 'Title Case', fn: (s: string) => s.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) },
    { label: 'camelCase', fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()) },
    { label: 'PascalCase', fn: (s: string) => s.replace(/\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()).replace(/[^a-zA-Z0-9]/g, '') },
    { label: 'snake_case', fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') },
    { label: 'kebab-case', fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') },
    { label: 'CONSTANT_CASE', fn: (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') },
    { label: 'Sentence case', fn: (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() },
    { label: 'aLtErNaTiNg', fn: (s: string) => s.split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('') },
    { label: 'InVeRsE', fn: (s: string) => s.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('') },
  ];

  const convert = (fn: (s: string) => string) => {
    if (!input) {
      toast.error(t('itTools.enterText'));
      return;
    }
    setOutput(fn(input));
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('itTools.enterTextToConvert')}
          rows={3}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {conversions.map((conv, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => convert(conv.fn)}
          >
            {conv.label}
          </Button>
        ))}
      </div>

      {output && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Textarea value={output} readOnly rows={3} />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseConverter;
