import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

const UrlEncoder: React.FC = () => {
  const { t } = useLanguage();
  const [encodeInput, setEncodeInput] = useState('');
  const [encodeOutput, setEncodeOutput] = useState('');
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeOutput, setDecodeOutput] = useState('');

  const encode = () => {
    try {
      setEncodeOutput(encodeURIComponent(encodeInput));
    } catch (error) {
      toast.error(t('itTools.encodingError'));
    }
  };

  const decode = () => {
    try {
      setDecodeOutput(decodeURIComponent(decodeInput));
    } catch (error) {
      toast.error(t('itTools.decodingError'));
    }
  };

  const copyToClipboard = async (text: string) => {
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
            placeholder="Hello World! مرحبا"
            rows={4}
          />
        </div>

        <Button onClick={encode} className="w-full gap-2">
          <ArrowDown className="h-4 w-4" />
          {t('itTools.encodeUrl')}
        </Button>

        {encodeOutput && (
          <div className="space-y-2">
            <Label>{t('itTools.result')}</Label>
            <div className="flex gap-2">
              <Textarea value={encodeOutput} readOnly rows={4} className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(encodeOutput)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="decode" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>{t('itTools.encodedUrl')}</Label>
          <Textarea
            value={decodeInput}
            onChange={(e) => setDecodeInput(e.target.value)}
            placeholder="Hello%20World%21%20%D9%85%D8%B1%D8%AD%D8%A8%D8%A7"
            rows={4}
            className="font-mono"
          />
        </div>

        <Button onClick={decode} className="w-full gap-2">
          <ArrowUp className="h-4 w-4" />
          {t('itTools.decodeUrl')}
        </Button>

        {decodeOutput && (
          <div className="space-y-2">
            <Label>{t('itTools.result')}</Label>
            <div className="flex gap-2">
              <Textarea value={decodeOutput} readOnly rows={4} />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(decodeOutput)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default UrlEncoder;
