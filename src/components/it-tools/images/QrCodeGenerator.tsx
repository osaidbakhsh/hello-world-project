import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Download, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const QrCodeGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (text && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, text, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) {
          console.error(error);
          return;
        }
        setQrDataUrl(canvasRef.current?.toDataURL() || '');
      });
    }
  }, [text]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current?.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        });
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast.success(t('common.copied'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.textOrUrl')}</Label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-lg shadow-inner">
          <canvas ref={canvasRef} className={text ? '' : 'hidden'} />
          {!text && (
            <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
              <QrCode className="h-16 w-16" />
            </div>
          )}
        </div>
      </div>

      {text && (
        <div className="flex gap-2">
          <Button onClick={downloadQr} className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            {t('itTools.download')}
          </Button>
          <Button variant="outline" onClick={copyToClipboard} className="gap-2">
            <Copy className="h-4 w-4" />
            {t('itTools.copy')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default QrCodeGenerator;
