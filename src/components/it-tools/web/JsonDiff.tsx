import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';

type DiffResult = {
  type: 'equal' | 'added' | 'removed';
  value: string;
}[];

const JsonDiff: React.FC = () => {
  const { t } = useLanguage();
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [diff, setDiff] = useState<DiffResult>([]);
  const [error, setError] = useState('');

  const compareJson = () => {
    try {
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      
      const formatted1 = JSON.stringify(obj1, null, 2).split('\n');
      const formatted2 = JSON.stringify(obj2, null, 2).split('\n');
      
      const result: DiffResult = [];
      const maxLen = Math.max(formatted1.length, formatted2.length);
      
      for (let i = 0; i < maxLen; i++) {
        const line1 = formatted1[i] || '';
        const line2 = formatted2[i] || '';
        
        if (line1 === line2) {
          result.push({ type: 'equal', value: line1 });
        } else {
          if (line1) {
            result.push({ type: 'removed', value: line1 });
          }
          if (line2) {
            result.push({ type: 'added', value: line2 });
          }
        }
      }
      
      setDiff(result);
      setError('');
    } catch (e) {
      setError(t('itTools.invalidJson'));
      setDiff([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>JSON 1</Label>
          <Textarea
            value={json1}
            onChange={(e) => setJson1(e.target.value)}
            placeholder='{"key": "value1"}'
            rows={8}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>JSON 2</Label>
          <Textarea
            value={json2}
            onChange={(e) => setJson2(e.target.value)}
            placeholder='{"key": "value2"}'
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <Button onClick={compareJson} className="w-full gap-2">
        <ArrowDownUp className="h-4 w-4" />
        {t('itTools.compare')}
      </Button>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {diff.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.diff')}</Label>
          <div className="p-4 bg-muted/30 rounded-lg max-h-64 overflow-auto font-mono text-sm">
            {diff.map((line, index) => (
              <div 
                key={index}
                className={`${
                  line.type === 'added' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                  line.type === 'removed' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                  ''
                } px-2`}
              >
                <span className="inline-block w-4">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.value}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonDiff;
