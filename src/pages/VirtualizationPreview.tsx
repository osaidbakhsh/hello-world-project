// ============================================================
// VIRTUALIZATION PREVIEW PAGE
// Shows discovered resources in staging before sync
// HARDENING: Preview clearly marked as non-destructive, Sync requires confirmation
// ============================================================

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSION_KEYS } from '@/security/permissionKeys';
import {
  useVirtualizationIntegration,
  useDiscoveredResources,
  useSyncRuns,
  useRunSync,
  useRunPreview,
} from '@/hooks/useVirtualizationIntegrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import NoAccess from '@/components/common/NoAccess';
import {
  ArrowLeft,
  RefreshCw,
  Upload,
  Server,
  Network,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Minus,
  Edit,
  Info,
} from 'lucide-react';
import type { DiscoveredResource, DiscoveredResourceType, DiffAction } from '@/types/virtualization';

const diffActionConfig: Record<DiffAction, { label: string; color: string; icon: React.ElementType }> = {
  create: { label: 'New', color: 'bg-emerald-100 text-emerald-900', icon: Plus },
  update: { label: 'Changed', color: 'bg-amber-100 text-amber-900', icon: Edit },
  delete: { label: 'Removed', color: 'bg-red-100 text-red-900', icon: Minus },
  unchanged: { label: 'Unchanged', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
};

const resourceTypeConfig: Record<DiscoveredResourceType, { label: string; icon: React.ElementType }> = {
  vm: { label: 'Virtual Machines', icon: Server },
  host: { label: 'Hosts', icon: HardDrive },
  network: { label: 'Networks', icon: Network },
};

const VirtualizationPreview: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();

  const canView = hasPermission(PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_VIEW);
  const canManage = hasPermission(PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_MANAGE);
  const canManageResources = hasPermission(PERMISSION_KEYS.INVENTORY_RESOURCES_MANAGE);

  const [selectedType, setSelectedType] = useState<DiscoveredResourceType | 'all'>('all');
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);

  const { data: integration, isLoading: loadingIntegration } = useVirtualizationIntegration(id);
  const { data: syncRuns, isLoading: loadingRuns } = useSyncRuns(id, 5);
  const { data: discovered, isLoading: loadingDiscovered } = useDiscoveredResources({
    integration_id: id || '',
    resource_type: selectedType === 'all' ? undefined : selectedType,
  });

  const runPreviewMutation = useRunPreview();
  const runSyncMutation = useRunSync();

  if (!canView) {
    return <NoAccess />;
  }

  if (loadingIntegration) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="py-8">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Integration not found or access denied.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleRunPreview = async () => {
    await runPreviewMutation.mutateAsync(integration.id);
  };

  const handleRunSync = async () => {
    // HARDENING: Show confirmation before sync
    setShowSyncConfirmation(true);
  };

  const handleConfirmSync = async () => {
    setShowSyncConfirmation(false);
    await runSyncMutation.mutateAsync(integration.id);
  };

  // Group discovered resources by type for summary
  const summary = {
    vm: discovered?.filter(r => r.resource_type === 'vm').length || 0,
    host: discovered?.filter(r => r.resource_type === 'host').length || 0,
    network: discovered?.filter(r => r.resource_type === 'network').length || 0,
  };

  const diffSummary = {
    create: discovered?.filter(r => r.diff_action === 'create').length || 0,
    update: discovered?.filter(r => r.diff_action === 'update').length || 0,
    delete: discovered?.filter(r => r.diff_action === 'delete').length || 0,
    unchanged: discovered?.filter(r => r.diff_action === 'unchanged').length || 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/integrations/virtualization')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{integration.name}</h1>
            <p className="text-muted-foreground">{t('virtualization.previewResults')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRunPreview}
            disabled={runPreviewMutation.isPending}
          >
            {runPreviewMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {t('virtualization.runPreview')}
          </Button>
          {canManage && canManageResources && integration.mode === 'sync' && (
            <Button
              onClick={handleRunSync}
              disabled={runSyncMutation.isPending}
            >
              {runSyncMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {t('virtualization.applyToResources')}
            </Button>
          )}
        </div>
      </div>

      {/* Mode Warning */}
      {integration.mode === 'preview' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('virtualization.previewModeActiveTitle')}</AlertTitle>
          <AlertDescription>
            {t('virtualization.previewModeActiveDescription')}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.vm}</p>
                <p className="text-sm text-muted-foreground">{t('virtualization.vmsDiscovered')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.host}</p>
                <p className="text-sm text-muted-foreground">{t('virtualization.hostsDiscovered')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Network className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.network}</p>
                <p className="text-sm text-muted-foreground">{t('virtualization.networksDiscovered')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('virtualization.changes')}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge className={diffActionConfig.create.color}>+{diffSummary.create}</Badge>
                <Badge className={diffActionConfig.update.color}>~{diffSummary.update}</Badge>
                <Badge className={diffActionConfig.delete.color}>-{diffSummary.delete}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('virtualization.recentRuns')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRuns ? (
            <Skeleton className="h-20 w-full" />
          ) : syncRuns && syncRuns.length > 0 ? (
            <div className="space-y-2">
              {syncRuns.map(run => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {run.success ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : run.success === false ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium">{run.mode === 'preview' ? 'Preview' : 'Sync'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(run.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {(run.stats_json as any)?.vms_discovered || 0} VMs
                    </Badge>
                    {run.error_summary && (
                      <Badge variant="destructive">{t('common.error')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">{t('virtualization.noRuns')}</p>
          )}
        </CardContent>
      </Card>

      {/* Discovered Resources Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('virtualization.discoveredResources')}</CardTitle>
            <Tabs value={selectedType} onValueChange={v => setSelectedType(v as any)}>
              <TabsList>
                <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                <TabsTrigger value="vm">VMs</TabsTrigger>
                <TabsTrigger value="host">Hosts</TabsTrigger>
                <TabsTrigger value="network">Networks</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDiscovered ? (
            <Skeleton className="h-48 w-full" />
          ) : discovered && discovered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.ipAddress')}</TableHead>
                  <TableHead>{t('virtualization.externalId')}</TableHead>
                  <TableHead>{t('virtualization.action')}</TableHead>
                  <TableHead>{t('common.discoveredAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discovered.map(resource => {
                  const typeConfig = resourceTypeConfig[resource.resource_type];
                  const diffConfig = resource.diff_action ? diffActionConfig[resource.diff_action] : null;
                  const TypeIcon = typeConfig.icon;
                  const DiffIcon = diffConfig?.icon;

                  return (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{resource.resource_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell>{resource.ip_address || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{resource.external_id}</TableCell>
                      <TableCell>
                        {diffConfig && (
                          <Badge className={diffConfig.color}>
                            {DiffIcon && <DiffIcon className="w-3 h-3 mr-1" />}
                            {diffConfig.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(resource.discovered_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('virtualization.noDiscoveredResources')}</p>
          )}
        </CardContent>
      </Card>

      {/* HARDENING: Sync Confirmation Dialog */}
      <AlertDialog open={showSyncConfirmation} onOpenChange={setShowSyncConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('virtualization.confirmSync')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('virtualization.confirmSyncDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{t('virtualization.resourcesCreate')}</span>
              <Badge>{diffSummary.create}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{t('virtualization.resourcesUpdate')}</span>
              <Badge variant="outline">{diffSummary.update}</Badge>
            </div>
          </div>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmSync}>
            {t('virtualization.confirmApply')}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VirtualizationPreview;
