import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useEmployees, useLicenses, useTasks, useNetworks } from '@/hooks/useLocalStorage';
import StatCard from '@/components/dashboard/StatCard';
import { Progress } from '@/components/ui/progress';
import { Server, Users, KeyRound, ListTodo, Network, AlertTriangle, CheckCircle, TrendingUp, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { t, dir } = useLanguage();
  const [servers] = useServers();
  const [employees] = useEmployees();
  const [licenses] = useLicenses();
  const [tasks] = useTasks();
  const [networks] = useNetworks();
  
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('all');

  // Filter servers by network
  const filteredServers = selectedNetworkId === 'all' 
    ? servers 
    : servers.filter(s => s.networkId === selectedNetworkId);

  // Calculate statistics based on filtered servers
  const activeServers = filteredServers.filter((s) => s.status === 'active').length;
  
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Filter licenses for selected network's servers
  const filteredLicenses = selectedNetworkId === 'all'
    ? licenses
    : licenses.filter(l => {
        const server = servers.find(s => s.id === l.serverId);
        return server?.networkId === selectedNetworkId;
      });

  const expiringLicenses = filteredLicenses.filter((l) => {
    const expiry = new Date(l.expiryDate);
    return expiry <= thirtyDaysFromNow && expiry >= now;
  });

  // Task statistics
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    return new Date(t.dueDate) < now;
  }).length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const inProgressTasks = pendingTasks - overdueTasks > 0 ? pendingTasks - overdueTasks : 0;

  // Server distribution by environment
  const serversByEnv = filteredServers.reduce((acc, server) => {
    acc[server.environment] = (acc[server.environment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header with Network Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          {selectedNetwork && (
            <p className="text-muted-foreground mt-1">
              {selectedNetwork.domain} • {selectedNetwork.ipRange}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
            <SelectTrigger className="w-[200px]">
              <Network className="w-4 h-4 me-2 text-primary" />
              <SelectValue placeholder={t('dashboard.selectNetwork')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allNetworks')}</SelectItem>
              {networks.map((network) => (
                <SelectItem key={network.id} value={network.id}>
                  {network.name} ({network.domain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          value={filteredServers.length}
          icon={Server}
          variant="primary"
        />
        <StatCard
          title={t('dashboard.activeServers')}
          value={activeServers}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title={t('dashboard.expiringLicenses')}
          value={expiringLicenses.length}
          icon={KeyRound}
          variant={expiringLicenses.length > 0 ? 'warning' : 'accent'}
        />
        <StatCard
          title={t('dashboard.pendingTasks')}
          value={pendingTasks}
          icon={ListTodo}
          variant={overdueTasks > 0 ? 'danger' : 'primary'}
        />
        <StatCard
          title={t('dashboard.employees')}
          value={employees.length}
          icon={Users}
          variant="accent"
        />
        <StatCard
          title={t('dashboard.networks')}
          value={networks.length}
          icon={Network}
          variant="primary"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Licenses Alert */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              {t('licenses.title')}
            </CardTitle>
            <Badge variant={expiringLicenses.length > 0 ? 'destructive' : 'secondary'}>
              {expiringLicenses.length} {t('licenses.expiryDate')}
            </Badge>
          </CardHeader>
          <CardContent>
            {expiringLicenses.length > 0 ? (
              <div className="space-y-3">
                {expiringLicenses.slice(0, 5).map((license) => {
                  const expiry = new Date(license.expiryDate);
                  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={license.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium">{license.name}</p>
                        <p className="text-sm text-muted-foreground">{license.product}</p>
                      </div>
                      <Badge
                        className={cn(
                          daysLeft <= 7 ? 'badge-production' : 'badge-testing'
                        )}
                      >
                        {daysLeft} {t('common.days')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                <p>{t('common.noData')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Server Distribution */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              {t('servers.environment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(serversByEnv).length > 0 ? (
                Object.entries(serversByEnv).map(([env, count]) => {
                  const total = filteredServers.length;
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  
                  const envBadgeClass = {
                    production: 'badge-production',
                    testing: 'badge-testing',
                    development: 'badge-development',
                    staging: 'badge-staging',
                  }[env] || '';

                  return (
                    <div key={env} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={envBadgeClass}>
                          {t(`env.${env}`)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-500',
                            env === 'production' && 'bg-destructive',
                            env === 'testing' && 'bg-warning',
                            env === 'development' && 'bg-success',
                            env === 'staging' && 'bg-staging'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('common.noData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task Progress Card */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Completion</span>
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
                <Badge className="bg-success text-success-foreground">{completedTasks}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                <Badge className="bg-warning text-warning-foreground">{inProgressTasks}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">{t('tasks.overdue')}</span>
                </div>
                <Badge className="bg-destructive text-destructive-foreground">{overdueTasks}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              {t('tasks.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => {
                  const isOverdue = new Date(task.dueDate) < now && task.status !== 'completed';
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
                        <h4 className="font-medium text-sm line-clamp-1">{task.name}</h4>
                        <Badge className={cn("text-xs shrink-0", statusBadge.class)}>{statusBadge.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t(`tasks.${task.frequency}`)}</span>
                        <span>
                          {new Date(task.dueDate).toLocaleDateString(
                            dir === 'rtl' ? 'ar-SA' : 'en-US'
                          )}
                        </span>
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
