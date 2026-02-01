import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// BIP39 English wordlist (first 100 words for demo, full list has 2048 words)
const wordlist = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
  'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
  'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
  'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
  'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
  'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
  'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
  'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
  'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
  'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
  'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
  'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
  'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
  'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
  'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
  'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
  'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread',
  'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze',
  'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
  'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
  'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call'
];

// Extend wordlist for demo (repeat to get 2048)
const fullWordlist = Array(8).fill(wordlist).flat().slice(0, 2048);

const Bip39Generator: React.FC = () => {
  const { t } = useLanguage();
  const [wordCount, setWordCount] = useState('12');
  const [mnemonic, setMnemonic] = useState<string[]>([]);

  const generateMnemonic = () => {
    const count = parseInt(wordCount);
    const entropyBits = count * 11 - count / 3;
    const entropyBytes = entropyBits / 8;
    
    const entropy = new Uint8Array(entropyBytes);
    crypto.getRandomValues(entropy);
    
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = (entropy[i % entropy.length] * 8 + (entropy[(i + 1) % entropy.length] || 0)) % fullWordlist.length;
      words.push(fullWordlist[randomIndex]);
    }
    
    setMnemonic(words);
  };

  const copyToClipboard = async () => {
    if (mnemonic.length === 0) return;
    await navigator.clipboard.writeText(mnemonic.join(' '));
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm flex gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">{t('itTools.bip39Warning')}</p>
          <p className="text-muted-foreground text-xs mt-1">
            {t('itTools.bip39WarningDesc')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.wordCount')}</Label>
        <Select value={wordCount} onValueChange={setWordCount}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12 {t('itTools.words')}</SelectItem>
            <SelectItem value="15">15 {t('itTools.words')}</SelectItem>
            <SelectItem value="18">18 {t('itTools.words')}</SelectItem>
            <SelectItem value="21">21 {t('itTools.words')}</SelectItem>
            <SelectItem value="24">24 {t('itTools.words')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button onClick={generateMnemonic} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('itTools.generate')}
        </Button>
        {mnemonic.length > 0 && (
          <Button variant="outline" onClick={copyToClipboard} className="gap-2">
            <Copy className="h-4 w-4" />
            {t('itTools.copyAll')}
          </Button>
        )}
      </div>

      {mnemonic.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.mnemonicPhrase')}</Label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4 bg-muted/50 rounded-lg">
            {mnemonic.map((word, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-5 text-right">{index + 1}.</span>
                <span className="font-mono">{word}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bip39Generator;
