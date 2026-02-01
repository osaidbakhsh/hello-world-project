import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import StatCard from '@/components/dashboard/StatCard';
import {
  Server,
  CheckCircle,
  KeyRound,
  ListTodo,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface DomainStatsCardsProps {
  stats: {
    totalServers: number;
    activeServers: number;
    totalLicenses: number;
    expiringLicenses: number;
    totalTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    completedTasks: number;
  };
}

const DomainStatsCards: React.FC<DomainStatsCardsProps> = ({ stats }) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        title={t('domainSummary.totalServers')}
        value={stats.totalServers}
        icon={Server}
        variant="primary"
      />
      <StatCard
        title={t('domainSummary.activeServers')}
        value={stats.activeServers}
        icon={CheckCircle}
        variant="success"
      />
      <StatCard
        title={t('domainSummary.totalLicenses')}
        value={stats.totalLicenses}
        icon={KeyRound}
        variant="accent"
      />
      <StatCard
        title={t('domainSummary.expiringLicenses')}
        value={stats.expiringLicenses}
        icon={AlertTriangle}
        variant={stats.expiringLicenses > 0 ? 'warning' : 'accent'}
      />
      <StatCard
        title={t('domainSummary.pendingTasks')}
        value={stats.pendingTasks}
        icon={Clock}
        variant={stats.overdueTasks > 0 ? 'danger' : 'primary'}
      />
      <StatCard
        title={t('domainSummary.overdueTasks')}
        value={stats.overdueTasks}
        icon={ListTodo}
        variant={stats.overdueTasks > 0 ? 'danger' : 'success'}
      />
    </div>
  );
};

export default DomainStatsCards;
