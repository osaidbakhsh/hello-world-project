import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface UrlParts {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
  origin: string;
  searchParams: [string, string][];
}

const UrlParser: React.FC = () => {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [parsed, setParsed] = useState<UrlParts | null>(null);
  const [error, setError] = useState('');

  const parseUrl = () => {
    try {
      const urlObj = new URL(url);
      const searchParams: [string, string][] = [];
      urlObj.searchParams.forEach((value, key) => {
        searchParams.push([key, value]);
      });
      
      setParsed({
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        username: urlObj.username,
        password: urlObj.password,
        origin: urlObj.origin,
        searchParams
      });
      setError('');
    } catch (e) {
      setError(t('itTools.invalidUrl'));
      setParsed(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const fields = parsed ? [
    { label: 'Protocol', value: parsed.protocol },
    { label: 'Origin', value: parsed.origin },
    { label: 'Hostname', value: parsed.hostname },
    { label: 'Port', value: parsed.port || '(default)' },
    { label: 'Pathname', value: parsed.pathname },
    { label: 'Search', value: parsed.search || '(none)' },
    { label: 'Hash', value: parsed.hash || '(none)' },
    { label: 'Username', value: parsed.username || '(none)' },
    { label: 'Password', value: parsed.password ? '••••••' : '(none)' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>URL</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://user:pass@example.com:8080/path?query=value#hash"
          />
          <Button onClick={parseUrl}>
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {parsed && (
        <div className="space-y-4">
          <div className="space-y-2">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <span className="text-sm text-muted-foreground w-24">{label}</span>
                <span className="font-mono text-sm flex-1 truncate">{value}</span>
                {value && value !== '(none)' && value !== '(default)' && (
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(value)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {parsed.searchParams.length > 0 && (
            <div className="space-y-2">
              <Label>{t('itTools.queryParams')}</Label>
              <div className="space-y-1">
                {parsed.searchParams.map(([key, value], index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <span className="font-mono text-sm text-primary">{key}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-mono text-sm flex-1 truncate">{value}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(value)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UrlParser;
