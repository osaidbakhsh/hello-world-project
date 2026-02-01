import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { License } from '@/lib/supabase';
import {
  AlertTriangle,
  KeyRound,
  Calendar,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ExpiryAlertsCardProps {
  licenses: License[];
  domainId: string;
}

interface ExpiryItem {
  id: string;
  name: string;
  type: 'license' | 'certificate' | 'domain';
  expiryDate: Date;
  daysRemaining: number;
  severity: 'critical' | 'warning' | 'info';
}

const ExpiryAlertsCard: React.FC<ExpiryAlertsCardProps> = ({ licenses, domainId }) => {
  const { t, dir, language } = useLanguage();
  const navigate = useNavigate();
  const locale = language === 'ar' ? ar : enUS;

  const expiryItems = useMemo(() => {
    const items: ExpiryItem[] = [];
    const now = new Date();

    // Add licenses
    licenses.forEach(license => {
      if (license.expiry_date) {
        const expiryDate = new Date(license.expiry_date);
        const daysRemaining = differenceInDays(expiryDate, now);
        
        if (daysRemaining <= 90) {
          items.push({
            id: license.id,
            name: license.name,
            type: 'license',
            expiryDate,
            daysRemaining,
            severity: daysRemaining <= 7 ? 'critical' : daysRemaining <= 30 ? 'warning' : 'info',
          });
        }
      }
    });

    // Sort by days remaining (most urgent first)
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return items;
  }, [licenses]);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          badge: 'bg-destructive text-destructive-foreground',
          border: 'border-destructive/50',
          bg: 'bg-destructive/10',
          icon: 'text-destructive',
        };
      case 'warning':
        return {
          badge: 'bg-warning text-warning-foreground',
          border: 'border-warning/50',
          bg: 'bg-warning/10',
          icon: 'text-warning',
        };
      default:
        return {
          badge: 'bg-primary text-primary-foreground',
          border: 'border-primary/50',
          bg: 'bg-primary/10',
          icon: 'text-primary',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'license':
        return KeyRound;
      case 'certificate':
        return AlertTriangle;
      default:
        return Calendar;
    }
  };

  const criticalCount = expiryItems.filter(i => i.severity === 'critical').length;
  const warningCount = expiryItems.filter(i => i.severity === 'warning').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t('domainSummary.expiryAlerts')}
          </CardTitle>
          {expiryItems.length > 0 && (
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground">
                  {criticalCount} {t('domainSummary.critical')}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="bg-warning text-warning-foreground">
                  {warningCount} {t('domainSummary.warning')}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {expiryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mb-2 opacity-50" />
            <p>{t('domainSummary.noExpiryAlerts')}</p>
            <p className="text-sm mt-1">{t('domainSummary.allItemsValid')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3">
              {expiryItems.map(item => {
                const styles = getSeverityStyles(item.severity);
                const TypeIcon = getTypeIcon(item.type);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${styles.border} ${styles.bg} transition-colors hover:border-primary/50`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-md bg-background ${styles.icon}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {format(item.expiryDate, 'PPP', { locale })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge className={`${styles.badge} text-xs`}>
                          {item.daysRemaining <= 0 
                            ? t('domainSummary.expired')
                            : `${item.daysRemaining} ${t('domainSummary.days')}`
                          }
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t(`domainSummary.type${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {expiryItems.length > 0 && (
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigate('/licenses')}
          >
            <ExternalLink className="w-4 h-4 me-2" />
            {t('domainSummary.viewAllLicenses')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiryAlertsCard;
