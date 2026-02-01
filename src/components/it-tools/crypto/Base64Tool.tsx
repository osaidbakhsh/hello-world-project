import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

const Base64Tool: React.FC = () => {
  const { t } = useLanguage();
  const [encodeInput, setEncodeInput] = useState('');
  const [encodeOutput, setEncodeOutput] = useState('');
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeOutput, setDecodeOutput] = useState('');

  const encode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(encodeInput)));
      setEncodeOutput(encoded);
    } catch (error) {
      toast.error(t('itTools.encodingError'));
    }
  };

  const decode = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(decodeInput)));
      setDecodeOutput(decoded);
    } catch (error) {
      toast.error(t('itTools.decodingError'));
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <Tabs defaultValue="encode" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="encode">{t('itTools.encode')}</TabsTrigger>
        <TabsTrigger value="decode">{t('itTools.decode')}</TabsTrigger>
      </TabsList>

      <TabsContent value="encode" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>{t('itTools.inputText')}</Label>
          <Textarea
            value={encodeInput}
            onChange={(e) => setEncodeInput(e.target.value)}
            placeholder={t('itTools.enterTextToEncode')}
            rows={4}
          />
        </div>

        <Button onClick={encode} className="w-full gap-2">
          <ArrowDown className="h-4 w-4" />
          {t('itTools.encodeToBase64')}
        </Button>

        {encodeOutput && (
          <div className="space-y-2">
            <Label>{t('itTools.result')}</Label>
            <div className="flex gap-2">
              <Textarea 
                value={encodeOutput} 
                readOnly 
                className="font-mono text-sm resize-none"
                rows={4}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => copyToClipboard(encodeOutput)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="decode" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>{t('itTools.base64Input')}</Label>
          <Textarea
            value={decodeInput}
            onChange={(e) => setDecodeInput(e.target.value)}
            placeholder={t('itTools.enterBase64ToDecode')}
            rows={4}
            className="font-mono"
          />
        </div>

        <Button onClick={decode} className="w-full gap-2">
          <ArrowUp className="h-4 w-4" />
          {t('itTools.decodeFromBase64')}
        </Button>

        {decodeOutput && (
          <div className="space-y-2">
            <Label>{t('itTools.result')}</Label>
            <div className="flex gap-2">
              <Textarea 
                value={decodeOutput} 
                readOnly 
                className="resize-none"
                rows={4}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => copyToClipboard(decodeOutput)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default Base64Tool;
