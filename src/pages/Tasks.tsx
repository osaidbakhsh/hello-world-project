import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTasks, useEmployees, useServers } from '@/hooks/useLocalStorage';
import { Task, TaskFrequency, TaskStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, ListTodo, CheckCircle, Clock, AlertTriangle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Tasks: React.FC = () => {
  const { t, dir } = useLanguage();
  const [tasks, setTasks] = useTasks();
  const [employees] = useEmployees();
  const [servers] = useServers();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    description: '',
    assigneeId: '',
    frequency: 'once',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending',
    serverId: '',
  });

  const now = new Date();

  const getTaskStatus = (task: Task): TaskStatus => {
    if (task.status === 'completed') return 'completed';
    const dueDate = new Date(task.dueDate);
    if (dueDate < now) return 'overdue';
    return 'pending';
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFrequency = frequencyFilter === 'all' || task.frequency === frequencyFilter;
    return matchesSearch && matchesFrequency;
  });

  const tasksByStatus = {
    pending: filteredTasks.filter((t) => getTaskStatus(t) === 'pending'),
    overdue: filteredTasks.filter((t) => getTaskStatus(t) === 'overdue'),
    completed: filteredTasks.filter((t) => getTaskStatus(t) === 'completed'),
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.dueDate) {
      toast({
        title: t('common.error'),
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    
    if (editingTask) {
      setTasks(tasks.map((t) =>
        t.id === editingTask.id
          ? { ...t, ...formData } as Task
          : t
      ));
      toast({ title: t('common.success'), description: 'Task updated' });
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        name: formData.name || '',
        description: formData.description || '',
        assigneeId: formData.assigneeId || '',
        frequency: formData.frequency as TaskFrequency || 'once',
        dueDate: formData.dueDate || '',
        status: 'pending',
        serverId: formData.serverId,
        createdAt: now,
      };
      setTasks([...tasks, newTask]);
      toast({ title: t('common.success'), description: 'Task added' });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(tasks.map((t) => {
      if (t.id === taskId) {
        const newStatus = t.status === 'completed' ? 'pending' : 'completed';
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
        };
      }
      return t;
    }));
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData(task);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
    toast({ title: t('common.success'), description: 'Task deleted' });
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      name: '',
      description: '',
      assigneeId: '',
      frequency: 'once',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      serverId: '',
    });
  };

  const getFrequencyBadge = (frequency: TaskFrequency) => {
    const badges = {
      daily: { class: 'bg-info/10 text-info border-info/20', label: t('tasks.daily') },
      weekly: { class: 'bg-primary/10 text-primary border-primary/20', label: t('tasks.weekly') },
      monthly: { class: 'bg-accent/10 text-accent border-accent/20', label: t('tasks.monthly') },
      once: { class: 'bg-muted text-muted-foreground border-border', label: 'Once' },
    };
    return badges[frequency];
  };

  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-success/10', border: 'border-success/20', icon: CheckCircle, iconColor: 'text-success' };
      case 'overdue':
        return { bg: 'bg-destructive/10', border: 'border-destructive/20', icon: AlertTriangle, iconColor: 'text-destructive' };
      default:
        return { bg: 'bg-warning/10', border: 'border-warning/20', icon: Clock, iconColor: 'text-warning' };
    }
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const status = getTaskStatus(task);
    const styles = getStatusStyles(status);
    const StatusIcon = styles.icon;
    const assignee = employees.find((e) => e.id === task.assigneeId);
    const server = servers.find((s) => s.id === task.serverId);
    const frequencyBadge = getFrequencyBadge(task.frequency);

    return (
      <Card className={cn('card-hover stagger-item', styles.bg, 'border', styles.border)}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={status === 'completed'}
              onCheckedChange={() => handleToggleComplete(task.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={cn(
                  'font-medium',
                  status === 'completed' && 'line-through text-muted-foreground'
                )}>
                  {task.name}
                </h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(task)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(task.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={cn('text-xs border', frequencyBadge.class)}>
                  {frequencyBadge.label}
                </Badge>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                </div>

                {assignee && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {assignee.name}
                  </div>
                )}

                {server && (
                  <Badge variant="outline" className="text-xs">
                    {server.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 me-2" />
              {t('tasks.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? t('common.edit') : t('tasks.add')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('tasks.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.frequency')}</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value as TaskFrequency })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">{t('tasks.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('tasks.weekly')}</SelectItem>
                      <SelectItem value="monthly">{t('tasks.monthly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.dueDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.assignee')}</Label>
                  <Select
                    value={formData.assigneeId || ''}
                    onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Server</Label>
                  <Select
                    value={formData.serverId || ''}
                    onValueChange={(value) => setFormData({ ...formData, serverId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search')}
                className="ps-10"
              />
            </div>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="daily">{t('tasks.daily')}</SelectItem>
                <SelectItem value="weekly">{t('tasks.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('tasks.monthly')}</SelectItem>
                <SelectItem value="once">Once</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Board */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.all')}</span>
            <Badge variant="secondary" className="ms-1">{filteredTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="hidden sm:inline">{t('tasks.pending')}</span>
            <Badge variant="secondary" className="ms-1">{tasksByStatus.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="hidden sm:inline">{t('tasks.overdue')}</span>
            <Badge variant="secondary" className="ms-1">{tasksByStatus.overdue.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="hidden sm:inline">{t('tasks.completed')}</span>
            <Badge variant="secondary" className="ms-1">{tasksByStatus.completed.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="col-span-full text-center py-12">
                <ListTodo className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksByStatus.pending.length > 0 ? (
              tasksByStatus.pending.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="col-span-full text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success/50" />
                <p className="text-muted-foreground">No pending tasks!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksByStatus.overdue.length > 0 ? (
              tasksByStatus.overdue.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="col-span-full text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success/50" />
                <p className="text-muted-foreground">No overdue tasks!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksByStatus.completed.length > 0 ? (
              tasksByStatus.completed.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="col-span-full text-center py-12">
                <ListTodo className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">No completed tasks yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tasks;
