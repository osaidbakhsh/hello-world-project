import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks, useServers, useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ListTodo,
  Plus,
  Search,
  Calendar,
  Server,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  LayoutGrid,
  CalendarDays,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { exportToPDF } from '@/utils/pdfExport';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskCalendar from '@/components/tasks/TaskCalendar';
import MyTasksWidget from '@/components/tasks/MyTasksWidget';

const Tasks: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: tasks, isLoading, refetch } = useTasks();
  const { data: servers } = useServers();
  const { data: profiles } = useProfiles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const [displayMode, setDisplayMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    server_id: '',
    assigned_to: '',
    priority: 'medium',
    frequency: 'once',
    due_date: '',
  });

  const now = new Date();

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      server_id: '',
      assigned_to: '',
      priority: 'medium',
      frequency: 'once',
      due_date: '',
    });
    setEditingTask(null);
  };

  const getTaskStatus = (task: any) => {
    if (task.status === 'completed') return 'completed';
    if (task.due_date && new Date(task.due_date) < now) return 'overdue';
    return 'pending';
  };

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(profiles.map(p => p.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [profiles]);

  // Get employee name
  const getEmployeeName = (profileId: string | null) => {
    if (!profileId) return 'غير محدد';
    const found = profiles.find(p => p.id === profileId);
    return found?.full_name || 'غير محدد';
  };

  // Get employee department
  const getEmployeeDepartment = (profileId: string | null) => {
    if (!profileId) return '';
    const found = profiles.find(p => p.id === profileId);
    return found?.department || '';
  };

  // Filter tasks based on view mode and filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // View mode filter
    if (viewMode === 'my') {
      result = result.filter(t => t.assigned_to === profile?.id);
    }

    // Employee filter (for team view)
    if (viewMode === 'team' && employeeFilter !== 'all') {
      result = result.filter(t => t.assigned_to === employeeFilter);
    }

    // Department filter (for team view)
    if (viewMode === 'team' && departmentFilter !== 'all') {
      result = result.filter(t => getEmployeeDepartment(t.assigned_to) === departmentFilter);
    }

    // Search filter
    if (searchQuery) {
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Frequency filter
    if (frequencyFilter !== 'all') {
      result = result.filter(t => t.frequency === frequencyFilter);
    }

    return result;
  }, [tasks, viewMode, profile, employeeFilter, departmentFilter, searchQuery, frequencyFilter]);

  // Export tasks to Excel
  const exportTasksExcel = () => {
    const exportData = filteredTasks.map(task => ({
      'عنوان المهمة': task.title,
      'الوصف': task.description || '',
      'الموظف المسؤول': getEmployeeName(task.assigned_to),
      'القسم': getEmployeeDepartment(task.assigned_to),
      'التكرار': task.frequency === 'once' ? 'مرة واحدة' : t(`tasks.${task.frequency}`),
      'تاريخ الاستحقاق': task.due_date || '',
      'الحالة': getTaskStatus(task) === 'completed' ? 'مكتملة' : getTaskStatus(task) === 'overdue' ? 'متأخرة' : 'قيد التنفيذ',
      'تاريخ الإنشاء': new Date(task.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US'),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'المهام');
    XLSX.writeFile(wb, `tasks-${viewMode}-${Date.now()}.xlsx`);
    
    toast({ title: t('common.success'), description: 'تم تصدير المهام بنجاح' });
  };

  // Export tasks to PDF
  const exportTasksPDF = () => {
    const headers = ['المهمة', 'الموظف', 'القسم', 'التكرار', 'الحالة'];
    const rows = filteredTasks.map(task => [
      task.title,
      getEmployeeName(task.assigned_to),
      getEmployeeDepartment(task.assigned_to),
      task.frequency === 'once' ? 'مرة واحدة' : t(`tasks.${task.frequency}`),
      getTaskStatus(task) === 'completed' ? 'مكتملة' : getTaskStatus(task) === 'overdue' ? 'متأخرة' : 'قيد التنفيذ',
    ]);

    exportToPDF({
      title: viewMode === 'team' ? 'تقرير مهام الفريق' : 'تقرير مهامي',
      headers,
      rows,
      filename: `tasks-${viewMode}-${Date.now()}.pdf`,
    });

    toast({ title: t('common.success'), description: 'تم تصدير المهام بنجاح' });
  };

  const tasksByStatus = {
    pending: filteredTasks.filter((t) => getTaskStatus(t) === 'pending'),
    overdue: filteredTasks.filter((t) => getTaskStatus(t) === 'overdue'),
    completed: filteredTasks.filter((t) => getTaskStatus(t) === 'completed'),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: t('common.error'),
        description: 'يرجى إدخال عنوان المهمة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        server_id: formData.server_id || null,
        assigned_to: formData.assigned_to || profile?.id || null,
        priority: formData.priority,
        frequency: formData.frequency,
        due_date: formData.due_date || null,
        status: 'pending',
        created_by: profile?.id,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);
        
        if (error) throw error;
        toast({ title: t('common.success'), description: 'تم تحديث المهمة بنجاح' });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);
        
        if (error) throw error;
        toast({ title: t('common.success'), description: 'تم إضافة المهمة بنجاح' });
      }

      resetForm();
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);
      
      if (error) throw error;
      refetch();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'تم حذف المهمة بنجاح' });
      refetch();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      server_id: task.server_id || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      frequency: task.frequency,
      due_date: task.due_date || '',
    });
    setIsDialogOpen(true);
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      daily: { class: 'bg-info/10 text-info border-info/20', label: t('tasks.daily') },
      weekly: { class: 'bg-primary/10 text-primary border-primary/20', label: t('tasks.weekly') },
      monthly: { class: 'bg-accent/10 text-accent border-accent/20', label: t('tasks.monthly') },
      once: { class: 'bg-muted text-muted-foreground border-border', label: 'مرة واحدة' },
    };
    return badges[frequency] || badges.once;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-success/10', border: 'border-success/20', icon: CheckCircle, iconColor: 'text-success' };
      case 'overdue':
        return { bg: 'bg-destructive/10', border: 'border-destructive/20', icon: AlertTriangle, iconColor: 'text-destructive' };
      default:
        return { bg: 'bg-warning/10', border: 'border-warning/20', icon: Clock, iconColor: 'text-warning' };
    }
  };

  const TaskCard: React.FC<{ task: any }> = ({ task }) => {
    const status = getTaskStatus(task);
    const styles = getStatusStyles(status);
    const StatusIcon = styles.icon;
    const assignee = profiles.find((p) => p.id === task.assigned_to);
    const server = servers.find((s) => s.id === task.server_id);
    const frequencyBadge = getFrequencyBadge(task.frequency);

    return (
      <Card className={cn('card-hover stagger-item', styles.bg, 'border', styles.border)}>
        <div className="pt-4 px-4 pb-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={status === 'completed'}
              onCheckedChange={() => handleToggleComplete(task.id, task.status)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={cn(
                  'font-medium',
                  status === 'completed' && 'line-through text-muted-foreground'
                )}>
                  {task.title}
                </h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
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
                
                {task.due_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.due_date).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                  </div>
                )}

                {assignee && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {assignee.full_name}
                  </div>
                )}

                {server && (
                  <Badge variant="outline" className="text-xs">
                    <Server className="w-3 h-3 me-1" />
                    {server.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <ListTodo className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
            <p className="text-muted-foreground">{filteredTasks.length} مهمة</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 me-2" />
                {t('common.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportTasksExcel}>
                <FileSpreadsheet className="w-4 h-4 me-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTasksPDF}>
                <FileText className="w-4 h-4 me-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('tasks.name')} *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="أدخل عنوان المهمة"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="وصف تفصيلي للمهمة"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.frequency')}</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">مرة واحدة</SelectItem>
                      <SelectItem value="daily">{t('tasks.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('tasks.weekly')}</SelectItem>
                      <SelectItem value="monthly">{t('tasks.monthly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.dueDate')}</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>السيرفر (اختياري)</Label>
                  <Select
                    value={formData.server_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, server_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السيرفر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون سيرفر</SelectItem>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label>{t('tasks.assignee')}</Label>
                    <Select
                      value={formData.assigned_to || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون تعيين</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* View Mode Tabs for Admin */}
      {isAdmin && (
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'my' | 'team')}>
            <TabsList>
              <TabsTrigger value="my" className="gap-2">
                <User className="w-4 h-4" />
                {t('dashboard.myTasks')}
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="w-4 h-4" />
                {t('dashboard.teamTasks')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === 'team' && (
            <div className="flex gap-2">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الموظف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الموظفين</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="pt-6 px-6 pb-6">
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
                <SelectItem value="once">مرة واحدة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Display Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
          <Button
            variant={displayMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDisplayMode('list')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tasks.listView')}</span>
          </Button>
          <Button
            variant={displayMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDisplayMode('kanban')}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tasks.kanban')}</span>
          </Button>
          <Button
            variant={displayMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDisplayMode('calendar')}
            className="gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tasks.calendar')}</span>
          </Button>
        </div>
        
        <Badge variant="secondary" className="text-sm">
          {filteredTasks.length} {t('reports.records')}
        </Badge>
      </div>

      {/* Conditional Display Based on Mode */}
      {displayMode === 'kanban' ? (
        <KanbanBoard 
          tasks={filteredTasks} 
          profiles={profiles}
          onTaskClick={(task) => openEditDialog(task)}
          onStatusChange={async (taskId, newStatus) => {
            try {
              // Get old data for audit
              const task = filteredTasks.find(t => t.id === taskId);
              const oldTaskStatus = (task as any)?.task_status || 'draft';
              const oldStatus = task?.status || 'pending';
              
              // Map task_status to legacy status for Dashboard sync
              const legacyStatus = newStatus === 'done' ? 'completed' : 'pending';
              
              // Update BOTH task_status AND status for sync with Dashboard
              const { error } = await supabase
                .from('tasks')
                .update({ 
                  task_status: newStatus,
                  status: legacyStatus,
                  completed_at: newStatus === 'done' ? new Date().toISOString() : null
                })
                .eq('id', taskId);
              
              if (error) throw error;
              
              // Log to audit with profile ID
              await supabase.from('audit_logs').insert({
                user_id: profile?.id,
                action: 'update',
                table_name: 'tasks',
                record_id: taskId,
                old_data: { task_status: oldTaskStatus, status: oldStatus },
                new_data: { task_status: newStatus, status: legacyStatus },
                entity_name: task?.title,
                user_agent: navigator.userAgent,
              });
              
              toast({
                title: t('common.success'),
                description: language === 'ar' ? 'تم تغيير حالة المهمة' : 'Task status updated',
              });
              
              refetch();
            } catch (error) {
              console.error('Error updating status:', error);
              toast({
                title: t('common.error'),
                description: String(error),
                variant: 'destructive',
              });
            }
          }}
          onCloneTask={async (taskId) => {
            try {
              const task = filteredTasks.find(t => t.id === taskId);
              if (!task) return;
              
              // Clone task without id and timestamps
              const { error } = await supabase.from('tasks').insert({
                title: `${task.title} (نسخة)`,
                description: task.description,
                server_id: task.server_id,
                assigned_to: task.assigned_to,
                priority: task.priority,
                frequency: task.frequency,
                due_date: task.due_date,
                status: 'pending',
                task_status: 'draft',
                created_by: profile?.id,
              });
              
              if (error) throw error;
              
              // Log clone action
              await supabase.from('audit_logs').insert({
                user_id: profile?.id,
                action: 'create',
                table_name: 'tasks',
                entity_name: `${task.title} (نسخة)`,
                new_data: { cloned_from: taskId },
                user_agent: navigator.userAgent,
              });
              
              toast({
                title: t('common.success'),
                description: language === 'ar' ? 'تم نسخ المهمة بنجاح' : 'Task cloned successfully',
              });
              
              refetch();
            } catch (error) {
              console.error('Error cloning task:', error);
              toast({
                title: t('common.error'),
                description: String(error),
                variant: 'destructive',
              });
            }
          }}
        />
      ) : displayMode === 'calendar' ? (
        <TaskCalendar 
          tasks={filteredTasks} 
          profiles={profiles}
          onTaskClick={(task) => openEditDialog(task)}
        />
      ) : (
        /* List View - Original Tabs */
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
              {isLoading ? (
                <div className="col-span-full text-center py-12">جارٍ التحميل...</div>
              ) : filteredTasks.length > 0 ? (
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
                  <p className="text-muted-foreground">لا توجد مهام قيد التنفيذ!</p>
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
                  <p className="text-muted-foreground">لا توجد مهام متأخرة!</p>
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
                  <p className="text-muted-foreground">لم يتم إكمال أي مهمة بعد</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Tasks;
