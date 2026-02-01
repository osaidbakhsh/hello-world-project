import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const RegexTester: React.FC = () => {
  const { t } = useLanguage();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false });
  const [testString, setTestString] = useState('');
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pattern || !testString) {
      setMatches([]);
      setError('');
      return;
    }

    try {
      const flagStr = Object.entries(flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join('');
      const regex = new RegExp(pattern, flagStr);
      const allMatches: RegExpMatchArray[] = [];
      
      if (flags.g) {
        let match;
        while ((match = regex.exec(testString)) !== null) {
          allMatches.push(match);
          if (match.index === regex.lastIndex) regex.lastIndex++;
        }
      } else {
        const match = testString.match(regex);
        if (match) allMatches.push(match);
      }
      
      setMatches(allMatches);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setMatches([]);
    }
  }, [pattern, testString, flags]);

  const highlightMatches = () => {
    if (!pattern || !testString || error || matches.length === 0) {
      return testString;
    }

    try {
      const flagStr = Object.entries(flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join('');
      const regex = new RegExp(pattern, flagStr);
      
      const parts = testString.split(regex);
      const matchedParts = testString.match(regex) || [];
      
      const result: React.ReactNode[] = [];
      parts.forEach((part, i) => {
        result.push(part);
        if (matchedParts[i]) {
          result.push(
            <span key={i} className="bg-primary/30 text-primary font-medium px-0.5 rounded">
              {matchedParts[i]}
            </span>
          );
        }
      });
      
      return result;
    } catch {
      return testString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.regexPattern')}</Label>
        <div className="flex gap-2 items-start">
          <span className="text-muted-foreground mt-2">/</span>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="[a-z]+"
            className="font-mono flex-1"
          />
          <span className="text-muted-foreground mt-2">/</span>
          <div className="flex gap-2 mt-1">
            {(['g', 'i', 'm'] as const).map((flag) => (
              <div key={flag} className="flex items-center gap-1">
                <Checkbox
                  id={`flag-${flag}`}
                  checked={flags[flag]}
                  onCheckedChange={(checked) => 
                    setFlags(prev => ({ ...prev, [flag]: !!checked }))
                  }
                />
                <Label htmlFor={`flag-${flag}`} className="font-mono text-sm">{flag}</Label>
              </div>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.testString')}</Label>
        <Textarea
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          placeholder={t('itTools.enterTestString')}
          rows={4}
        />
      </div>

      {testString && !error && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{t('itTools.result')}</Label>
            <Badge variant="outline">{matches.length} {t('itTools.matches')}</Badge>
          </div>
          <div className="p-4 border rounded-lg bg-muted/30 font-mono text-sm whitespace-pre-wrap">
            {highlightMatches()}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-2">
          <Label>{t('itTools.matchDetails')}</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {matches.map((match, index) => (
              <div key={index} className="flex gap-2 text-sm">
                <Badge variant="secondary">{index + 1}</Badge>
                <span className="font-mono">{match[0]}</span>
                <span className="text-muted-foreground">
                  @ index {match.index}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegexTester;
