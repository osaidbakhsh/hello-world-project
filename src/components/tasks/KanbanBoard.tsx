import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, 
  User, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  GripVertical,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  task_status?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  frequency?: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  profiles: Profile[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

const STATUSES = [
  { key: 'draft', label: 'tasks.draft', color: 'bg-muted' },
  { key: 'assigned', label: 'tasks.assigned', color: 'bg-info/20' },
  { key: 'in_progress', label: 'tasks.inProgress', color: 'bg-warning/20' },
  { key: 'in_review', label: 'tasks.inReview', color: 'bg-primary/20' },
  { key: 'done', label: 'tasks.done', color: 'bg-success/20' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  profiles,
  onTaskClick,
  onStatusChange,
}) => {
  const { t, dir } = useLanguage();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => {
      const taskStatus = task.task_status || task.status || 'draft';
      // Map old status values to new ones
      if (status === 'done' && taskStatus === 'completed') return true;
      if (status === 'in_progress' && taskStatus === 'pending') return true;
      return taskStatus === status;
    });
  };

  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return null;
    const profile = profiles.find(p => p.id === assigneeId);
    return profile?.full_name;
  };

  const getPriorityBadge = (priority: string | undefined) => {
    const priorities: Record<string, { class: string; label: string }> = {
      high: { class: 'bg-destructive/10 text-destructive border-destructive/20', label: t('priority.p1') },
      medium: { class: 'bg-warning/10 text-warning border-warning/20', label: t('priority.p3') },
      low: { class: 'bg-muted text-muted-foreground', label: t('priority.p4') },
      critical: { class: 'bg-destructive text-destructive-foreground', label: t('priority.p1') },
    };
    return priorities[priority || 'medium'] || priorities.medium;
  };

  const getSLAStatus = (task: Task) => {
    if (!task.due_date) return null;
    const now = new Date();
    const due = new Date(task.due_date);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return { status: 'breached', class: 'bg-destructive', label: t('tasks.slaBreach') };
    if (hoursLeft < 4) return { status: 'critical', class: 'bg-destructive/80', label: t('priority.p1') };
    if (hoursLeft < 24) return { status: 'warning', class: 'bg-warning', label: t('priority.p2') };
    return { status: 'ok', class: 'bg-success', label: 'OK' };
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Add drag ghost styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (taskId && onStatusChange) {
      // Find the task's current status
      const task = tasks.find(t => t.id === taskId);
      const currentStatus = task?.task_status || task?.status || 'draft';
      
      if (currentStatus !== newStatus) {
        onStatusChange(taskId, newStatus);
      }
    }
    
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // Quick status change handler
  const handleQuickStatusChange = (taskId: string, newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  };

  // Mark complete / back to in progress
  const handleMarkComplete = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(taskId, 'done');
    }
  };

  const handleBackToProgress = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(taskId, 'in_progress');
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" dir={dir}>
      {STATUSES.map((status) => {
        const statusTasks = getTasksByStatus(status.key);
        const isDragOver = dragOverColumn === status.key;
        
        return (
          <div 
            key={status.key} 
            className="flex-shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, status.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.key)}
          >
            <Card className={cn(
              'h-full transition-all duration-200',
              status.color,
              isDragOver && 'ring-2 ring-primary ring-offset-2 scale-[1.02]'
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{t(status.label)}</span>
                  <Badge variant="secondary" className="text-xs">
                    {statusTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[400px]">
                {statusTasks.map((task) => {
                  const priorityBadge = getPriorityBadge(task.priority);
                  const assignee = getAssigneeName(task.assigned_to);
                  const overdue = isOverdue(task.due_date);
                  const slaStatus = getSLAStatus(task);
                  const isDragging = draggedTaskId === task.id;
                  const taskStatus = task.task_status || task.status || 'draft';
                  
                  return (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
                        overdue && status.key !== 'done' && 'border-destructive/50',
                        isDragging && 'opacity-50 scale-95'
                      )}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('text-xs border', priorityBadge.class)}>
                            {priorityBadge.label}
                          </Badge>
                          
                          {slaStatus && status.key !== 'done' && (
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              slaStatus.class
                            )} title={slaStatus.label} />
                          )}
                          
                          {task.due_date && (
                            <div className={cn(
                              'flex items-center gap-1 text-xs',
                              overdue && status.key !== 'done' ? 'text-destructive' : 'text-muted-foreground'
                            )}>
                              {overdue && status.key !== 'done' ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : (
                                <Calendar className="w-3 h-3" />
                              )}
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        {assignee && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            {assignee}
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t mt-2">
                          {/* Quick Status Dropdown */}
                          <Select
                            value={taskStatus}
                            onValueChange={(value) => handleQuickStatusChange(task.id, value)}
                          >
                            <SelectTrigger 
                              className="h-7 text-xs flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.key} value={s.key}>
                                  {t(s.label)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Mark Complete / Back to Progress */}
                          {status.key !== 'done' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={(e) => handleMarkComplete(e, task.id)}
                              title={t('tasks.markComplete')}
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-success" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={(e) => handleBackToProgress(e, task.id)}
                              title={t('tasks.backToProgress')}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-warning" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {statusTasks.length === 0 && (
                  <div className={cn(
                    'text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg',
                    isDragOver && 'border-primary bg-primary/5'
                  )}>
                    {isDragOver ? t('tasks.dropHere') : t('common.noData')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
