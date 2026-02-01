import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

const Base64FileConverter: React.FC = () => {
  const { t } = useLanguage();
  const [base64, setBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = () => {
    if (!base64) return;
    
    const link = document.createElement('a');
    link.href = base64;
    link.download = fileName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    if (!base64) return;
    await navigator.clipboard.writeText(base64);
    toast.success(t('common.copied'));
  };

  const handleBase64Input = (value: string) => {
    setBase64(value);
    // Try to detect file type from data URL
    const match = value.match(/^data:([^;]+);base64,/);
    if (match) {
      setFileType(match[1]);
    }
  };

  return (
    <div className="space-y-6">
      {/* File to Base64 */}
      <div className="p-4 border rounded-lg space-y-4">
        <h4 className="font-medium">{t('itTools.fileToBase64')}</h4>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          className="w-full gap-2"
        >
          <Upload className="h-4 w-4" />
          {t('itTools.selectFile')}
        </Button>
        {fileName && (
          <p className="text-sm text-muted-foreground">
            {fileName} ({fileType})
          </p>
        )}
      </div>

      {/* Base64 Input/Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Base64</Label>
          {base64 && (
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <textarea
          value={base64}
          onChange={(e) => handleBase64Input(e.target.value)}
          placeholder="data:image/png;base64,iVBORw0KGgo..."
          rows={6}
          className="w-full p-3 border rounded-lg font-mono text-xs bg-background resize-none"
        />
      </div>

      {/* Base64 to File */}
      {base64 && (
        <Button onClick={downloadFile} className="w-full gap-2">
          <Download className="h-4 w-4" />
          {t('itTools.downloadFile')}
        </Button>
      )}

      {/* Preview for images */}
      {base64 && fileType?.startsWith('image/') && (
        <div className="space-y-2">
          <Label>{t('itTools.preview')}</Label>
          <div className="border rounded-lg p-4 flex justify-center">
            <img 
              src={base64} 
              alt="Preview" 
              className="max-h-48 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Base64FileConverter;
