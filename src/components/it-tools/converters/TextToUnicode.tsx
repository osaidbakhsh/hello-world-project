import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';

const TextToUnicode: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [unicode, setUnicode] = useState('');

  const textToUnicode = (str: string): string => {
    return str.split('').map(char => {
      const code = char.codePointAt(0);
      if (code !== undefined) {
        return 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
      }
      return '';
    }).join(' ');
  };

  const unicodeToText = (uni: string): string => {
    const codes = uni.match(/U\+([0-9A-Fa-f]+)/g);
    if (!codes) return '';
    return codes.map(code => {
      const hex = code.replace('U+', '');
      return String.fromCodePoint(parseInt(hex, 16));
    }).join('');
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (value) {
      setUnicode(textToUnicode(value));
    } else {
      setUnicode('');
    }
  };

  const handleUnicodeChange = (value: string) => {
    setUnicode(value);
    try {
      setText(unicodeToText(value));
    } catch {
      // Invalid unicode
    }
  };

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('itTools.textInput')}</Label>
          {text && (
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Hello 🌍"
          rows={3}
        />
      </div>

      <div className="flex justify-center">
        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Unicode</Label>
          {unicode && (
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(unicode)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Textarea
          value={unicode}
          onChange={(e) => handleUnicodeChange(e.target.value)}
          placeholder="U+0048 U+0065 U+006C U+006C U+006F U+1F30D"
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <p>{t('itTools.unicodeNote')}</p>
      </div>
    </div>
  );
};

export default TextToUnicode;
