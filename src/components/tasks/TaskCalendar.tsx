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
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  task_status?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: string | null;
}

interface Profile {
  id: string;
  full_name: string;
}

interface TaskCalendarProps {
  tasks: Task[];
  profiles: Profile[];
  onTaskClick?: (task: Task) => void;
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  profiles,
  onTaskClick,
}) => {
  const { t, dir, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const locale = language === 'ar' ? ar : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
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
              {t('tasks.todayTasks')}
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
            const dayTasks = getTasksForDay(day);
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
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80',
                        getPriorityColor(task.priority)
                      )}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayTasks.length - 3} {t('common.more')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">{t('tasks.priority')}:</span>
          <div className="flex items-center gap-2">
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              {t('priority.p1')}
            </Badge>
            <Badge className="bg-warning text-warning-foreground text-xs">
              {t('priority.p3')}
            </Badge>
            <Badge className="bg-muted text-muted-foreground text-xs">
              {t('priority.p4')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCalendar;
