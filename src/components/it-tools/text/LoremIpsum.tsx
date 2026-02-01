import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
];

const LoremIpsum: React.FC = () => {
  const { t } = useLanguage();
  const [count, setCount] = useState(3);
  const [type, setType] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');
  const [output, setOutput] = useState('');

  const generateWord = () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];

  const generateSentence = (wordCount?: number) => {
    const wc = wordCount || Math.floor(Math.random() * 10) + 5;
    const words = Array.from({ length: wc }, generateWord);
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(' ') + '.';
  };

  const generateParagraph = () => {
    const sentenceCount = Math.floor(Math.random() * 4) + 3;
    return Array.from({ length: sentenceCount }, () => generateSentence()).join(' ');
  };

  const generate = () => {
    let result = '';
    switch (type) {
      case 'paragraphs':
        result = Array.from({ length: count }, generateParagraph).join('\n\n');
        break;
      case 'sentences':
        result = Array.from({ length: count }, () => generateSentence()).join(' ');
        break;
      case 'words':
        result = Array.from({ length: count }, generateWord).join(' ');
        // Capitalize first word
        result = result.charAt(0).toUpperCase() + result.slice(1);
        break;
    }
    setOutput(result);
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itTools.type')}</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraphs">{t('itTools.paragraphs')}</SelectItem>
              <SelectItem value="sentences">{t('itTools.sentences')}</SelectItem>
              <SelectItem value="words">{t('itTools.words')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('itTools.count')}: {count}</Label>
          <Slider
            value={[count]}
            onValueChange={(v) => setCount(v[0])}
            min={1}
            max={type === 'words' ? 100 : 10}
            step={1}
          />
        </div>
      </div>

      <Button onClick={generate} className="w-full gap-2">
        <RefreshCw className="h-4 w-4" />
        {t('itTools.generate')}
      </Button>

      {output && (
        <div className="space-y-2">
          <Label>{t('itTools.result')}</Label>
          <div className="flex gap-2">
            <Textarea value={output} readOnly rows={8} />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoremIpsum;
