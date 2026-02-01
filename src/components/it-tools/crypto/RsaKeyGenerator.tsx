import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw, Key } from 'lucide-react';
import { toast } from 'sonner';

const RsaKeyGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [keySize, setKeySize] = useState('2048');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const formatPem = (base64: string, type: 'PUBLIC' | 'PRIVATE'): string => {
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${type} KEY-----\n${lines.join('\n')}\n-----END ${type} KEY-----`;
  };

  const generateKeyPair = async () => {
    setIsGenerating(true);
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: parseInt(keySize),
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      setPublicKey(formatPem(arrayBufferToBase64(publicKeyBuffer), 'PUBLIC'));
      setPrivateKey(formatPem(arrayBufferToBase64(privateKeyBuffer), 'PRIVATE'));
      
      toast.success(t('itTools.keyPairGenerated'));
    } catch (error) {
      toast.error(t('common.error'));
    }
    setIsGenerating(false);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.keySize')}</Label>
        <Select value={keySize} onValueChange={setKeySize}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1024">1024 bits</SelectItem>
            <SelectItem value="2048">2048 bits ({t('itTools.recommended')})</SelectItem>
            <SelectItem value="4096">4096 bits ({t('itTools.slowest')})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={generateKeyPair} 
        disabled={isGenerating}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Key className="h-4 w-4" />
        )}
        {isGenerating ? t('itTools.generating') : t('itTools.generateKeyPair')}
      </Button>

      {publicKey && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.publicKey')}</Label>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(publicKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={publicKey}
            readOnly
            rows={6}
            className="font-mono text-xs"
          />
        </div>
      )}

      {privateKey && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.privateKey')}</Label>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(privateKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={privateKey}
            readOnly
            rows={8}
            className="font-mono text-xs"
          />
          <p className="text-xs text-destructive">
            {t('itTools.privateKeyWarning')}
          </p>
        </div>
      )}
    </div>
  );
};

export default RsaKeyGenerator;
