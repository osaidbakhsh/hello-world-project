import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  XCircle, 
  Phone, 
  RefreshCw, 
  Check,
  Siren
} from 'lucide-react';
import { AlertEvent } from '@/hooks/useRealtimeHealth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CriticalAlertModalProps {
  alerts: AlertEvent[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onContactAdmin: () => void;
}

const CriticalAlertModal: React.FC<CriticalAlertModalProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  onContactAdmin
}) => {
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Filter for unacknowledged critical alerts
  const criticalAlerts = alerts.filter(
    a => a.alertType === 'critical' && !a.acknowledged
  );

  // Show modal when there are critical alerts
  useEffect(() => {
    if (criticalAlerts.length > 0) {
      setIsOpen(true);
      setCurrentAlertIndex(0);
    }
  }, [criticalAlerts.length]);

  const currentAlert = criticalAlerts[currentAlertIndex];

  const handleAcknowledge = () => {
    if (currentAlert) {
      onAcknowledge(currentAlert.id);
      if (currentAlertIndex < criticalAlerts.length - 1) {
        setCurrentAlertIndex(prev => prev + 1);
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleSkip = () => {
    if (currentAlertIndex < criticalAlerts.length - 1) {
      setCurrentAlertIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  if (!currentAlert) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-destructive/50 bg-gradient-to-b from-destructive/10 to-background">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/20 animate-pulse">
              <Siren className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Critical Alert
              </DialogTitle>
              <DialogDescription className="text-xs">
                {criticalAlerts.length > 1 && (
                  <span>Alert {currentAlertIndex + 1} of {criticalAlerts.length}</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alert details */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">{currentAlert.resourceName}</span>
              <Badge className="bg-destructive text-destructive-foreground">
                {currentAlert.severity}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {currentAlert.message}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Type: {currentAlert.resourceType}</span>
              <span>
                {formatDistanceToNow(new Date(currentAlert.createdAt), { addSuffix: true })}
              </span>
            </div>

            {currentAlert.previousStatus && currentAlert.newStatus && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Badge variant="outline">{currentAlert.previousStatus}</Badge>
                <span>→</span>
                <Badge variant="destructive">{currentAlert.newStatus}</Badge>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="border-destructive/30 hover:bg-destructive/10"
              onClick={onContactAdmin}
            >
              <Phone className="w-4 h-4 me-2" />
              Contact Admin
            </Button>
            <Button
              variant="outline"
              className="border-warning/30 hover:bg-warning/10"
              onClick={() => onResolve(currentAlert.id)}
            >
              <RefreshCw className="w-4 h-4 me-2" />
              Trigger Recovery
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleAcknowledge} className="bg-destructive hover:bg-destructive/90">
            <Check className="w-4 h-4 me-2" />
            Acknowledge Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CriticalAlertModal;
