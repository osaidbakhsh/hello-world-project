import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status?: string;
  task_status?: string;
  priority?: string;
  due_date?: string | null;
  completed_at?: string | null;
}

interface MyTasksWidgetProps {
  tasks: Task[];
  profileId: string;
  onTaskComplete?: (taskId: string, currentStatus: string) => void;
  onViewAll?: () => void;
}

const MyTasksWidget: React.FC<MyTasksWidgetProps> = ({
  tasks,
  profileId,
  onTaskComplete,
  onViewAll,
}) => {
  const { t, dir } = useLanguage();
  const now = new Date();

  const categorizedTasks = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    tasks.forEach(task => {
      const status = task.task_status || task.status;
      
      if (status === 'completed' || status === 'done' || status === 'closed') {
        completed.push(task);
        return;
      }

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (dueDate < todayStart) {
          overdue.push(task);
        } else if (dueDate >= todayStart && dueDate < todayEnd) {
          today.push(task);
        } else {
          upcoming.push(task);
        }
      } else {
        upcoming.push(task);
      }
    });

    return { overdue, today, upcoming, completed };
  }, [tasks, now]);

  const TaskItem: React.FC<{ task: Task; variant: 'overdue' | 'today' | 'upcoming' }> = ({ task, variant }) => {
    const status = task.task_status || task.status;
    const isCompleted = status === 'completed' || status === 'done';
    
    const variantStyles = {
      overdue: 'border-destructive/30 bg-destructive/5',
      today: 'border-warning/30 bg-warning/5',
      upcoming: 'border-border',
    };

    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        variantStyles[variant]
      )}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onTaskComplete?.(task.id, status || 'pending')}
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            isCompleted && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </p>
          {task.due_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
            </p>
          )}
        </div>
        {task.priority === 'high' && (
          <Badge variant="destructive" className="text-xs">
            {t('priority.p1')}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{t('tasks.myTasks')}</CardTitle>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            {t('common.view')}
            <ChevronRight className="w-4 h-4 ms-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Section */}
        {categorizedTasks.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {t('tasks.overdueTasks')} ({categorizedTasks.overdue.length})
              </span>
            </div>
            <div className="space-y-2">
              {categorizedTasks.overdue.slice(0, 3).map(task => (
                <TaskItem key={task.id} task={task} variant="overdue" />
              ))}
            </div>
          </div>
        )}

        {/* Today Section */}
        {categorizedTasks.today.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">
                {t('tasks.todayTasks')} ({categorizedTasks.today.length})
              </span>
            </div>
            <div className="space-y-2">
              {categorizedTasks.today.slice(0, 3).map(task => (
                <TaskItem key={task.id} task={task} variant="today" />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {categorizedTasks.upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t('tasks.upcomingTasks')} ({categorizedTasks.upcoming.length})
              </span>
            </div>
            <div className="space-y-2">
              {categorizedTasks.upcoming.slice(0, 3).map(task => (
                <TaskItem key={task.id} task={task} variant="upcoming" />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('common.noData')}</p>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
          <span>{categorizedTasks.completed.length} {t('tasks.done')}</span>
          <span>{tasks.length - categorizedTasks.completed.length} {t('tasks.pending')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyTasksWidget;
