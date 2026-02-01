import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Download, Image } from 'lucide-react';
import { toast } from 'sonner';

const SvgPlaceholder: React.FC = () => {
  const { t } = useLanguage();
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(200);
  const [bgColor, setBgColor] = useState('#e2e8f0');
  const [textColor, setTextColor] = useState('#64748b');
  const [text, setText] = useState('');

  const generateSvg = (): string => {
    const displayText = text || `${width}×${height}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect fill="${bgColor}" width="${width}" height="${height}"/>
  <text fill="${textColor}" font-family="sans-serif" font-size="${Math.min(width, height) / 8}" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">${displayText}</text>
</svg>`;
  };

  const getSvgDataUrl = (): string => {
    const svg = generateSvg();
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const copyToClipboard = async (type: 'svg' | 'dataUrl') => {
    const content = type === 'svg' ? generateSvg() : getSvgDataUrl();
    await navigator.clipboard.writeText(content);
    toast.success(t('common.copied'));
  };

  const downloadSvg = () => {
    const svg = generateSvg();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `placeholder-${width}x${height}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itTools.width')} (px)</Label>
          <Input
            type="number"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('itTools.height')} (px)</Label>
          <Input
            type="number"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itTools.backgroundColor')}</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('itTools.textColor')}</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.customText')} ({t('itTools.optional')})</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${width}×${height}`}
        />
      </div>

      {/* Preview */}
      <div className="flex justify-center p-4 border rounded-lg bg-muted/30">
        <img 
          src={getSvgDataUrl()} 
          alt="Placeholder preview"
          style={{ maxWidth: '100%', maxHeight: 200 }}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => copyToClipboard('svg')} variant="outline" className="flex-1 gap-2">
          <Copy className="h-4 w-4" />
          SVG
        </Button>
        <Button onClick={() => copyToClipboard('dataUrl')} variant="outline" className="flex-1 gap-2">
          <Copy className="h-4 w-4" />
          Data URL
        </Button>
        <Button onClick={downloadSvg} className="flex-1 gap-2">
          <Download className="h-4 w-4" />
          {t('itTools.download')}
        </Button>
      </div>
    </div>
  );
};

export default SvgPlaceholder;
