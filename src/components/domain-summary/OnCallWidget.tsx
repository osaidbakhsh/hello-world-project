import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Phone,
  User,
  Clock,
  AlertCircle,
  Settings,
} from 'lucide-react';

interface OnCallWidgetProps {
  domainId: string;
}

const OnCallWidget: React.FC<OnCallWidgetProps> = ({ domainId }) => {
  const { t } = useLanguage();

  // Placeholder data - will be replaced in EPIC B
  const onCallData = {
    primary: null,
    secondary: null,
    schedule: null,
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            {t('domainSummary.onCallNow')}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 me-1" />
            {t('domainSummary.comingSoon')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <div className="relative">
            <Phone className="w-16 h-16 opacity-30" />
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-warning/20">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="mt-4 font-medium">{t('domainSummary.onCallNotConfigured')}</p>
          <p className="text-sm text-center mt-2 max-w-xs">
            {t('domainSummary.onCallHint')}
          </p>
          <Button variant="outline" className="mt-4" disabled>
            <Settings className="w-4 h-4 me-2" />
            {t('domainSummary.configureOnCall')}
          </Button>
        </div>

        {/* Preview of what it will look like when configured */}
        <div className="hidden space-y-4">
          {/* Primary On-Call */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-primary text-primary-foreground">
                {t('onCall.primary')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t('domainSummary.until')} 08:00
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">أحمد محمد</p>
                <p className="text-xs text-muted-foreground">+966 50 123 4567</p>
              </div>
            </div>
          </div>

          {/* Secondary On-Call */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary">
                {t('onCall.secondary')}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">عمر علي</p>
                <p className="text-xs text-muted-foreground">+966 50 987 6543</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnCallWidget;
