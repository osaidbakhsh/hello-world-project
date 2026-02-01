import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const TextStats: React.FC = () => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [stats, setStats] = useState({
    characters: 0,
    charactersNoSpaces: 0,
    words: 0,
    sentences: 0,
    paragraphs: 0,
    lines: 0,
    bytes: 0,
  });

  useEffect(() => {
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    const lines = text.split('\n').length;
    const bytes = new Blob([text]).size;

    setStats({
      characters: chars,
      charactersNoSpaces: charsNoSpaces,
      words,
      sentences,
      paragraphs,
      lines,
      bytes,
    });
  }, [text]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statItems = [
    { label: t('itTools.characters'), value: stats.characters.toLocaleString() },
    { label: t('itTools.charactersNoSpaces'), value: stats.charactersNoSpaces.toLocaleString() },
    { label: t('itTools.words'), value: stats.words.toLocaleString() },
    { label: t('itTools.sentences'), value: stats.sentences.toLocaleString() },
    { label: t('itTools.paragraphs'), value: stats.paragraphs.toLocaleString() },
    { label: t('itTools.lines'), value: stats.lines.toLocaleString() },
    { label: t('itTools.size'), value: formatBytes(stats.bytes) },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.inputText')}</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('itTools.enterTextToAnalyze')}
          rows={6}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statItems.map((item, index) => (
          <Card key={index}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{item.value}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TextStats;
