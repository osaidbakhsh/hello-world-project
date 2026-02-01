import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

const EncryptDecryptText: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  const getKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData.buffer as ArrayBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const encrypt = async () => {
    if (!text || !password) return;
    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await getKey(password, salt);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(text)
      );

      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      setResult(btoa(String.fromCharCode(...combined)));
      toast.success(t('itTools.encryptSuccess'));
    } catch (error) {
      toast.error(t('itTools.encryptError'));
    }
  };

  const decrypt = async () => {
    if (!text || !password) return;
    try {
      const combined = Uint8Array.from(atob(text), c => c.charCodeAt(0));
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);

      const key = await getKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      setResult(decoder.decode(decrypted));
      toast.success(t('itTools.decryptSuccess'));
    } catch (error) {
      toast.error(t('itTools.decryptError'));
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === 'encrypt' ? 'default' : 'outline'}
          onClick={() => { setMode('encrypt'); setResult(''); }}
          className="flex-1 gap-2"
        >
          <Lock className="h-4 w-4" />
          {t('itTools.encrypt')}
        </Button>
        <Button
          variant={mode === 'decrypt' ? 'default' : 'outline'}
          onClick={() => { setMode('decrypt'); setResult(''); }}
          className="flex-1 gap-2"
        >
          <Unlock className="h-4 w-4" />
          {t('itTools.decrypt')}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>
          {mode === 'encrypt' ? t('itTools.textToEncrypt') : t('itTools.textToDecrypt')}
        </Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'encrypt' ? t('itTools.enterText') : t('itTools.enterEncryptedText')}
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.encryptionKey')}</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('itTools.enterPassword')}
        />
        <p className="text-xs text-muted-foreground">
          {t('itTools.aes256Info')}
        </p>
      </div>

      <Button 
        onClick={mode === 'encrypt' ? encrypt : decrypt} 
        disabled={!text || !password}
        className="w-full gap-2"
      >
        {mode === 'encrypt' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        {mode === 'encrypt' ? t('itTools.encrypt') : t('itTools.decrypt')}
      </Button>

      {result && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Textarea
              value={result}
              readOnly
              rows={4}
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

export default EncryptDecryptText;
