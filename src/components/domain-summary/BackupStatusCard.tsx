import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HardDrive,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface BackupStatusCardProps {
  servers: any[];
}

const BackupStatusCard: React.FC<BackupStatusCardProps> = ({ servers }) => {
  const { t, dir, language } = useLanguage();
  const locale = language === 'ar' ? ar : enUS;

  const backupStats = useMemo(() => {
    const backedUp = servers.filter(s => s.is_backed_up_by_veeam);
    const notBackedUp = servers.filter(s => !s.is_backed_up_by_veeam);
    const successfulBackups = backedUp.filter(s => s.last_backup_status === 'Success' || s.last_backup_status === 'success');
    const failedBackups = backedUp.filter(s => s.last_backup_status === 'Failed' || s.last_backup_status === 'failed' || s.last_backup_status === 'Warning');
    const pendingBackups = backedUp.filter(s => !s.last_backup_status || s.last_backup_status === 'pending');

    const coverage = servers.length > 0 
      ? Math.round((backedUp.length / servers.length) * 100) 
      : 0;

    // Find the most recent backup
    const lastBackupServer = backedUp
      .filter(s => s.last_backup_date)
      .sort((a, b) => new Date(b.last_backup_date!).getTime() - new Date(a.last_backup_date!).getTime())[0];

    return {
      total: servers.length,
      backedUp: backedUp.length,
      notBackedUp: notBackedUp.length,
      successful: successfulBackups.length,
      failed: failedBackups.length,
      pending: pendingBackups.length,
      coverage,
      lastBackup: lastBackupServer?.last_backup_date,
      failedServers: failedBackups,
      notBackedUpServers: notBackedUp.slice(0, 5),
    };
  }, [servers]);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return 'text-success';
    if (coverage >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          {t('domainSummary.backupStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('domainSummary.coverage')}</span>
            <span className={`text-2xl font-bold ${getCoverageColor(backupStats.coverage)}`}>
              {backupStats.coverage}%
            </span>
          </div>
          <Progress 
            value={backupStats.coverage} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground">
            {backupStats.backedUp} {t('domainSummary.of')} {backupStats.total} {t('domainSummary.serversBackedUp')}
          </p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
            <div className="text-lg font-bold text-success">{backupStats.successful}</div>
            <div className="text-xs text-muted-foreground">{t('domainSummary.successful')}</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <div className="text-lg font-bold text-destructive">{backupStats.failed}</div>
            <div className="text-xs text-muted-foreground">{t('domainSummary.failed')}</div>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
            <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
            <div className="text-lg font-bold text-warning">{backupStats.notBackedUp}</div>
            <div className="text-xs text-muted-foreground">{t('domainSummary.notBackedUp')}</div>
          </div>
        </div>

        {/* Last Backup Info */}
        {backupStats.lastBackup && (
          <div className="p-3 rounded-lg bg-secondary/50 flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t('domainSummary.lastSuccessfulBackup')}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(backupStats.lastBackup), { 
                  addSuffix: true, 
                  locale 
                })}
              </p>
            </div>
          </div>
        )}

        {/* Failed Servers List */}
        {backupStats.failedServers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {t('domainSummary.failedBackups')}
            </p>
            <ScrollArea className="h-[80px]">
              <div className="space-y-1">
                {backupStats.failedServers.map(server => (
                  <div 
                    key={server.id}
                    className="flex items-center justify-between p-2 rounded bg-destructive/5 text-sm"
                  >
                    <span>{server.name}</span>
                    <Badge variant="destructive" className="text-xs">
                      {server.last_backup_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Not Backed Up Servers */}
        {backupStats.notBackedUpServers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-warning flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {t('domainSummary.serversWithoutBackup')}
            </p>
            <div className="flex flex-wrap gap-1">
              {backupStats.notBackedUpServers.map(server => (
                <Badge key={server.id} variant="outline" className="text-xs">
                  {server.name}
                </Badge>
              ))}
              {backupStats.notBackedUp > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{backupStats.notBackedUp - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BackupStatusCard;
