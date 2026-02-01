import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';

const TextToBinary: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [binary, setBinary] = useState('');

  const textToBinary = (str: string): string => {
    return str.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join(' ');
  };

  const binaryToText = (bin: string): string => {
    const bytes = bin.trim().split(/\s+/);
    return bytes.map(byte => {
      const num = parseInt(byte, 2);
      return isNaN(num) ? '' : String.fromCharCode(num);
    }).join('');
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (value) {
      setBinary(textToBinary(value));
    } else {
      setBinary('');
    }
  };

  const handleBinaryChange = (value: string) => {
    setBinary(value);
    if (value && /^[01\s]+$/.test(value)) {
      setText(binaryToText(value));
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
          <Label>{t('itTools.text')}</Label>
          {text && (
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Hello World"
          rows={3}
        />
      </div>

      <div className="flex justify-center">
        <ArrowDownUp className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('itTools.binary')}</Label>
          {binary && (
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(binary)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Textarea
          value={binary}
          onChange={(e) => handleBinaryChange(e.target.value)}
          placeholder="01001000 01100101 01101100 01101100 01101111"
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <p>{t('itTools.binaryNote')}</p>
      </div>
    </div>
  );
};

export default TextToBinary;
