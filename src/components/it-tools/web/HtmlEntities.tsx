import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Code } from 'lucide-react';
import { toast } from 'sonner';

const HtmlEntities: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '©': '&copy;',
    '®': '&reg;',
    '™': '&trade;',
    '€': '&euro;',
    '£': '&pound;',
    '¥': '&yen;',
    '¢': '&cent;',
    '§': '&sect;',
    '°': '&deg;',
    '±': '&plusmn;',
    '×': '&times;',
    '÷': '&divide;',
    '≤': '&le;',
    '≥': '&ge;',
    '≠': '&ne;',
    '∞': '&infin;',
    '→': '&rarr;',
    '←': '&larr;',
    '↑': '&uarr;',
    '↓': '&darr;',
  };

  const reverseEntities = Object.fromEntries(
    Object.entries(htmlEntities).map(([k, v]) => [v, k])
  );

  const encode = () => {
    let result = input;
    for (const [char, entity] of Object.entries(htmlEntities)) {
      result = result.split(char).join(entity);
    }
    setOutput(result);
  };

  const decode = () => {
    let result = input;
    // Decode named entities
    for (const [entity, char] of Object.entries(reverseEntities)) {
      result = result.split(entity).join(char);
    }
    // Decode numeric entities
    result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
    result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
    setOutput(result);
  };

  const handleConvert = () => {
    if (mode === 'encode') {
      encode();
    } else {
      decode();
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === 'encode' ? 'default' : 'outline'}
          onClick={() => { setMode('encode'); setOutput(''); }}
          className="flex-1"
        >
          {t('itTools.encode')}
        </Button>
        <Button
          variant={mode === 'decode' ? 'default' : 'outline'}
          onClick={() => { setMode('decode'); setOutput(''); }}
          className="flex-1"
        >
          {t('itTools.decode')}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? '<div class="test">' : '&lt;div class=&quot;test&quot;&gt;'}
          rows={4}
        />
      </div>

      <Button onClick={handleConvert} className="w-full gap-2">
        <Code className="h-4 w-4" />
        {mode === 'encode' ? t('itTools.encode') : t('itTools.decode')}
      </Button>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.result')}</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            rows={4}
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* Common entities reference */}
      <div className="border-t pt-4">
        <Label className="mb-2 block">{t('itTools.commonEntities')}</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(htmlEntities).slice(0, 12).map(([char, entity]) => (
            <div key={entity} className="p-2 bg-muted/30 rounded text-center font-mono">
              <span className="text-lg">{char}</span>
              <span className="block text-muted-foreground">{entity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HtmlEntities;
