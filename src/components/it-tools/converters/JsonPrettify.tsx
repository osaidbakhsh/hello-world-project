import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

const JsonPrettify: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const prettify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (error) {
      toast.error(t('itTools.invalidJson'));
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (error) {
      toast.error(t('itTools.invalidJson'));
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputJson')}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"key":"value"}'
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={prettify} className="flex-1 gap-2">
          <Maximize2 className="h-4 w-4" />
          {t('itTools.prettify')}
        </Button>
        <Button onClick={minify} variant="outline" className="flex-1 gap-2">
          <Minimize2 className="h-4 w-4" />
          {t('itTools.minify')}
        </Button>
      </div>

      {output && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Textarea
              value={output}
              readOnly
              rows={8}
              className="font-mono text-sm"
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

export default JsonPrettify;
