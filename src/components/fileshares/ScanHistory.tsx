import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileshareScan } from '@/types/fileshares';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ScanHistoryProps {
  scans: FileshareScan[];
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ scans }) => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'ar' ? ar : enUS;

  if (scans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('fileShares.noScans')}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'RUNNING':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('common.status')}</TableHead>
          <TableHead>{t('fileShares.scanMode')}</TableHead>
          <TableHead>{t('maintenance.startTime')}</TableHead>
          <TableHead>{t('maintenance.endTime')}</TableHead>
          <TableHead>{t('scan.progress')}</TableHead>
          <TableHead>{t('scan.error')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scans.map(scan => (
          <TableRow key={scan.id}>
            <TableCell>
              <Badge variant={getStatusVariant(scan.status) as any} className="flex items-center gap-1 w-fit">
                {getStatusIcon(scan.status)}
                {t(`scan.status.${scan.status.toLowerCase()}`)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {t(`fileShares.scanMode.${scan.scan_mode.toLowerCase()}`)}
              </Badge>
            </TableCell>
            <TableCell>
              {scan.started_at ? (
                <span title={format(new Date(scan.started_at), 'PPpp', { locale: dateLocale })}>
                  {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true, locale: dateLocale })}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {scan.finished_at ? (
                <span title={format(new Date(scan.finished_at), 'PPpp', { locale: dateLocale })}>
                  {formatDistanceToNow(new Date(scan.finished_at), { addSuffix: true, locale: dateLocale })}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {scan.status === 'RUNNING' ? (
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${scan.progress_percent}%` }}
                    />
                  </div>
                  <span className="text-sm">{scan.progress_percent}%</span>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {scan.error_code ? (
                <Badge variant="destructive">
                  {t(`scan.error.${scan.error_code.toLowerCase()}`)}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ScanHistory;
