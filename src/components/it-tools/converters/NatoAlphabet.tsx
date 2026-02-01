import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

const natoAlphabet: Record<string, string> = {
  'A': 'Alfa', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
  'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
  'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
  'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
  'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee',
  'Z': 'Zulu', '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three',
  '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine',
  ' ': '(space)', '.': 'Stop', ',': 'Comma', '?': 'Question', '!': 'Exclamation',
  '-': 'Dash', '/': 'Slash', '@': 'At', '#': 'Hash'
};

const NatoAlphabet: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string[]>([]);

  const convertToNato = (text: string) => {
    const converted = text.toUpperCase().split('').map(char => {
      return natoAlphabet[char] || char;
    });
    setResult(converted);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    convertToNato(value);
  };

  const copyToClipboard = async () => {
    if (result.length === 0) return;
    await navigator.clipboard.writeText(result.join(' '));
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={t('itTools.enterText')}
          rows={3}
        />
      </div>

      {result.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('itTools.natoResult')}</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {result.map((word, index) => (
                <span 
                  key={index} 
                  className={`px-2 py-1 rounded text-sm ${
                    word === '(space)' 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <Label className="mb-2 block">{t('itTools.natoReference')}</Label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 text-xs">
          {Object.entries(natoAlphabet).slice(0, 36).map(([char, word]) => (
            <div key={char} className="p-1 bg-muted/30 rounded text-center">
              <span className="font-bold">{char}</span>
              <span className="text-muted-foreground"> - {word}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NatoAlphabet;
