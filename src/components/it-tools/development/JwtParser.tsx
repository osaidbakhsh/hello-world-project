import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Key } from 'lucide-react';
import { toast } from 'sonner';

interface JwtParts {
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  isExpired: boolean;
  expiresAt: Date | null;
}

const JwtParser: React.FC = () => {
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [parsed, setParsed] = useState<JwtParts | null>(null);
  const [error, setError] = useState('');

  const parseJwt = () => {
    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) {
        throw new Error(t('itTools.invalidJwt'));
      }

      const decodeBase64 = (str: string) => {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
      };

      const header = decodeBase64(parts[0]);
      const payload = decodeBase64(parts[1]);
      const signature = parts[2];

      let isExpired = false;
      let expiresAt: Date | null = null;

      if (payload.exp) {
        expiresAt = new Date(payload.exp * 1000);
        isExpired = expiresAt < new Date();
      }

      setParsed({ header, payload, signature, isExpired, expiresAt });
      setError('');
    } catch (e) {
      setError((e as Error).message || t('itTools.invalidJwt'));
      setParsed(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number' && (value > 1000000000 && value < 2000000000)) {
      // Likely a Unix timestamp
      return `${value} (${new Date(value * 1000).toLocaleString()})`;
    }
    return JSON.stringify(value);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.jwtToken')}</Label>
        <Textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={parseJwt} className="w-full gap-2">
        <Key className="h-4 w-4" />
        {t('itTools.parseJwt')}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {parsed && (
        <div className="space-y-4">
          {parsed.expiresAt && (
            <div className="flex items-center gap-2">
              <Badge variant={parsed.isExpired ? 'destructive' : 'outline'}>
                {parsed.isExpired ? t('itTools.expired') : t('itTools.valid')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {parsed.isExpired ? t('itTools.expiredAt') : t('itTools.expiresAt')}: {parsed.expiresAt.toLocaleString()}
              </span>
            </div>
          )}

          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Header</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(JSON.stringify(parsed.header, null, 2))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {Object.entries(parsed.header).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="text-primary font-medium">{key}:</span>
                    <span className="font-mono">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Payload</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(JSON.stringify(parsed.payload, null, 2))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(parsed.payload).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="text-primary font-medium">{key}:</span>
                    <span className="font-mono break-all">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Signature</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(parsed.signature)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="font-mono text-sm break-all text-muted-foreground">
                {parsed.signature}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default JwtParser;
