import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServers, useLicenses, useEmployees, useTasks, useNetworks } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Download, Server, Users, KeyRound, ListTodo, Network } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const Reports: React.FC = () => {
  const { t, dir } = useLanguage();
  const [servers] = useServers();
  const [licenses] = useLicenses();
  const [employees] = useEmployees();
  const [tasks] = useTasks();
  const [networks] = useNetworks();
  const { toast } = useToast();

  const exportReport = (type: string) => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'servers':
        data = servers.map((s) => ({
          Name: s.name,
          'IP Address': s.ipAddress,
          OS: s.os,
          Version: s.osVersion,
          Environment: s.environment,
          Status: s.status,
          Owner: employees.find((e) => e.id === s.owner)?.name || s.owner,
          Responsible: employees.find((e) => e.id === s.responsible)?.name || s.responsible,
          Network: networks.find((n) => n.id === s.networkId)?.name || '',
          Description: s.description,
          'Last Update': s.lastUpdate,
        }));
        filename = 'servers-report.xlsx';
        break;
      case 'licenses':
        data = licenses.map((l) => ({
          Name: l.name,
          Product: l.product,
          Vendor: l.vendor,
          'License Key': l.licenseKey,
          'Start Date': l.startDate,
          'Expiry Date': l.expiryDate,
          Cost: l.cost,
          Currency: l.currency,
          Server: servers.find((s) => s.id === l.serverId)?.name || '',
          Notes: l.notes,
        }));
        filename = 'licenses-report.xlsx';
        break;
      case 'employees':
        data = employees.map((e) => ({
          Name: e.name,
          Position: e.position,
          Email: e.email,
          Phone: e.phone,
          Department: e.department,
          Status: e.status,
          'Hire Date': e.hireDate,
          'Total Vacations': e.vacations.length,
          'Total Trainings': e.trainings.length,
          'Assigned Servers': e.assignedServerIds.length,
        }));
        filename = 'employees-report.xlsx';
        break;
      case 'tasks':
        data = tasks.map((t) => ({
          Name: t.name,
          Description: t.description,
          Assignee: employees.find((e) => e.id === t.assigneeId)?.name || '',
          Frequency: t.frequency,
          'Due Date': t.dueDate,
          Status: t.status,
          Server: servers.find((s) => s.id === t.serverId)?.name || '',
          'Completed At': t.completedAt || '',
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
    toast({ title: t('common.success'), description: `${type} report exported` });
  };

  const exportFullReport = () => {
    const wb = XLSX.utils.book_new();

    // Servers sheet
    const serversData = servers.map((s) => ({
      Name: s.name,
      'IP Address': s.ipAddress,
      OS: s.os,
      Version: s.osVersion,
      Environment: s.environment,
      Status: s.status,
      Network: networks.find((n) => n.id === s.networkId)?.name || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serversData), 'Servers');

    // Licenses sheet
    const licensesData = licenses.map((l) => ({
      Name: l.name,
      Product: l.product,
      Vendor: l.vendor,
      'Expiry Date': l.expiryDate,
      Cost: `${l.cost} ${l.currency}`,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(licensesData), 'Licenses');

    // Employees sheet
    const employeesData = employees.map((e) => ({
      Name: e.name,
      Position: e.position,
      Email: e.email,
      Department: e.department,
      Status: e.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeesData), 'Employees');

    // Tasks sheet
    const tasksData = tasks.map((t) => ({
      Name: t.name,
      Frequency: t.frequency,
      'Due Date': t.dueDate,
      Status: t.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), 'Tasks');

    // Networks sheet
    const networksData = networks.map((n) => ({
      Name: n.name,
      Domain: n.domain,
      'IP Range': n.ipRange,
      Description: n.description,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(networksData), 'Networks');

    XLSX.writeFile(wb, 'full-infrastructure-report.xlsx');
    toast({ title: t('common.success'), description: 'Full report exported' });
  };

  const reportCards = [
    {
      title: t('nav.servers'),
      icon: Server,
      count: servers.length,
      type: 'servers',
      color: 'stat-primary',
    },
    {
      title: t('nav.licenses'),
      icon: KeyRound,
      count: licenses.length,
      type: 'licenses',
      color: 'stat-warning',
    },
    {
      title: t('nav.employees'),
      icon: Users,
      count: employees.length,
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

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('nav.reports')}</h1>
        <Button onClick={exportFullReport} className="gap-2">
          <Download className="w-4 h-4" />
          Export Full Report
        </Button>
      </div>

      {/* Summary */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary" />
            Infrastructure Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <Server className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{servers.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.servers')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <Network className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{networks.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.networks')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <KeyRound className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{licenses.length}</p>
              <p className="text-sm text-muted-foreground">{t('nav.licenses')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{employees.length}</p>
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
                  <Badge variant="secondary">{card.count} records</Badge>
                </div>
                <h3 className="font-semibold mb-3">{card.title} Report</h3>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => exportReport(card.type)}
                >
                  <Download className="w-4 h-4" />
                  Export
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
            <CardTitle className="text-lg">Servers by Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['production', 'testing', 'development', 'staging'] as const).map((env) => {
                const count = servers.filter((s) => s.environment === env).length;
                const percentage = servers.length > 0 ? Math.round((count / servers.length) * 100) : 0;
                
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
            <CardTitle className="text-lg">Tasks Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['pending', 'completed', 'overdue'] as const).map((status) => {
                const count = tasks.filter((t) => t.status === status).length;
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
