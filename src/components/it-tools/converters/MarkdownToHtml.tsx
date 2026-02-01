import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { marked } from 'marked';

const MarkdownToHtml: React.FC = () => {
  const { t } = useLanguage();
  const [markdown, setMarkdown] = useState('');
  const [html, setHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const convertToHtml = async () => {
    if (!markdown) return;
    try {
      const result = await marked(markdown);
      setHtml(result);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const copyToClipboard = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Markdown</Label>
        <Textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={`# Heading\n\n**Bold** and *italic*\n\n- List item 1\n- List item 2`}
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={convertToHtml} className="w-full gap-2">
        <ArrowRight className="h-4 w-4" />
        {t('itTools.convert')}
      </Button>

      {html && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>HTML</Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {showPreview ? (
            <div 
              className="p-4 border rounded-lg prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <Textarea
              value={html}
              readOnly
              rows={8}
              className="font-mono text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MarkdownToHtml;
