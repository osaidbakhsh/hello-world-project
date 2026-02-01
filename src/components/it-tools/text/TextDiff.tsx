import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeftRight } from 'lucide-react';

const TextDiff: React.FC = () => {
  const { t } = useLanguage();
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [diff, setDiff] = useState<{ type: 'add' | 'remove' | 'same'; text: string }[]>([]);

  const computeDiff = () => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const result: { type: 'add' | 'remove' | 'same'; text: string }[] = [];

    let i = 0, j = 0;
    while (i < lines1.length || j < lines2.length) {
      if (i >= lines1.length) {
        result.push({ type: 'add', text: lines2[j] });
        j++;
      } else if (j >= lines2.length) {
        result.push({ type: 'remove', text: lines1[i] });
        i++;
      } else if (lines1[i] === lines2[j]) {
        result.push({ type: 'same', text: lines1[i] });
        i++;
        j++;
      } else {
        // Check if line was removed or added
        const nextMatch1 = lines1.slice(i + 1).indexOf(lines2[j]);
        const nextMatch2 = lines2.slice(j + 1).indexOf(lines1[i]);

        if (nextMatch2 !== -1 && (nextMatch1 === -1 || nextMatch2 < nextMatch1)) {
          result.push({ type: 'add', text: lines2[j] });
          j++;
        } else {
          result.push({ type: 'remove', text: lines1[i] });
          i++;
        }
      }
    }

    setDiff(result);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itTools.originalText')}</Label>
          <Textarea
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            placeholder={t('itTools.enterOriginalText')}
            rows={8}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('itTools.modifiedText')}</Label>
          <Textarea
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            placeholder={t('itTools.enterModifiedText')}
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <Button onClick={computeDiff} className="w-full gap-2">
        <ArrowLeftRight className="h-4 w-4" />
        {t('itTools.compare')}
      </Button>

      {diff.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="border rounded-lg p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto bg-muted/30">
            {diff.map((line, index) => (
              <div
                key={index}
                className={
                  line.type === 'add'
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                    : line.type === 'remove'
                    ? 'bg-destructive/20 text-destructive'
                    : 'text-muted-foreground'
                }
              >
                <span className="select-none me-2">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                {line.text || ' '}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextDiff;
