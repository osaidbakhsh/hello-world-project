import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useDomains, useTasks, useProfiles } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/dashboard/StatCard';
import WebAppsWidget from '@/components/dashboard/WebAppsWidget';
import ExpiryWidget from '@/components/dashboard/ExpiryWidget';
import SecurityDashboardWidget from '@/components/dashboard/SecurityDashboardWidget';
import {
  Server,
  Users,
  KeyRound,
  ListTodo,
  Network,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  LayoutDashboard,
  User,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [taskViewMode, setTaskViewMode] = useState<'my' | 'team'>('my');
  const { data: domains } = useDomains();
  const { stats, isLoading } = useDashboardStats(selectedDomainId === 'all' ? undefined : selectedDomainId);
  const { data: tasks } = useTasks();
  const { data: profiles } = useProfiles();

  // Calculate task completion percentage
  const taskCompletionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  const inProgressTasks = stats.pendingTasks - stats.overdueTasks > 0 
    ? stats.pendingTasks - stats.overdueTasks 
    : 0;

  // Filter tasks based on view mode
  const displayedTasks = useMemo(() => {
    if (taskViewMode === 'my') {
      return tasks.filter(t => t.assigned_to === profile?.id);
    }
    // Team tasks - admin sees all
    return tasks;
  }, [tasks, taskViewMode, profile]);

  // Get employee name by profile ID
  const getEmployeeName = (profileId: string | null) => {
    if (!profileId) return 'غير محدد';
    const found = profiles.find(p => p.id === profileId);
    return found?.full_name || 'غير محدد';
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'مرحباً، مدير النظام' : `مرحباً، ${profile?.full_name || 'المستخدم'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Domain Filter - Admin Only */}
          {isAdmin && domains.length > 0 && (
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-[200px]">
                <Network className="w-4 h-4 me-2 text-primary" />
                <SelectValue placeholder={t('dashboard.selectNetwork')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allDomains')}</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge variant="outline" className="text-sm">
            {new Date().toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title={t('dashboard.totalServers')}
          value={stats.totalServers}
          icon={Server}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          title={t('dashboard.activeServers')}
          value={stats.activeServers}
          icon={CheckCircle}
          variant="success"
          isLoading={isLoading}
        />
        <StatCard
          title={t('dashboard.expiringLicenses')}
          value={stats.expiringLicenses}
          icon={KeyRound}
          variant={stats.expiringLicenses > 0 ? 'warning' : 'accent'}
          isLoading={isLoading}
        />
        <StatCard
          title={t('dashboard.pendingTasks')}
          value={stats.pendingTasks}
          icon={ListTodo}
          variant={stats.overdueTasks > 0 ? 'danger' : 'primary'}
          isLoading={isLoading}
        />
        <StatCard
          title={t('dashboard.employees')}
          value={stats.totalEmployees}
          icon={Users}
          variant="accent"
          isLoading={isLoading}
        />
        <StatCard
          title={t('dashboard.domains')}
          value={stats.totalNetworks}
          icon={Network}
          variant="primary"
          isLoading={isLoading}
        />
      </div>

      {/* Web Apps Widget */}
      <WebAppsWidget />

      {/* Expiry Center Widget */}
      <ExpiryWidget />

      {/* Security Dashboard Widget */}
      {isAdmin && <SecurityDashboardWidget />}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Progress Card */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              نسبة إنجاز المهام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>الإجمالي</span>
                <span className="font-bold text-primary">{taskCompletionRate}%</span>
              </div>
              <Progress value={taskCompletionRate} className="h-3" />
            </div>

            {/* Task Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium">{t('tasks.completed')}</span>
                </div>
                <Badge className="bg-success text-success-foreground">{stats.completedTasks}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium">قيد التنفيذ</span>
                </div>
                <Badge className="bg-warning text-warning-foreground">{inProgressTasks}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">{t('tasks.overdue')}</span>
                </div>
                <Badge className="bg-destructive text-destructive-foreground">{stats.overdueTasks}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Card with Team View */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                {t('tasks.title')}
              </CardTitle>
              {isAdmin && (
                <Tabs value={taskViewMode} onValueChange={(v) => setTaskViewMode(v as 'my' | 'team')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="my" className="text-xs px-2">
                      {t('dashboard.myTasks')}
                    </TabsTrigger>
                    <TabsTrigger value="team" className="text-xs px-2">
                      {t('dashboard.teamTasks')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayedTasks.length > 0 ? (
              <div className="space-y-3">
                {displayedTasks.slice(0, 5).map((task) => {
                  const now = new Date();
                  const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';
                  const statusBadge = task.status === 'completed'
                    ? { class: 'badge-development', label: t('tasks.completed') }
                    : isOverdue
                    ? { class: 'badge-production', label: t('tasks.overdue') }
                    : { class: 'badge-testing', label: t('tasks.pending') };

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-secondary/50 space-y-1 stagger-item"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm line-clamp-1">{task.title}</h4>
                        <Badge className={`text-xs shrink-0 ${statusBadge.class}`}>{statusBadge.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{task.frequency === 'once' ? 'مرة واحدة' : t(`tasks.${task.frequency}`)}</span>
                          {taskViewMode === 'team' && task.assigned_to && (
                            <span className="flex items-center gap-1 text-primary">
                              <User className="w-3 h-3" />
                              {getEmployeeName(task.assigned_to)}
                            </span>
                          )}
                        </div>
                        {task.due_date && (
                          <span>
                            {new Date(task.due_date).toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('common.noData')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
