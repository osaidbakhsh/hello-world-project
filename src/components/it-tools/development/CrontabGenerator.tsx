import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

const CrontabGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [minute, setMinute] = useState('0');
  const [hour, setHour] = useState('*');
  const [day, setDay] = useState('*');
  const [month, setMonth] = useState('*');
  const [weekday, setWeekday] = useState('*');
  const [cron, setCron] = useState('0 * * * *');

  const presets = [
    { label: t('itTools.everyMinute'), value: '* * * * *' },
    { label: t('itTools.everyHour'), value: '0 * * * *' },
    { label: t('itTools.everyDay'), value: '0 0 * * *' },
    { label: t('itTools.everyWeek'), value: '0 0 * * 0' },
    { label: t('itTools.everyMonth'), value: '0 0 1 * *' },
    { label: t('itTools.weekdays'), value: '0 9 * * 1-5' },
  ];

  const weekdays = [
    { value: '*', label: t('itTools.any') },
    { value: '0', label: t('itTools.sunday') },
    { value: '1', label: t('itTools.monday') },
    { value: '2', label: t('itTools.tuesday') },
    { value: '3', label: t('itTools.wednesday') },
    { value: '4', label: t('itTools.thursday') },
    { value: '5', label: t('itTools.friday') },
    { value: '6', label: t('itTools.saturday') },
  ];

  useEffect(() => {
    setCron(`${minute} ${hour} ${day} ${month} ${weekday}`);
  }, [minute, hour, day, month, weekday]);

  const applyPreset = (value: string) => {
    const parts = value.split(' ');
    setMinute(parts[0]);
    setHour(parts[1]);
    setDay(parts[2]);
    setMonth(parts[3]);
    setWeekday(parts[4]);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(cron);
    toast.success(t('common.copied'));
  };

  const describeCron = () => {
    // Simple description generator
    let desc = t('itTools.runs');
    if (minute === '*') desc += ` ${t('itTools.everyMinute').toLowerCase()}`;
    else desc += ` ${t('itTools.atMinute')} ${minute}`;
    
    if (hour === '*') desc += ` ${t('itTools.ofEveryHour')}`;
    else desc += ` ${t('itTools.atHour')} ${hour}`;
    
    return desc;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.presets')}</Label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t('itTools.minute')}</Label>
          <Input
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="font-mono text-center"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('itTools.hour')}</Label>
          <Input
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            className="font-mono text-center"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('itTools.day')}</Label>
          <Input
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="font-mono text-center"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('itTools.month')}</Label>
          <Input
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="font-mono text-center"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('itTools.weekday')}</Label>
          <Select value={weekday} onValueChange={setWeekday}>
            <SelectTrigger className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekdays.map((wd) => (
                <SelectItem key={wd.value} value={wd.value}>
                  {wd.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-lg font-bold">{cron}</p>
              <p className="text-sm text-muted-foreground">{describeCron()}</p>
            </div>
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>* = {t('itTools.any')}, */5 = {t('itTools.every5')}, 1-5 = {t('itTools.range')}, 1,15 = {t('itTools.list')}</p>
      </div>
    </div>
  );
};

export default CrontabGenerator;
