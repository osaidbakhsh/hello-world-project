import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';

const OpenGraphGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [siteName, setSiteName] = useState('');
  const [type, setType] = useState('website');

  const generateTags = (): string => {
    const tags = [
      `<!-- Open Graph / Facebook -->`,
      `<meta property="og:type" content="${type}" />`,
      title && `<meta property="og:title" content="${title}" />`,
      description && `<meta property="og:description" content="${description}" />`,
      url && `<meta property="og:url" content="${url}" />`,
      image && `<meta property="og:image" content="${image}" />`,
      siteName && `<meta property="og:site_name" content="${siteName}" />`,
      '',
      `<!-- Twitter -->`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      title && `<meta name="twitter:title" content="${title}" />`,
      description && `<meta name="twitter:description" content="${description}" />`,
      image && `<meta name="twitter:image" content="${image}" />`,
    ].filter(Boolean).join('\n');
    
    return tags;
  };

  const copyToClipboard = async () => {
    const tags = generateTags();
    await navigator.clipboard.writeText(tags);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('itTools.title')}</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Page"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('itTools.description')}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of the page content..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('itTools.imageUrl')}</Label>
          <Input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/og-image.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('itTools.siteName')}</Label>
          <Input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="My Website"
          />
        </div>
      </div>

      {/* Preview */}
      {(title || description || image) && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t('itTools.preview')}
          </Label>
          <div className="border rounded-lg overflow-hidden max-w-md">
            {image && (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <img 
                  src={image} 
                  alt="OG Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-muted-foreground uppercase">{siteName || 'example.com'}</p>
              <p className="font-semibold line-clamp-2">{title || 'Page Title'}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{description || 'Page description...'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Code */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            HTML
          </Label>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <Textarea
          value={generateTags()}
          readOnly
          rows={12}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
};

export default OpenGraphGenerator;
