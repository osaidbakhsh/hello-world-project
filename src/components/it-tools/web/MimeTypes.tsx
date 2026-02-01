import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Search } from 'lucide-react';
import { toast } from 'sonner';

const mimeTypes: Record<string, { extensions: string[]; description: string }> = {
  // Text
  'text/plain': { extensions: ['.txt'], description: 'Plain text' },
  'text/html': { extensions: ['.html', '.htm'], description: 'HTML document' },
  'text/css': { extensions: ['.css'], description: 'CSS stylesheet' },
  'text/javascript': { extensions: ['.js', '.mjs'], description: 'JavaScript' },
  'text/csv': { extensions: ['.csv'], description: 'CSV data' },
  'text/xml': { extensions: ['.xml'], description: 'XML document' },
  'text/markdown': { extensions: ['.md', '.markdown'], description: 'Markdown' },
  
  // Application
  'application/json': { extensions: ['.json'], description: 'JSON data' },
  'application/xml': { extensions: ['.xml'], description: 'XML document' },
  'application/pdf': { extensions: ['.pdf'], description: 'PDF document' },
  'application/zip': { extensions: ['.zip'], description: 'ZIP archive' },
  'application/gzip': { extensions: ['.gz'], description: 'GZIP archive' },
  'application/x-tar': { extensions: ['.tar'], description: 'TAR archive' },
  'application/x-rar-compressed': { extensions: ['.rar'], description: 'RAR archive' },
  'application/x-7z-compressed': { extensions: ['.7z'], description: '7-Zip archive' },
  'application/octet-stream': { extensions: [], description: 'Binary data' },
  'application/x-www-form-urlencoded': { extensions: [], description: 'Form data' },
  
  // Microsoft Office
  'application/msword': { extensions: ['.doc'], description: 'Word document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extensions: ['.docx'], description: 'Word document (XML)' },
  'application/vnd.ms-excel': { extensions: ['.xls'], description: 'Excel spreadsheet' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extensions: ['.xlsx'], description: 'Excel spreadsheet (XML)' },
  'application/vnd.ms-powerpoint': { extensions: ['.ppt'], description: 'PowerPoint presentation' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { extensions: ['.pptx'], description: 'PowerPoint presentation (XML)' },
  
  // Images
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], description: 'JPEG image' },
  'image/png': { extensions: ['.png'], description: 'PNG image' },
  'image/gif': { extensions: ['.gif'], description: 'GIF image' },
  'image/webp': { extensions: ['.webp'], description: 'WebP image' },
  'image/svg+xml': { extensions: ['.svg'], description: 'SVG image' },
  'image/x-icon': { extensions: ['.ico'], description: 'Icon' },
  'image/bmp': { extensions: ['.bmp'], description: 'Bitmap image' },
  'image/tiff': { extensions: ['.tiff', '.tif'], description: 'TIFF image' },
  'image/avif': { extensions: ['.avif'], description: 'AVIF image' },
  
  // Audio
  'audio/mpeg': { extensions: ['.mp3'], description: 'MP3 audio' },
  'audio/wav': { extensions: ['.wav'], description: 'WAV audio' },
  'audio/ogg': { extensions: ['.ogg'], description: 'OGG audio' },
  'audio/webm': { extensions: ['.weba'], description: 'WebM audio' },
  'audio/aac': { extensions: ['.aac'], description: 'AAC audio' },
  'audio/flac': { extensions: ['.flac'], description: 'FLAC audio' },
  
  // Video
  'video/mp4': { extensions: ['.mp4'], description: 'MP4 video' },
  'video/webm': { extensions: ['.webm'], description: 'WebM video' },
  'video/ogg': { extensions: ['.ogv'], description: 'OGG video' },
  'video/mpeg': { extensions: ['.mpeg'], description: 'MPEG video' },
  'video/quicktime': { extensions: ['.mov'], description: 'QuickTime video' },
  'video/x-msvideo': { extensions: ['.avi'], description: 'AVI video' },
  
  // Fonts
  'font/woff': { extensions: ['.woff'], description: 'WOFF font' },
  'font/woff2': { extensions: ['.woff2'], description: 'WOFF2 font' },
  'font/ttf': { extensions: ['.ttf'], description: 'TrueType font' },
  'font/otf': { extensions: ['.otf'], description: 'OpenType font' },
};

const MimeTypes: React.FC = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const filteredTypes = Object.entries(mimeTypes).filter(([type, data]) => {
    const query = search.toLowerCase();
    return type.includes(query) || 
           data.extensions.some(ext => ext.includes(query)) ||
           data.description.toLowerCase().includes(query);
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('itTools.searchMime')}
          className="ps-10"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTypes.map(([type, data]) => (
          <div 
            key={type} 
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm truncate">{type}</div>
              <div className="text-xs text-muted-foreground">
                {data.description} • {data.extensions.join(', ') || 'No extension'}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(type)}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {filteredTypes.length === 0 && (
          <p className="text-center text-muted-foreground py-4">{t('common.noData')}</p>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {filteredTypes.length} / {Object.keys(mimeTypes).length} {t('itTools.types')}
      </div>
    </div>
  );
};

export default MimeTypes;
