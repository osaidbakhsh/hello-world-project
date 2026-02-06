/**
 * AD Overview Page - Domain Active Directory Dashboard
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import { 
  useLatestADSnapshot, 
  useADSnapshots, 
  useDomainIntegrations,
  useIntegrationRuns 
} from '@/hooks/useADIntegration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Monitor, 
  Shield, 
  Server, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
  Eye,
  Bell
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const ADOverview: React.FC = () => {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedSite } = useSite();
  const { hasPermission, isViewerOnly } = usePermissions();
  
  const [selectedDomainId, setSelectedDomainId] = useState<string | undefined>(domainId);
  
  // Fetch integrations to get domain list
  const { data: integrations = [], isLoading: integrationsLoading } = useDomainIntegrations();
  
  // If no domainId provided, use first integration's domain
  React.useEffect(() => {
    if (!selectedDomainId && integrations.length > 0) {
      setSelectedDomainId(integrations[0].domain_id);
    }
  }, [integrations, selectedDomainId]);
  
  // Get current integration
  const currentIntegration = integrations.find(i => i.domain_id === selectedDomainId);
  
  // Fetch AD data
  const { data: latestSnapshot, isLoading: snapshotLoading } = useLatestADSnapshot(selectedDomainId || '');
  const { data: snapshots = [] } = useADSnapshots(selectedDomainId || '', 30);
  const { data: runs = [] } = useIntegrationRuns(currentIntegration?.id || '');

  const canViewAD = hasPermission(PERMISSION_KEYS.IDENTITY_AD_VIEW, { siteId: selectedSite?.id });
  const canManageAD = hasPermission(PERMISSION_KEYS.IDENTITY_AD_SYNC, { siteId: selectedSite?.id });

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  if (!canViewAD && !isViewerOnly) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>You don't have permission to view Active Directory data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (integrationsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Active Directory Integrations</CardTitle>
            <CardDescription>
              Configure an AD integration for your domains to see directory health metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageAD && (
              <Button onClick={() => navigate('/integrations/agents')}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Agents
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3 h-3 mr-1" />Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Down</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const isIntegrationDegraded = currentIntegration?.health_status === 'degraded' || currentIntegration?.health_status === 'down';

  // Prepare chart data
  const chartData = [...snapshots].reverse().map(s => ({
    date: format(new Date(s.captured_at), 'MMM dd'),
    users: s.users_total,
    computers: s.computers_total,
    locked: s.users_locked,
    pwdExpired: s.pwd_expired,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Active Directory Overview</h1>
          <p className="text-sm text-muted-foreground">Directory health and metrics</p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Domain Selector */}
          {integrations.length > 1 && (
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {integrations.map(i => (
                  <SelectItem key={i.domain_id} value={i.domain_id}>
                    {(i as any).domains?.name || i.domain_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canManageAD && (
            <Button variant="outline" onClick={() => navigate('/integrations/agents')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Integration Status */}
      {currentIntegration && (
        <Card className={isIntegrationDegraded ? 'border-destructive/50' : ''}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Integration Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getHealthBadge(currentIntegration.health_status)}
                  <span className="text-sm">
                    via {(currentIntegration as any).scan_agents?.name || 'Agent'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Last Sync</p>
                <p className="font-medium">
                  {currentIntegration.last_sync_at 
                    ? formatDistanceToNow(new Date(currentIntegration.last_sync_at), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Mode</p>
                <p className="font-medium uppercase">{currentIntegration.mode}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/governance/notifications')}
              >
                <Bell className="h-3 w-3 mr-1" />
                View Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Warning Banner */}
      {isIntegrationDegraded && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {currentIntegration?.health_status === 'down' 
                ? 'Integration is DOWN. Agent may be offline or experiencing errors.'
                : 'Integration is DEGRADED. Check agent status and sync history.'}
              {(currentIntegration as any)?.last_error && (
                <span className="block text-sm mt-1 opacity-80">
                  Last error: {(currentIntegration as any).last_error}
                </span>
              )}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="shrink-0 ml-4"
              onClick={() => navigate('/integrations/agents')}
            >
              <Settings className="h-3 w-3 mr-1" />
              Check Agents
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Read-only banner for viewers */}
      {isViewerOnly && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            You have read-only access to Active Directory data.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {snapshotLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : latestSnapshot ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestSnapshot.users_total.toLocaleString()}</div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-emerald-600">{latestSnapshot.users_enabled} enabled</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-amber-600">{latestSnapshot.users_disabled} disabled</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Computers</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestSnapshot.computers_total.toLocaleString()}</div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-emerald-600">{latestSnapshot.computers_enabled} active</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-amber-600">{latestSnapshot.computers_stale_30d} stale (30d)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Groups</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestSnapshot.groups_total.toLocaleString()}</div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-destructive">{latestSnapshot.privileged_groups_total} privileged</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Domain Controllers</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestSnapshot.dcs_total}</div>
              {latestSnapshot.dcs_down > 0 ? (
                <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {latestSnapshot.dcs_down} down
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  All online
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Alert>
          <AlertDescription>No AD snapshot data available yet. Waiting for agent sync.</AlertDescription>
        </Alert>
      )}

      {/* Alert Cards */}
      {latestSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={latestSnapshot.users_locked > 0 ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                Locked Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${latestSnapshot.users_locked > 0 ? 'text-amber-600' : ''}`}>
                {latestSnapshot.users_locked}
              </div>
            </CardContent>
          </Card>

          <Card className={latestSnapshot.pwd_expired > 0 ? 'border-destructive/30 bg-destructive/5' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Passwords Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${latestSnapshot.pwd_expired > 0 ? 'text-destructive' : ''}`}>
                {latestSnapshot.pwd_expired}
              </div>
            </CardContent>
          </Card>

          <Card className={latestSnapshot.pwd_expiring_7d > 0 ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expiring in 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${latestSnapshot.pwd_expiring_7d > 0 ? 'text-amber-600' : ''}`}>
                {latestSnapshot.pwd_expiring_7d}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trend Charts */}
      {chartData.length > 1 && (
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">User Trend</TabsTrigger>
            <TabsTrigger value="security">Security Alerts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User & Computer Count (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" name="Users" />
                      <Line type="monotone" dataKey="computers" stroke="hsl(var(--secondary))" name="Computers" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Alerts (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="locked" fill="hsl(var(--warning))" name="Locked" />
                      <Bar dataKey="pwdExpired" fill="hsl(var(--destructive))" name="Pwd Expired" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Recent Sync Runs */}
      {runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sync Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runs.slice(0, 5).map(run => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {run.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : run.success === false ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {run.run_type.charAt(0).toUpperCase() + run.run_type.slice(1)} Sync
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(run.started_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {run.finished_at && (
                      <p className="text-xs text-muted-foreground">
                        Duration: {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                      </p>
                    )}
                    {run.error_summary && (
                      <p className="text-xs text-destructive">{run.error_summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ADOverview;
