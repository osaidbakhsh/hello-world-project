import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useLicenses, useTasks, useProfiles, useNetworks, useDomains } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileBarChart, Download, Server, Users, KeyRound, ListTodo, Network, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const Reports: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { data: servers, isLoading: serversLoading } = useServers();
  const { data: licenses, isLoading: licensesLoading } = useLicenses();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: networks, isLoading: networksLoading } = useNetworks();
  const { data: domains } = useDomains();
  const { toast } = useToast();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');

  // Filter data by domain
  const filteredServers = useMemo(() => {
    if (!selectedDomainId || selectedDomainId === 'all') return servers;
    const domainNetworks = networks.filter(n => n.domain_id === selectedDomainId);
    const networkIds = domainNetworks.map(n => n.id);
    return servers.filter(s => s.network_id && networkIds.includes(s.network_id));
  }, [servers, networks, selectedDomainId]);

  const filteredLicenses = useMemo(() => {
    if (!selectedDomainId || selectedDomainId === 'all') return licenses;
    return licenses.filter(l => l.domain_id === selectedDomainId);
  }, [licenses, selectedDomainId]);

  const filteredNetworks = useMemo(() => {
    if (!selectedDomainId || selectedDomainId === 'all') return networks;
    return networks.filter(n => n.domain_id === selectedDomainId);
  }, [networks, selectedDomainId]);

  const isLoading = serversLoading || licensesLoading || profilesLoading || tasksLoading || networksLoading;

  const exportReport = (type: string) => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'servers':
        data = filteredServers.map((s) => ({
          [t('servers.name')]: s.name,
          [t('servers.ip')]: s.ip_address,
          [t('servers.os')]: s.operating_system,
          [t('servers.environment')]: t(`env.${s.environment}`),
          [t('servers.status')]: s.status === 'active' ? t('status.active') : t('status.inactive'),
          [t('servers.owner')]: s.owner,
          [t('servers.responsible')]: s.responsible_user,
          [t('nav.networks')]: networks.find((n) => n.id === s.network_id)?.name || '',
          [t('servers.notes')]: s.notes,
        }));
        filename = 'servers-report.xlsx';
        break;
      case 'licenses':
        data = filteredLicenses.map((l) => ({
          [t('licenses.name')]: l.name,
          [t('licenses.vendor')]: l.vendor,
          [t('licenses.key')]: l.license_key,
          [t('licenses.purchaseDate')]: l.purchase_date,
          [t('licenses.expiryDate')]: l.expiry_date,
          [t('licenses.cost')]: l.cost,
          [t('licenses.quantity')]: l.quantity,
          [t('licenses.status')]: l.status,
          [t('servers.notes')]: l.notes,
        }));
        filename = 'licenses-report.xlsx';
        break;
      case 'employees':
        data = profiles.map((e) => ({
          [t('employees.name')]: e.full_name,
          [t('employees.position')]: e.position,
          [t('employees.email')]: e.email,
          [t('employees.department')]: e.department,
          [t('employees.role')]: e.role === 'admin' ? t('employees.admin') : t('employees.employee'),
          [t('employees.phone')]: e.phone,
        }));
        filename = 'employees-report.xlsx';
        break;
      case 'tasks':
        data = tasks.map((task) => ({
          [t('tasks.title')]: task.title,
          [t('tasks.description')]: task.description,
          [t('tasks.assignee')]: profiles.find((p) => p.id === task.assigned_to)?.full_name || '',
          [t('tasks.frequency')]: task.frequency,
          [t('tasks.dueDate')]: task.due_date,
          [t('tasks.status')]: t(`tasks.${task.status}`),
          [t('tasks.priority')]: task.priority,
        }));
        filename = 'tasks-report.xlsx';
        break;
      default:
        return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
    XLSX.writeFile(wb, filename);
    toast({ title: t('common.success'), description: t('reports.exportSuccess') });
  };

  const exportFullReport = () => {
    const wb = XLSX.utils.book_new();

    // Servers sheet
    const serversData = filteredServers.map((s) => ({
      [t('servers.name')]: s.name,
      [t('servers.ip')]: s.ip_address,
      [t('servers.os')]: s.operating_system,
      [t('servers.environment')]: t(`env.${s.environment}`),
      [t('servers.status')]: s.status === 'active' ? t('status.active') : t('status.inactive'),
      [t('nav.networks')]: networks.find((n) => n.id === s.network_id)?.name || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serversData), t('nav.servers'));

    // Licenses sheet
    const licensesData = filteredLicenses.map((l) => ({
      [t('licenses.name')]: l.name,
      [t('licenses.vendor')]: l.vendor,
      [t('licenses.expiryDate')]: l.expiry_date,
      [t('licenses.cost')]: l.cost,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(licensesData), t('nav.licenses'));

    // Employees sheet
    const employeesData = profiles.map((e) => ({
      [t('employees.name')]: e.full_name,
      [t('employees.position')]: e.position,
      [t('employees.email')]: e.email,
      [t('employees.department')]: e.department,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeesData), t('nav.employees'));

    // Tasks sheet
    const tasksData = tasks.map((task) => ({
      [t('tasks.title')]: task.title,
      [t('tasks.frequency')]: task.frequency,
      [t('tasks.dueDate')]: task.due_date,
      [t('tasks.status')]: t(`tasks.${task.status}`),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), t('nav.tasks'));

    // Networks sheet
    const networksData = filteredNetworks.map((n) => ({
      [t('networks.name')]: n.name,
      [t('networks.subnet')]: n.subnet,
      [t('networks.gateway')]: n.gateway,
      [t('networks.description')]: n.description,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(networksData), t('nav.networks'));

    XLSX.writeFile(wb, 'full-infrastructure-report.xlsx');
    toast({ title: t('common.success'), description: t('reports.fullExportSuccess') });
  };

  const reportCards = [
    {
      title: t('nav.servers'),
      icon: Server,
      count: filteredServers.length,
      type: 'servers',
      color: 'stat-primary',
    },
    {
      title: t('nav.licenses'),
      icon: KeyRound,
      count: filteredLicenses.length,
      type: 'licenses',
      color: 'stat-warning',
    },
    {
      title: t('nav.employees'),
      icon: Users,
      count: profiles.length,
      type: 'employees',
      color: 'stat-accent',
    },
    {
      title: t('nav.tasks'),
      icon: ListTodo,
      count: tasks.length,
      type: 'tasks',
      color: 'stat-success',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('nav.reports')}</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Domain Filter */}
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-[180px]">
              <Globe className="w-4 h-4 me-2" />
              <SelectValue placeholder={t('reports.allDomains')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.allDomains')}</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportFullReport} className="gap-2">
            <Download className="w-4 h-4" />
            {t('reports.exportFull')}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary" />
            {t('reports.infrastructureSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <Server className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{filteredServers.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.servers')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <Network className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{filteredNetworks.length}</p>
              <p className="text-sm text-muted-foreground">{t('reports.networks')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <KeyRound className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{filteredLicenses.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.licenses')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.employees')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <ListTodo className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.tasks')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.type} className="card-hover overflow-hidden">
              <div className={`h-1 ${card.color}`} />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-secondary">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <Badge variant="secondary">{card.count} {t('reports.records')}</Badge>
                </div>
                <h3 className="font-semibold mb-3">{card.title} {t('reports.report')}</h3>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => exportReport(card.type)}
                >
                  <Download className="w-4 h-4" />
                  {t('common.export')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servers by Environment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.serversByEnv')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['production', 'testing', 'development', 'staging'] as const).map((env) => {
                const count = filteredServers.filter((s) => s.environment === env).length;
                const percentage = filteredServers.length > 0 ? Math.round((count / filteredServers.length) * 100) : 0;
                
                const envColors = {
                  production: { bar: 'bg-destructive', badge: 'badge-production' },
                  testing: { bar: 'bg-warning', badge: 'badge-testing' },
                  development: { bar: 'bg-success', badge: 'badge-development' },
                  staging: { bar: 'bg-staging', badge: 'badge-staging' },
                };

                return (
                  <div key={env} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={envColors[env].badge}>{t(`env.${env}`)}</Badge>
                      <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${envColors[env].bar} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.tasksStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['pending', 'completed', 'overdue'] as const).map((status) => {
                const count = tasks.filter((task) => task.status === status).length;
                const percentage = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                
                const statusColors = {
                  pending: 'bg-warning',
                  completed: 'bg-success',
                  overdue: 'bg-destructive',
                };

                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize">{t(`tasks.${status}`)}</span>
                      <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[status]} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
