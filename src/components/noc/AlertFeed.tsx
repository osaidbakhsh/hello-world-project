import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Info,
  RefreshCw,
  Check,
  Clock
} from 'lucide-react';
import { AlertEvent } from '@/hooks/useRealtimeHealth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertFeedProps {
  alerts: AlertEvent[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  maxHeight?: string;
}

const alertConfig = {
  critical: { 
    icon: XCircle, 
    class: 'bg-destructive/10 border-destructive/30 text-destructive',
    badge: 'bg-destructive text-destructive-foreground'
  },
  warning: { 
    icon: AlertTriangle, 
    class: 'bg-warning/10 border-warning/30 text-warning',
    badge: 'bg-warning text-warning-foreground'
  },
  info: { 
    icon: Info, 
    class: 'bg-info/10 border-info/30 text-info',
    badge: 'bg-info text-info-foreground'
  },
  recovery: { 
    icon: CheckCircle, 
    class: 'bg-success/10 border-success/30 text-success',
    badge: 'bg-success text-success-foreground'
  }
};

const severityBadge = {
  critical: 'bg-destructive',
  high: 'bg-orange-500',
  medium: 'bg-warning',
  low: 'bg-muted'
};

const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  maxHeight = '400px'
}) => {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Real-time Alert Feed
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {alerts.filter(a => !a.acknowledged).length} unread
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-1 p-4 pt-0">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All systems operational</p>
              </div>
            ) : (
              alerts.map((alert, index) => {
                const config = alertConfig[alert.alertType];
                const AlertIcon = config.icon;
                const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 rounded-lg border transition-all stagger-item',
                      config.class,
                      alert.acknowledged && 'opacity-60'
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertIcon className={cn('w-4 h-4 mt-0.5 shrink-0', 
                        alert.alertType === 'critical' && 'animate-pulse'
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {alert.resourceName}
                          </span>
                          <Badge className={cn('text-[10px] px-1.5 py-0', severityBadge[alert.severity])}>
                            {alert.severity}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{timeAgo}</span>
                            {alert.previousStatus && alert.newStatus && (
                              <span className="flex items-center gap-1">
                                <span className="opacity-50">{alert.previousStatus}</span>
                                <span>→</span>
                                <span className="font-medium">{alert.newStatus}</span>
                              </span>
                            )}
                          </div>
                          
                          {!alert.acknowledged ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => onAcknowledge(alert.id)}
                              >
                                <Check className="w-3 h-3 me-1" />
                                Ack
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => onResolve(alert.id)}
                              >
                                <RefreshCw className="w-3 h-3 me-1" />
                                Resolve
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-success">
                              <Check className="w-3 h-3 me-1" />
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AlertFeed;
