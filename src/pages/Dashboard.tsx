import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useEmployees, useLicenses, useTasks, useNetworks } from '@/hooks/useLocalStorage';
import StatCard from '@/components/dashboard/StatCard';
import { Server, Users, KeyRound, ListTodo, Network, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { t, dir } = useLanguage();
  const [servers] = useServers();
  const [employees] = useEmployees();
  const [licenses] = useLicenses();
  const [tasks] = useTasks();
  const [networks] = useNetworks();

  // Calculate statistics
  const activeServers = servers.filter((s) => s.status === 'active').length;
  
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLicenses = licenses.filter((l) => {
    const expiry = new Date(l.expiryDate);
    return expiry <= thirtyDaysFromNow && expiry >= now;
  });

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;

  // Server distribution by environment
  const serversByEnv = servers.reduce((acc, server) => {
    acc[server.environment] = (acc[server.environment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <Badge variant="outline" className="text-sm">
          {new Date().toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title={t('dashboard.totalServers')}
          value={servers.length}
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
                  const total = servers.length;
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

        {/* Recent Tasks */}
        <Card className="card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              {t('tasks.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.slice(0, 6).map((task) => {
                  const statusBadge = {
                    pending: { class: 'badge-testing', label: t('tasks.pending') },
                    completed: { class: 'badge-development', label: t('tasks.completed') },
                    overdue: { class: 'badge-production', label: t('tasks.overdue') },
                  }[task.status];

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg bg-secondary/50 space-y-2 stagger-item"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{task.name}</h4>
                        <Badge className={statusBadge.class}>{statusBadge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
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
