import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useDomains, 
  useServers, 
  useLicenses, 
  useTasks,
  useProfiles 
} from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import DomainStatsCards from '@/components/domain-summary/DomainStatsCards';
import CriticalRolesCard from '@/components/domain-summary/CriticalRolesCard';
import BackupStatusCard from '@/components/domain-summary/BackupStatusCard';
import ExpiryAlertsCard from '@/components/domain-summary/ExpiryAlertsCard';
import OnCallWidget from '@/components/domain-summary/OnCallWidget';
import QuickActions from '@/components/domain-summary/QuickActions';
import {
  Network,
  Building2,
  Plus,
  Server,
  KeyRound,
  ListTodo,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DomainSummary: React.FC = () => {
  const { t, dir } = useLanguage();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');

  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { data: allServers } = useServers();
  const { data: allLicenses } = useLicenses();
  const { data: allTasks } = useTasks();
  const { data: profiles } = useProfiles();

  // Set default domain when domains load
  React.useEffect(() => {
    if (domains.length > 0 && !selectedDomainId) {
      setSelectedDomainId(domains[0].id);
    }
  }, [domains, selectedDomainId]);

  const selectedDomain = domains.find(d => d.id === selectedDomainId);

  // Filter data by selected domain
  const domainServers = useMemo(() => {
    if (!selectedDomainId) return [];
    // Servers are linked via network_id -> networks.domain_id
    // For now, we'll show all servers (can be enhanced with network filtering)
    return allServers;
  }, [allServers, selectedDomainId]);

  const domainLicenses = useMemo(() => {
    if (!selectedDomainId) return [];
    return allLicenses.filter(l => l.domain_id === selectedDomainId);
  }, [allLicenses, selectedDomainId]);

  const domainTasks = useMemo(() => {
    // Filter tasks linked to servers in this domain or unlinked tasks
    return allTasks;
  }, [allTasks, selectedDomainId]);

  // Calculate stats for the selected domain
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeServers = domainServers.filter(s => s.status === 'active').length;
    const expiringLicenses = domainLicenses.filter(l => 
      l.expiry_date && new Date(l.expiry_date) <= thirtyDaysFromNow
    ).length;
    const pendingTasks = domainTasks.filter(t => 
      t.status !== 'completed' && (t as any).task_status !== 'done'
    ).length;
    const overdueTasks = domainTasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < now && 
      t.status !== 'completed' && 
      (t as any).task_status !== 'done'
    ).length;

    return {
      totalServers: domainServers.length,
      activeServers,
      totalLicenses: domainLicenses.length,
      expiringLicenses,
      totalTasks: domainTasks.length,
      pendingTasks,
      overdueTasks,
      completedTasks: domainTasks.filter(t => 
        t.status === 'completed' || (t as any).task_status === 'done'
      ).length,
    };
  }, [domainServers, domainLicenses, domainTasks]);

  if (domainsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t('domainSummary.noDomains')}</h2>
        <p className="text-muted-foreground">{t('domainSummary.createDomainHint')}</p>
        {isAdmin && (
          <Button onClick={() => navigate('/networks')}>
            <Plus className="w-4 h-4 me-2" />
            {t('domainSummary.createDomain')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('domainSummary.title')}</h1>
            <p className="text-muted-foreground">
              {t('domainSummary.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Domain Selector */}
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-[250px]">
              <Network className="w-4 h-4 me-2 text-primary" />
              <SelectValue placeholder={t('domainSummary.selectDomain')} />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {domain.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick Actions */}
          <QuickActions domainId={selectedDomainId} domainName={selectedDomain?.name || ''} />
        </div>
      </div>

      {/* Domain Info Banner */}
      {selectedDomain && (
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedDomain.name}</h2>
                  <p className="text-muted-foreground">
                    {selectedDomain.description || t('domainSummary.noDescription')}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-sm">
                {new Date().toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <DomainStatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Roles Card */}
        <CriticalRolesCard servers={domainServers} />

        {/* Backup Status Card */}
        <BackupStatusCard servers={domainServers} />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Alerts Card */}
        <ExpiryAlertsCard 
          licenses={domainLicenses} 
          domainId={selectedDomainId}
        />

        {/* On-Call Widget (Placeholder for EPIC B) */}
        <OnCallWidget domainId={selectedDomainId} />
      </div>
    </div>
  );
};

export default DomainSummary;
