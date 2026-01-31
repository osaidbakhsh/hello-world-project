import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuditLogs, useProfiles } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Activity, Plus, Edit, Trash2, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const AuditLog: React.FC = () => {
  const { t, dir } = useLanguage();
  const { data: logs, isLoading, refetch } = useAuditLogs(200);
  const { data: profiles } = useProfiles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');

  // Get unique tables from logs
  const uniqueTables = useMemo(() => {
    const tables = new Set<string>();
    logs.forEach(log => {
      if (log.table_name) tables.add(log.table_name);
    });
    return Array.from(tables);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const user = profiles.find(p => p.id === log.user_id);
      const matchesSearch =
        (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.table_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
      
      return matchesSearch && matchesAction && matchesTable;
    });
  }, [logs, profiles, searchQuery, actionFilter, tableFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-success" />;
      case 'update':
        return <Edit className="w-4 h-4 text-warning" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-destructive" />;
      case 'login':
        return <LogIn className="w-4 h-4 text-primary" />;
      case 'logout':
        return <LogOut className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-success/10 text-success border-success/20';
      case 'update':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'delete':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'login':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'logout':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(dir === 'rtl' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return t('auditLog.created');
      case 'update':
        return t('auditLog.updated');
      case 'delete':
        return t('auditLog.deleted');
      case 'login':
        return t('auditLog.login');
      case 'logout':
        return t('auditLog.logout');
      default:
        return action;
    }
  };

  const getTableLabel = (table: string | null) => {
    if (!table) return '-';
    const key = `table.${table}`;
    const translated = t(key);
    return translated !== key ? translated : table;
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('auditLog.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('auditLog.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 me-2" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-xs text-muted-foreground">{t('auditLog.totalRecords')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Plus className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'create').length}</p>
                <p className="text-xs text-muted-foreground">{t('auditLog.created')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Edit className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'update').length}</p>
                <p className="text-xs text-muted-foreground">{t('auditLog.updated')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'delete').length}</p>
                <p className="text-xs text-muted-foreground">{t('auditLog.deleted')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <LogIn className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'login').length}</p>
                <p className="text-xs text-muted-foreground">{t('auditLog.login')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                placeholder={t('auditLog.searchPlaceholder')}
                className="ps-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('auditLog.allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditLog.allActions')}</SelectItem>
                <SelectItem value="create">{t('auditLog.created')}</SelectItem>
                <SelectItem value="update">{t('auditLog.updated')}</SelectItem>
                <SelectItem value="delete">{t('auditLog.deleted')}</SelectItem>
                <SelectItem value="login">{t('auditLog.login')}</SelectItem>
                <SelectItem value="logout">{t('auditLog.logout')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('auditLog.allTables')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditLog.allTables')}</SelectItem>
                {uniqueTables.map(table => (
                  <SelectItem key={table} value={table}>{getTableLabel(table)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('auditLog.dateTime')}</TableHead>
                  <TableHead>{t('auditLog.user')}</TableHead>
                  <TableHead>{t('auditLog.action')}</TableHead>
                  <TableHead>{t('auditLog.table')}</TableHead>
                  <TableHead>{t('auditLog.details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    // First check if the log has stored user_name/user_email, otherwise lookup from profiles
                    const storedUserName = (log as any).user_name;
                    const storedUserEmail = (log as any).user_email;
                    const user = profiles.find(p => p.id === log.user_id);
                    const displayName = storedUserName || user?.full_name || t('auditLog.unknownUser');
                    const displayEmail = storedUserEmail || user?.email || '';
                    const initial = displayName?.charAt(0) || '?';
                    
                    return (
                      <TableRow key={log.id} className="stagger-item">
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {initial}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{displayName}</span>
                              {displayEmail && (
                                <span className="text-xs text-muted-foreground">{displayEmail}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionBadgeClass(log.action)}>
                            <span className="flex items-center gap-1">
                              {getActionIcon(log.action)}
                              {getActionLabel(log.action)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getTableLabel(log.table_name)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {log.new_data ? (
                            <span className="text-xs text-muted-foreground truncate block">
                              {typeof log.new_data === 'object' 
                                ? JSON.stringify(log.new_data).substring(0, 50) + '...'
                                : String(log.new_data).substring(0, 50)
                              }
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{t('auditLog.noRecords')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
