import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Key } from 'lucide-react';
import { toast } from 'sonner';

const BasicAuthGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const generate = () => {
    if (!username) {
      toast.error(t('itTools.enterUsername'));
      return;
    }
    const credentials = `${username}:${password}`;
    const encoded = btoa(credentials);
    setResult(`Basic ${encoded}`);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.username')}</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
        />
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.password')}</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <Button onClick={generate} className="w-full gap-2">
        <Key className="h-4 w-4" />
        {t('itTools.generate')}
      </Button>

      {result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('itTools.authorizationHeader')}</Label>
            <div className="flex gap-2">
              <Input value={result} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(result)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs">
            <p className="text-muted-foreground mb-1">HTTP Header:</p>
            <p>Authorization: {result}</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs">
            <p className="text-muted-foreground mb-1">cURL:</p>
            <p>curl -H "Authorization: {result}" https://api.example.com</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicAuthGenerator;
