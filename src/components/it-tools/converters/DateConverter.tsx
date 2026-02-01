import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

const DateConverter: React.FC = () => {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date());
  const [unixInput, setUnixInput] = useState('');

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDate(newDate);
    }
  };

  const handleUnixChange = () => {
    const timestamp = parseInt(unixInput);
    if (!isNaN(timestamp)) {
      // Handle both seconds and milliseconds
      const ms = timestamp > 10000000000 ? timestamp : timestamp * 1000;
      setDate(new Date(ms));
    } else {
      toast.error(t('itTools.invalidTimestamp'));
    }
  };

  const setNow = () => {
    setDate(new Date());
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const formats = [
    { label: 'ISO 8601', value: date.toISOString() },
    { label: 'Unix Timestamp (s)', value: Math.floor(date.getTime() / 1000).toString() },
    { label: 'Unix Timestamp (ms)', value: date.getTime().toString() },
    { label: 'RFC 2822', value: date.toUTCString() },
    { label: 'Date Only', value: format(date, 'yyyy-MM-dd') },
    { label: 'Time Only', value: format(date, 'HH:mm:ss') },
    { label: 'Full Date/Time', value: format(date, 'yyyy-MM-dd HH:mm:ss') },
    { label: 'Relative', value: formatRelative(date) },
  ];

  function formatRelative(d: Date): string {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.abs(Math.floor(diff / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days ${diff > 0 ? 'ago' : 'from now'}`;
    if (hours > 0) return `${hours} hours ${diff > 0 ? 'ago' : 'from now'}`;
    if (minutes > 0) return `${minutes} minutes ${diff > 0 ? 'ago' : 'from now'}`;
    return `${seconds} seconds ${diff > 0 ? 'ago' : 'from now'}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="flex-1 space-y-2">
          <Label>{t('itTools.selectDate')}</Label>
          <Input
            type="datetime-local"
            value={format(date, "yyyy-MM-dd'T'HH:mm")}
            onChange={handleDateChange}
          />
        </div>
        <Button onClick={setNow} className="mt-8 gap-2">
          <Calendar className="h-4 w-4" />
          {t('itTools.now')}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.fromUnix')}</Label>
        <div className="flex gap-2">
          <Input
            value={unixInput}
            onChange={(e) => setUnixInput(e.target.value)}
            placeholder="1704067200"
            className="font-mono"
          />
          <Button onClick={handleUnixChange}>{t('itTools.convert')}</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {formats.map((fmt, index) => (
          <Card key={index}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{fmt.label}</p>
                <p className="font-mono text-sm truncate">{fmt.value}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(fmt.value)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DateConverter;
