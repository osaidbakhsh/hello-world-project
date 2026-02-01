import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, ArrowRight, Download } from 'lucide-react';
import { toast } from 'sonner';

const JsonToCsv: React.FC = () => {
  const { t } = useLanguage();
  const [json, setJson] = useState('');
  const [csv, setCsv] = useState('');

  const convert = () => {
    try {
      const data = JSON.parse(json);
      
      if (!Array.isArray(data)) {
        toast.error(t('itTools.jsonMustBeArray'));
        return;
      }

      if (data.length === 0) {
        toast.error(t('itTools.emptyArray'));
        return;
      }

      // Get all unique keys
      const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
      
      // Create CSV header
      const header = keys.map(key => `"${key}"`).join(',');
      
      // Create CSV rows
      const rows = data.map(obj => {
        return keys.map(key => {
          const value = obj[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
      });

      setCsv([header, ...rows].join('\n'));
    } catch (error) {
      toast.error(t('itTools.invalidJson'));
    }
  };

  const copyToClipboard = async () => {
    if (!csv) return;
    await navigator.clipboard.writeText(csv);
    toast.success(t('common.copied'));
  };

  const downloadCsv = () => {
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>JSON ({t('itTools.arrayOfObjects')})</Label>
        <Textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={`[
  {"name": "John", "age": 30},
  {"name": "Jane", "age": 25}
]`}
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={convert} className="w-full gap-2">
        <ArrowRight className="h-4 w-4" />
        {t('itTools.convert')}
      </Button>

      {csv && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>CSV</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadCsv}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Textarea
            value={csv}
            readOnly
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default JsonToCsv;
