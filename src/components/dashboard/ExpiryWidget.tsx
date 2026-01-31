import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLicenses } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Calendar, Shield, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ExpiryItem {
  id: string;
  name: string;
  type: 'license' | 'certificate' | 'domain';
  expiryDate: Date;
  daysLeft: number;
  urgency: 'critical' | 'warning' | 'normal';
}

const ExpiryWidget: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const { data: licenses } = useLicenses();

  // Calculate expiry items from licenses
  const expiryItems: ExpiryItem[] = React.useMemo(() => {
    const items: ExpiryItem[] = [];
    
    // Add licenses with expiry dates
    licenses.forEach(license => {
      if (license.expiry_date) {
        const expiryDate = new Date(license.expiry_date);
        const daysLeft = differenceInDays(expiryDate, new Date());
        
        // Only show items expiring within 90 days
        if (daysLeft <= 90) {
          let urgency: 'critical' | 'warning' | 'normal' = 'normal';
          if (daysLeft <= 7) urgency = 'critical';
          else if (daysLeft <= 30) urgency = 'warning';
          
          items.push({
            id: license.id,
            name: license.name,
            type: 'license',
            expiryDate,
            daysLeft,
            urgency,
          });
        }
      }
    });
    
    // Sort by days left (most urgent first)
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [licenses]);

  const criticalCount = expiryItems.filter(i => i.urgency === 'critical').length;
  const warningCount = expiryItems.filter(i => i.urgency === 'warning').length;

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          text: 'text-destructive',
          badge: 'bg-destructive text-destructive-foreground',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/20',
          text: 'text-warning',
          badge: 'bg-warning text-warning-foreground',
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          text: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'license':
        return <Shield className="w-4 h-4" />;
      case 'certificate':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'PP', { locale: language === 'ar' ? ar : enUS });
  };

  const getDaysLabel = (days: number) => {
    if (days < 0) {
      return language === 'ar' ? `منتهي منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)} days ago`;
    }
    if (days === 0) {
      return language === 'ar' ? 'ينتهي اليوم' : 'Expires today';
    }
    if (days === 1) {
      return language === 'ar' ? 'ينتهي غداً' : 'Expires tomorrow';
    }
    return language === 'ar' ? `${days} يوم متبقي` : `${days} days left`;
  };

  if (expiryItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning/20" dir={dir}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t('dashboard.expiryCenter')}
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} {language === 'ar' ? 'حرج' : 'critical'}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-warning text-warning-foreground text-xs">
                {warningCount} {language === 'ar' ? 'تحذير' : 'warning'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {expiryItems.slice(0, 5).map((item) => {
              const styles = getUrgencyStyles(item.urgency);
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
                    styles.bg,
                    styles.border
                  )}
                  onClick={() => navigate('/licenses')}
                >
                  <div className={cn('p-1.5 rounded-md', styles.bg)}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.expiryDate)}
                    </p>
                  </div>
                  <div className="text-end">
                    <Badge className={cn('text-xs', styles.badge)}>
                      {getDaysLabel(item.daysLeft)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {expiryItems.length > 5 && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-sm"
            onClick={() => navigate('/licenses')}
          >
            {language === 'ar' ? `عرض الكل (${expiryItems.length})` : `View all (${expiryItems.length})`}
            <ChevronRight className="w-4 h-4 ms-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiryWidget;
