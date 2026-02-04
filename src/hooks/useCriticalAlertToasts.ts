import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertEvent } from '@/hooks/useRealtimeHealth';

interface UseCriticalAlertToastsOptions {
  alerts: AlertEvent[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string) => Promise<void>;
  onContactAdmin: () => void;
  enabled?: boolean;
}

export const useCriticalAlertToasts = ({
  alerts,
  onAcknowledge,
  onResolve,
  onContactAdmin,
  enabled = true
}: UseCriticalAlertToastsOptions) => {
  const shownAlertIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    // Filter for unacknowledged critical/warning alerts
    const criticalAlerts = alerts.filter(
      a => (a.alertType === 'critical' || a.alertType === 'warning') && 
           !a.acknowledged &&
           !shownAlertIds.current.has(a.id)
    );

    criticalAlerts.forEach((alert) => {
      shownAlertIds.current.add(alert.id);

      const isCritical = alert.alertType === 'critical';
      
      toast.error(
        `${isCritical ? '🚨 CRITICAL' : '⚠️ WARNING'}: ${alert.resourceName}`,
        {
          id: alert.id,
          description: alert.message,
          duration: isCritical ? Infinity : 10000,
          action: {
            label: 'Acknowledge',
            onClick: () => {
              onAcknowledge(alert.id);
              shownAlertIds.current.delete(alert.id);
            }
          },
          cancel: {
            label: 'Contact Admin',
            onClick: () => {
              onContactAdmin();
            }
          },
          onDismiss: () => {
            shownAlertIds.current.delete(alert.id);
          }
        }
      );
    });

    // Cleanup: remove resolved/acknowledged alerts from tracking
    const currentAlertIds = new Set(alerts.map(a => a.id));
    shownAlertIds.current.forEach(id => {
      if (!currentAlertIds.has(id)) {
        toast.dismiss(id);
        shownAlertIds.current.delete(id);
      }
    });
  }, [alerts, enabled, onAcknowledge, onResolve, onContactAdmin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shownAlertIds.current.forEach(id => toast.dismiss(id));
      shownAlertIds.current.clear();
    };
  }, []);
};
