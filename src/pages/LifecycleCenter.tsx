import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDomains, useServers, useNetworks } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Clock,
  AlertTriangle,
  Shield,
  Calendar,
  Server,
  Filter,
  Download,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, differenceInDays, parseISO, addDays, isBefore, isAfter } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface LifecycleItem {
  id: string;
  name: string;
  type: 'warranty' | 'eol' | 'eos';
  date: string;
  daysRemaining: number;
  severity: 'critical' | 'warning' | 'ok' | 'expired';
  vendor?: string;
  model?: string;
  os?: string;
}

const LifecycleCenter: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { data: domains } = useDomains();
  const { data: servers } = useServers();
  const { data: networks } = useNetworks();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('90');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  const dateLocale = language === 'ar' ? ar : enUS;
  const today = new Date();

  // Filter servers by domain
  const domainServers = useMemo(() => {
    if (!servers || !networks) return [];
    if (selectedDomainId === 'all') return servers;
    
    const domainNetworkIds = networks
      .filter(n => n.domain_id === selectedDomainId)
      .map(n => n.id);
    
    return servers.filter(s => s.network_id && domainNetworkIds.includes(s.network_id));
  }, [servers, networks, selectedDomainId]);

  // Calculate lifecycle items
  const lifecycleItems = useMemo(() => {
    const items: LifecycleItem[] = [];
    const periodDays = parseInt(periodFilter);

    domainServers.forEach(server => {
      // Warranty expiration
      if (server.warranty_end) {
        const warrantyDate = parseISO(server.warranty_end);
        const daysRemaining = differenceInDays(warrantyDate, today);
        
        if (typeFilter === 'all' || typeFilter === 'warranty') {
          if (daysRemaining <= periodDays) {
            items.push({
              id: `${server.id}-warranty`,
              name: server.name,
              type: 'warranty',
              date: server.warranty_end,
              daysRemaining,
              severity: daysRemaining < 0 ? 'expired' : daysRemaining <= 30 ? 'critical' : daysRemaining <= 90 ? 'warning' : 'ok',
              vendor: server.vendor || undefined,
              model: server.model || undefined,
            });
          }
        }
      }

      // EOL (End of Life)
      if (server.eol_date) {
        const eolDate = parseISO(server.eol_date);
        const daysRemaining = differenceInDays(eolDate, today);
        
        if (typeFilter === 'all' || typeFilter === 'eol') {
          if (daysRemaining <= periodDays) {
            items.push({
              id: `${server.id}-eol`,
              name: server.name,
              type: 'eol',
              date: server.eol_date,
              daysRemaining,
              severity: daysRemaining < 0 ? 'expired' : daysRemaining <= 30 ? 'critical' : daysRemaining <= 90 ? 'warning' : 'ok',
              os: server.operating_system || undefined,
            });
          }
        }
      }

      // EOS (End of Support)
      if (server.eos_date) {
        const eosDate = parseISO(server.eos_date);
        const daysRemaining = differenceInDays(eosDate, today);
        
        if (typeFilter === 'all' || typeFilter === 'eos') {
          if (daysRemaining <= periodDays) {
            items.push({
              id: `${server.id}-eos`,
              name: server.name,
              type: 'eos',
              date: server.eos_date,
              daysRemaining,
              severity: daysRemaining < 0 ? 'expired' : daysRemaining <= 30 ? 'critical' : daysRemaining <= 90 ? 'warning' : 'ok',
              os: server.operating_system || undefined,
            });
          }
        }
      }
    });

    // Sort by days remaining (most urgent first)
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [domainServers, periodFilter, typeFilter, today]);

  // Statistics
  const stats = useMemo(() => {
    const warrantyItems = lifecycleItems.filter(i => i.type === 'warranty');
    const eolItems = lifecycleItems.filter(i => i.type === 'eol');
    const eosItems = lifecycleItems.filter(i => i.type === 'eos');
    const expiredItems = lifecycleItems.filter(i => i.severity === 'expired');
    const criticalItems = lifecycleItems.filter(i => i.severity === 'critical');
    const warningItems = lifecycleItems.filter(i => i.severity === 'warning');

    return {
      total: lifecycleItems.length,
      warranty: warrantyItems.length,
      eol: eolItems.length,
      eos: eosItems.length,
      expired: expiredItems.length,
      critical: criticalItems.length,
      warning: warningItems.length,
    };
  }, [lifecycleItems]);

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'expired':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 me-1" />{t('lifecycle.expired')}</Badge>;
      case 'critical':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 me-1" />{t('lifecycle.critical')}</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 me-1" />{t('lifecycle.warning')}</Badge>;
      case 'ok':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 me-1" />{t('lifecycle.ok')}</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'warranty':
        return <Badge variant="outline"><Shield className="w-3 h-3 me-1" />{t('lifecycle.warranty')}</Badge>;
      case 'eol':
        return <Badge variant="outline"><Clock className="w-3 h-3 me-1" />{t('lifecycle.eol')}</Badge>;
      case 'eos':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 me-1" />{t('lifecycle.eos')}</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Timeline data
  const timelineData = useMemo(() => {
    const quarters: { label: string; items: LifecycleItem[] }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 4; i++) {
      const quarterStart = addDays(now, i * 90);
      const quarterEnd = addDays(now, (i + 1) * 90);
      const label = `Q${Math.floor((quarterStart.getMonth() + 3) / 3)} ${quarterStart.getFullYear()}`;
      
      quarters.push({
        label,
        items: lifecycleItems.filter(item => {
          const itemDate = parseISO(item.date);
          return isAfter(itemDate, quarterStart) && isBefore(itemDate, quarterEnd);
        }),
      });
    }
    
    return quarters;
  }, [lifecycleItems]);

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('lifecycle.title')}</h1>
          <p className="text-muted-foreground">{t('lifecycle.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('domainSummary.selectDomain')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allDomains')}</SelectItem>
              {domains?.map(domain => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 {t('common.days')}</SelectItem>
              <SelectItem value="90">90 {t('common.days')}</SelectItem>
              <SelectItem value="180">180 {t('common.days')}</SelectItem>
              <SelectItem value="365">{t('lifecycle.year')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="warranty">{t('lifecycle.warranty')}</SelectItem>
              <SelectItem value="eol">{t('lifecycle.eol')}</SelectItem>
              <SelectItem value="eos">{t('lifecycle.eos')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 me-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.total')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Server className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.expired')}</p>
                <p className="text-2xl font-bold text-red-500">{stats.expired}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.critical')}</p>
                <p className="text-2xl font-bold text-orange-500">{stats.critical}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.warning')}</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.warranty')}</p>
                <p className="text-2xl font-bold">{stats.warranty}</p>
              </div>
              <Shield className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.eol')}</p>
                <p className="text-2xl font-bold">{stats.eol}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('lifecycle.eos')}</p>
                <p className="text-2xl font-bold">{stats.eos}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Server className="w-4 h-4 me-2" />
            {t('lifecycle.overview')}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="w-4 h-4 me-2" />
            {t('lifecycle.timeline')}
          </TabsTrigger>
          <TabsTrigger value="table">
            <Filter className="w-4 h-4 me-2" />
            {t('lifecycle.details')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {lifecycleItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500/30 mb-4" />
                <p className="text-muted-foreground">{t('lifecycle.noItemsExpiring')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lifecycleItems.slice(0, 12).map(item => (
                <Card key={item.id} className={
                  item.severity === 'expired' ? 'border-red-500' :
                  item.severity === 'critical' ? 'border-orange-500' :
                  item.severity === 'warning' ? 'border-yellow-500' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      {getSeverityBadge(item.severity)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(item.type)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(parseISO(item.date), 'PP', { locale: dateLocale })}</span>
                      </div>
                      <div className="text-sm">
                        {item.daysRemaining < 0 ? (
                          <span className="text-red-500">
                            {t('lifecycle.expiredAgo')} {Math.abs(item.daysRemaining)} {t('common.days')}
                          </span>
                        ) : (
                          <span className={item.daysRemaining <= 30 ? 'text-orange-500' : 'text-muted-foreground'}>
                            {item.daysRemaining} {t('common.days')} {t('lifecycle.remaining')}
                          </span>
                        )}
                      </div>
                      {item.vendor && (
                        <p className="text-xs text-muted-foreground">{item.vendor} {item.model}</p>
                      )}
                      {item.os && (
                        <p className="text-xs text-muted-foreground">{item.os}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('lifecycle.upcomingExpirations')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-border" />
                
                <div className="grid grid-cols-4 gap-4">
                  {timelineData.map((quarter, index) => (
                    <div key={index} className="relative">
                      {/* Quarter marker */}
                      <div className="flex flex-col items-center mb-4">
                        <div className={`w-4 h-4 rounded-full z-10 ${
                          quarter.items.length > 0 ? 'bg-primary' : 'bg-border'
                        }`} />
                        <span className="mt-2 text-sm font-medium">{quarter.label}</span>
                      </div>
                      
                      {/* Items */}
                      <div className="space-y-2">
                        {quarter.items.slice(0, 3).map(item => (
                          <div key={item.id} className="p-2 rounded border text-sm">
                            <div className="flex items-center gap-1">
                              {item.severity === 'critical' && <AlertCircle className="w-3 h-3 text-red-500" />}
                              {item.severity === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                              <span className="font-medium truncate">{item.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.type === 'warranty' && t('lifecycle.warranty')}
                              {item.type === 'eol' && t('lifecycle.eol')}
                              {item.type === 'eos' && t('lifecycle.eos')}
                            </span>
                          </div>
                        ))}
                        {quarter.items.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{quarter.items.length - 3} {t('common.more')}
                          </p>
                        )}
                        {quarter.items.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center">
                            {t('lifecycle.noItems')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Tab */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('lifecycle.type')}</TableHead>
                    <TableHead>{t('lifecycle.expirationDate')}</TableHead>
                    <TableHead>{t('lifecycle.daysRemaining')}</TableHead>
                    <TableHead>{t('lifecycle.severity')}</TableHead>
                    <TableHead>{t('common.details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lifecycleItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell>{format(parseISO(item.date), 'PP', { locale: dateLocale })}</TableCell>
                      <TableCell>
                        {item.daysRemaining < 0 ? (
                          <span className="text-red-500">{item.daysRemaining}</span>
                        ) : (
                          <span>{item.daysRemaining}</span>
                        )}
                      </TableCell>
                      <TableCell>{getSeverityBadge(item.severity)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.vendor || item.os || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LifecycleCenter;
