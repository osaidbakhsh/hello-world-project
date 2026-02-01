import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';

const separators = [
  { value: '\n', label: 'New line (\\n)' },
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: ' ', label: 'Space' },
  { value: '|', label: 'Pipe (|)' },
];

const ListConverter: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [fromSeparator, setFromSeparator] = useState('\n');
  const [toSeparator, setToSeparator] = useState(',');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const convert = () => {
    const from = fromSeparator === 'custom' ? customFrom : fromSeparator;
    const to = toSeparator === 'custom' ? customTo : toSeparator;
    
    if (!from) {
      toast.error(t('itTools.selectSeparator'));
      return;
    }

    const items = input.split(from).map(item => item.trim()).filter(Boolean);
    setOutput(items.join(to));
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputList')}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('itTools.enterList')}
          rows={5}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('itTools.fromSeparator')}</Label>
          <Select value={fromSeparator} onValueChange={setFromSeparator}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {separators.map(sep => (
                <SelectItem key={sep.value} value={sep.value}>{sep.label}</SelectItem>
              ))}
              <SelectItem value="custom">{t('itTools.custom')}</SelectItem>
            </SelectContent>
          </Select>
          {fromSeparator === 'custom' && (
            <Input
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              placeholder={t('itTools.customSeparator')}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('itTools.toSeparator')}</Label>
          <Select value={toSeparator} onValueChange={setToSeparator}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {separators.map(sep => (
                <SelectItem key={sep.value} value={sep.value}>{sep.label}</SelectItem>
              ))}
              <SelectItem value="custom">{t('itTools.custom')}</SelectItem>
            </SelectContent>
          </Select>
          {toSeparator === 'custom' && (
            <Input
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder={t('itTools.customSeparator')}
            />
          )}
        </div>
      </div>

      <Button onClick={convert} className="w-full gap-2">
        <ArrowDownUp className="h-4 w-4" />
        {t('itTools.convert')}
      </Button>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.result')}</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            rows={5}
          />
        </div>
      )}
    </div>
  );
};

export default ListConverter;
