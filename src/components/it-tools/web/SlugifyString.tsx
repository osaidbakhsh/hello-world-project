import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

const SlugifyString: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [lowercase, setLowercase] = useState(true);
  const [separator, setSeparator] = useState('-');

  const slugify = (text: string): string => {
    let result = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .trim()
      .replace(/[\s_]+/g, separator); // Replace spaces with separator
    
    if (lowercase) {
      result = result.toLowerCase();
    }
    
    return result;
  };

  const slug = slugify(input);

  const copyToClipboard = async () => {
    if (!slug) return;
    await navigator.clipboard.writeText(slug);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="My Blog Post Title! 2024"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={lowercase}
            onCheckedChange={setLowercase}
          />
          <Label>{t('itTools.lowercase')}</Label>
        </div>

        <div className="flex items-center gap-2">
          <Label>{t('itTools.separator')}:</Label>
          <div className="flex gap-1">
            {['-', '_', '.'].map(sep => (
              <Button
                key={sep}
                variant={separator === sep ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeparator(sep)}
                className="w-8"
              >
                {sep}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {slug && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Slug</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm break-all">
            {slug}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>{t('itTools.slugDescription')}</p>
      </div>
    </div>
  );
};

export default SlugifyString;
