import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface HealthScore {
  healthy: number;
  warning: number;
  critical: number;
  total: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface ResourceStatus {
  id: string;
  name: string;
  status: string | null;
  type: 'server' | 'node' | 'cluster';
  domainId: string;
  cpuUsage?: number;
  ramUsage?: number;
}

export interface AlertEvent {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  alertType: 'critical' | 'warning' | 'info' | 'recovery';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: string;
  domainId: string;
  acknowledged: boolean;
}

interface UseRealtimeHealthReturn {
  globalHealth: HealthScore;
  siteHealth: Map<string, HealthScore>;
  domainHealth: Map<string, HealthScore>;
  recentAlerts: AlertEvent[];
  resources: ResourceStatus[];
  isLoading: boolean;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
}

const calculateHealthScore = (statuses: (string | null)[]): HealthScore => {
  const total = statuses.length;
  if (total === 0) {
    return { healthy: 0, warning: 0, critical: 0, total: 0, percentage: 100, status: 'healthy' };
  }

  const healthy = statuses.filter(s => 
    s === 'online' || s === 'production' || s === 'active'
  ).length;
  
  const warning = statuses.filter(s => 
    s === 'maintenance' || s === 'warning' || s === 'degraded'
  ).length;
  
  const critical = statuses.filter(s => 
    s === 'offline' || s === 'stopped' || s === 'error'
  ).length;

  const percentage = Math.round((healthy / total) * 100);
  
  // Determine overall status based on thresholds
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  const criticalPercent = (critical / total) * 100;
  const offlinePercent = ((critical + warning) / total) * 100;
  
  if (criticalPercent > 30) {
    status = 'critical';
  } else if (offlinePercent > 10) {
    status = 'warning';
  }

  return { healthy, warning, critical, total, percentage, status };
};

export const useRealtimeHealth = (): UseRealtimeHealthReturn => {
  const [globalHealth, setGlobalHealth] = useState<HealthScore>({
    healthy: 0, warning: 0, critical: 0, total: 0, percentage: 100, status: 'healthy'
  });
  const [siteHealth, setSiteHealth] = useState<Map<string, HealthScore>>(new Map());
  const [domainHealth, setDomainHealth] = useState<Map<string, HealthScore>>(new Map());
  const [recentAlerts, setRecentAlerts] = useState<AlertEvent[]>([]);
  const [resources, setResources] = useState<ResourceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      // Fetch all VMs (servers) with network->cluster->datacenter->domain path
      const { data: servers } = await supabase
        .from('servers')
        .select(`
          id, name, status, network_id,
          networks!inner(
            id,
            cluster_id,
            clusters!inner(
              id,
              domain_id
            )
          )
        `)
        .limit(500);

      // Fetch all nodes
      const { data: nodes } = await supabase
        .from('cluster_nodes')
        .select('id, name, status, domain_id, ram_gb, cpu_cores')
        .limit(500);

      // Fetch recent alerts
      const { data: alerts } = await supabase
        .from('infrastructure_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch domains with their sites
      const { data: domains } = await supabase
        .from('domains')
        .select('id, name, site_id');

      // Process resources - extract domain_id from nested relations for servers
      const allResources: ResourceStatus[] = [
        ...(servers || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          type: 'server' as const,
          domainId: s.networks?.clusters?.domain_id || ''
        })),
        ...(nodes || []).map(n => ({
          id: n.id,
          name: n.name,
          status: n.status,
          type: 'node' as const,
          domainId: n.domain_id,
          ramUsage: n.ram_gb ? Math.random() * 100 : undefined, // Placeholder for real metrics
          cpuUsage: n.cpu_cores ? Math.random() * 100 : undefined
        }))
      ];

      setResources(allResources);

      // Calculate global health
      const allStatuses = allResources.map(r => r.status);
      setGlobalHealth(calculateHealthScore(allStatuses));

      // Calculate per-domain health
      const domainHealthMap = new Map<string, HealthScore>();
      const domainIds = [...new Set(allResources.map(r => r.domainId))];
      
      for (const domainId of domainIds) {
        const domainResources = allResources.filter(r => r.domainId === domainId);
        const statuses = domainResources.map(r => r.status);
        domainHealthMap.set(domainId, calculateHealthScore(statuses));
      }
      setDomainHealth(domainHealthMap);

      // Calculate per-site health
      const siteHealthMap = new Map<string, HealthScore>();
      if (domains) {
        const siteIds = [...new Set(domains.map(d => d.site_id))];
        for (const siteId of siteIds) {
          const siteDomainIds = domains.filter(d => d.site_id === siteId).map(d => d.id);
          const siteResources = allResources.filter(r => siteDomainIds.includes(r.domainId));
          const statuses = siteResources.map(r => r.status);
          siteHealthMap.set(siteId, calculateHealthScore(statuses));
        }
      }
      setSiteHealth(siteHealthMap);

      // Process alerts
      if (alerts) {
        setRecentAlerts(alerts.map(a => ({
          id: a.id,
          resourceType: a.resource_type,
          resourceId: a.resource_id,
          resourceName: a.resource_name,
          alertType: a.alert_type as AlertEvent['alertType'],
          severity: a.severity as AlertEvent['severity'],
          message: a.message,
          previousStatus: a.previous_status,
          newStatus: a.new_status,
          createdAt: a.created_at,
          domainId: a.domain_id,
          acknowledged: !!a.acknowledged_at
        })));
      }

    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    fetchInitialData();

    // Subscribe to server status changes
    const serverChannel: RealtimeChannel = supabase
      .channel('servers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servers' },
        (payload) => {
          console.log('Server change:', payload);
          // Refetch data on any change
          fetchInitialData();
        }
      )
      .subscribe();

    // Subscribe to node status changes
    const nodeChannel: RealtimeChannel = supabase
      .channel('nodes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cluster_nodes' },
        (payload) => {
          console.log('Node change:', payload);
          fetchInitialData();
        }
      )
      .subscribe();

    // Subscribe to alerts
    const alertChannel: RealtimeChannel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'infrastructure_alerts' },
        (payload) => {
          console.log('New alert:', payload);
          const newAlert = payload.new as any;
          setRecentAlerts(prev => [{
            id: newAlert.id,
            resourceType: newAlert.resource_type,
            resourceId: newAlert.resource_id,
            resourceName: newAlert.resource_name,
            alertType: newAlert.alert_type,
            severity: newAlert.severity,
            message: newAlert.message,
            previousStatus: newAlert.previous_status,
            newStatus: newAlert.new_status,
            createdAt: newAlert.created_at,
            domainId: newAlert.domain_id,
            acknowledged: false
          }, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(serverChannel);
      supabase.removeChannel(nodeChannel);
      supabase.removeChannel(alertChannel);
    };
  }, [fetchInitialData]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from('infrastructure_alerts')
      .update({ 
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', alertId);

    if (!error) {
      setRecentAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
      );
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from('infrastructure_alerts')
      .update({ 
        resolved_at: new Date().toISOString(),
        resolved_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', alertId);

    if (!error) {
      setRecentAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  }, []);

  return {
    globalHealth,
    siteHealth,
    domainHealth,
    recentAlerts,
    resources,
    isLoading,
    acknowledgeAlert,
    resolveAlert
  };
};
