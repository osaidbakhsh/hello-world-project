import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';

const romanNumerals: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

const RomanConverter: React.FC = () => {
  const { t } = useLanguage();
  const [arabicInput, setArabicInput] = useState('');
  const [romanInput, setRomanInput] = useState('');
  const [arabicResult, setArabicResult] = useState('');
  const [romanResult, setRomanResult] = useState('');

  const toRoman = (num: number): string => {
    if (num < 1 || num > 3999) return '';
    let result = '';
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  };

  const toArabic = (roman: string): number => {
    const romanMap: Record<string, number> = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
    };
    let result = 0;
    const upperRoman = roman.toUpperCase();
    for (let i = 0; i < upperRoman.length; i++) {
      const current = romanMap[upperRoman[i]];
      const next = romanMap[upperRoman[i + 1]];
      if (next && current < next) {
        result -= current;
      } else {
        result += current;
      }
    }
    return result;
  };

  const convertToRoman = () => {
    const num = parseInt(arabicInput);
    if (isNaN(num) || num < 1 || num > 3999) {
      toast.error(t('itTools.invalidNumber') + ' (1-3999)');
      return;
    }
    setRomanResult(toRoman(num));
  };

  const convertToArabic = () => {
    if (!/^[IVXLCDM]+$/i.test(romanInput)) {
      toast.error(t('itTools.invalidRoman'));
      return;
    }
    setArabicResult(toArabic(romanInput).toString());
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      {/* Arabic to Roman */}
      <div className="p-4 border rounded-lg space-y-4">
        <h4 className="font-medium">{t('itTools.arabicToRoman')}</h4>
        <div className="flex gap-2">
          <Input
            type="number"
            value={arabicInput}
            onChange={(e) => setArabicInput(e.target.value)}
            placeholder="2024"
            min={1}
            max={3999}
          />
          <Button onClick={convertToRoman}>
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>
        {romanResult && (
          <div className="flex gap-2">
            <Input value={romanResult} readOnly className="font-mono text-lg" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(romanResult)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Roman to Arabic */}
      <div className="p-4 border rounded-lg space-y-4">
        <h4 className="font-medium">{t('itTools.romanToArabic')}</h4>
        <div className="flex gap-2">
          <Input
            value={romanInput}
            onChange={(e) => setRomanInput(e.target.value.toUpperCase())}
            placeholder="MMXXIV"
            className="font-mono"
          />
          <Button onClick={convertToArabic}>
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>
        {arabicResult && (
          <div className="flex gap-2">
            <Input value={arabicResult} readOnly className="font-mono text-lg" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(arabicResult)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>{t('itTools.romanRange')}: I (1) - MMMCMXCIX (3999)</p>
      </div>
    </div>
  );
};

export default RomanConverter;
