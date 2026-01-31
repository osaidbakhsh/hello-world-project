import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Vacation {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
  status?: string | null;
  notes?: string | null;
  days_count?: number | null;
}

interface Profile {
  id: string;
  full_name: string;
  department?: string | null;
}

interface VacationCalendarProps {
  vacations: Vacation[];
  profiles: Profile[];
  onVacationClick?: (vacation: Vacation) => void;
}

const VacationCalendar: React.FC<VacationCalendarProps> = ({
  vacations,
  profiles,
  onVacationClick,
}) => {
  const { t, dir, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const locale = language === 'ar' ? ar : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEmployeeName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || t('auditLog.unknownUser');
  };

  const getVacationsForDay = (day: Date) => {
    return vacations.filter(vacation => {
      const start = parseISO(vacation.start_date);
      const end = parseISO(vacation.end_date);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const getVacationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      annual: 'bg-primary text-primary-foreground',
      sick: 'bg-destructive text-destructive-foreground',
      emergency: 'bg-warning text-warning-foreground',
      unpaid: 'bg-muted text-muted-foreground',
      training: 'bg-info text-info-foreground',
    };
    return colors[type] || 'bg-secondary text-secondary-foreground';
  };

  const getStatusIndicator = (status: string | null | undefined) => {
    if (status === 'approved') return 'ring-2 ring-success';
    if (status === 'rejected') return 'ring-2 ring-destructive opacity-50';
    return 'ring-1 ring-warning'; // pending
  };

  const weekDays = language === 'ar' 
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              {t('vacations.today') || (language === 'ar' ? 'اليوم' : 'Today')}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground p-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const dayVacations = getVacationsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-24 p-1 border rounded-lg transition-colors',
                  isCurrentMonth ? 'bg-background' : 'bg-muted/30',
                  isCurrentDay && 'border-primary border-2'
                )}
              >
                <div
                  className={cn(
                    'text-sm font-medium mb-1 px-1',
                    !isCurrentMonth && 'text-muted-foreground',
                    isCurrentDay && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayVacations.slice(0, 3).map((vacation) => (
                    <div
                      key={vacation.id}
                      onClick={() => onVacationClick?.(vacation)}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80',
                        getVacationTypeColor(vacation.vacation_type),
                        getStatusIndicator(vacation.status)
                      )}
                      title={`${getEmployeeName(vacation.profile_id)} - ${t(`vacations.${vacation.vacation_type}`)}`}
                    >
                      {getEmployeeName(vacation.profile_id)}
                    </div>
                  ))}
                  {dayVacations.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayVacations.length - 3} {t('common.more')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">{t('vacations.type')}:</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-xs">
              {t('vacations.annual')}
            </Badge>
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              {t('vacations.sick')}
            </Badge>
            <Badge className="bg-warning text-warning-foreground text-xs">
              {t('vacations.emergency')}
            </Badge>
            <Badge className="bg-muted text-muted-foreground text-xs">
              {t('vacations.unpaid')}
            </Badge>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <span className="text-sm text-muted-foreground">{t('vacations.status')}:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded ring-2 ring-success bg-muted" />
              <span className="text-xs">{t('vacations.approved')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded ring-1 ring-warning bg-muted" />
              <span className="text-xs">{t('vacations.pending')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded ring-2 ring-destructive bg-muted opacity-50" />
              <span className="text-xs">{t('vacations.rejected')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VacationCalendar;
