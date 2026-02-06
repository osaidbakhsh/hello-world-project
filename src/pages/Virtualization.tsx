// ============================================================
// VIRTUALIZATION INTEGRATIONS PAGE
// Main list and management view for hypervisor integrations
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSION_KEYS } from '@/security/permissionKeys';
import {
  useVirtualizationIntegrations,
  useDeleteVirtualizationIntegration,
  useRunPreview,
  useUpdateVirtualizationIntegration,
} from '@/hooks/useVirtualizationIntegrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import NoAccess from '@/components/common/NoAccess';
import { 
  Plus, 
  MoreVertical, 
  Play, 
  Settings, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Server,
  Cloud,
  Eye,
  Loader2,
} from 'lucide-react';
import type { VirtualizationIntegrationWithDetails, IntegrationType } from '@/types/virtualization';

const integrationTypeConfig: Record<IntegrationType, { label: string; icon: React.ElementType; description: string }> = {
  nutanix_prism: {
    label: 'Nutanix Prism',
    icon: Cloud,
    description: 'Nutanix AHV hypervisor via Prism Central/Element API',
  },
  hyperv: {
    label: 'Microsoft Hyper-V',
    icon: Server,
    description: 'Hyper-V via WinRM/PowerShell remoting',
  },
};

const statusConfig = {
  disabled: { color: 'bg-muted text-muted-foreground', icon: XCircle },
  enabled: { color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  degraded: { color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
};

const Virtualization: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { selectedSite } = useSite();
  const { hasPermission } = usePermissions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<VirtualizationIntegrationWithDetails | null>(null);

  const canView = hasPermission(PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_VIEW);
  const canManage = hasPermission(PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_MANAGE);

  const { data: integrations, isLoading, error } = useVirtualizationIntegrations(
    selectedSite ? { site_id: selectedSite.id } : undefined
  );

  const deleteMutation = useDeleteVirtualizationIntegration();
  const runPreviewMutation = useRunPreview();
  const updateMutation = useUpdateVirtualizationIntegration();

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  if (!canView) {
    return <NoAccess />;
  }

  const handleDelete = async () => {
    if (!selectedIntegration) return;
    await deleteMutation.mutateAsync(selectedIntegration.id);
    setDeleteDialogOpen(false);
    setSelectedIntegration(null);
  };

  const handleRunPreview = async (integration: VirtualizationIntegrationWithDetails) => {
    await runPreviewMutation.mutateAsync(integration.id);
  };

  const handleToggleStatus = async (integration: VirtualizationIntegrationWithDetails) => {
    const newStatus = integration.status === 'disabled' ? 'enabled' : 'disabled';
    await updateMutation.mutateAsync({ id: integration.id, status: newStatus });
  };

  const handleToggleMode = async (integration: VirtualizationIntegrationWithDetails) => {
    const newMode = integration.mode === 'preview' ? 'sync' : 'preview';
    await updateMutation.mutateAsync({ id: integration.id, mode: newMode });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('virtualization.title')}</h1>
          <p className="text-muted-foreground">{t('virtualization.description')}</p>
        </div>
        {canManage && (
          <Button onClick={() => navigate('/integrations/virtualization/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('virtualization.addIntegration')}
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('virtualization.previewModeTitle')}</AlertTitle>
        <AlertDescription>
          {t('virtualization.previewModeDescription')}
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && integrations?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('virtualization.noIntegrations')}</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {t('virtualization.noIntegrationsDescription')}
            </p>
            {canManage && (
              <Button onClick={() => navigate('/integrations/virtualization/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('virtualization.addIntegration')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Cards */}
      {!isLoading && integrations && integrations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map(integration => {
            const typeConfig = integrationTypeConfig[integration.integration_type];
            const StatusIcon = statusConfig[integration.status].icon;
            const TypeIcon = typeConfig.icon;

            return (
              <Card key={integration.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription>{typeConfig.label}</CardDescription>
                      </div>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/integrations/virtualization/${integration.id}`)}>
                            <Settings className="w-4 h-4 mr-2" />
                            {t('common.configure')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRunPreview(integration)} disabled={runPreviewMutation.isPending}>
                            <Play className="w-4 h-4 mr-2" />
                            {t('virtualization.runPreview')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/integrations/virtualization/${integration.id}/preview`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('virtualization.viewDiscovered')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(integration)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {integration.status === 'disabled' ? t('common.enable') : t('common.disable')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleMode(integration)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {integration.mode === 'preview' ? t('virtualization.enableSync') : t('virtualization.enablePreview')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedIntegration(integration);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={statusConfig[integration.status].color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {integration.status}
                    </Badge>
                    <Badge variant="outline">
                      {integration.mode === 'preview' ? t('virtualization.modePreview') : t('virtualization.modeSync')}
                    </Badge>
                  </div>

                  {/* Last Sync */}
                  <div className="text-sm text-muted-foreground">
                    {integration.last_sync_at ? (
                      <span>{t('virtualization.lastSync')}: {new Date(integration.last_sync_at).toLocaleString()}</span>
                    ) : (
                      <span>{t('virtualization.neverSynced')}</span>
                    )}
                  </div>

                  {/* Error Display */}
                  {integration.last_error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{integration.last_error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Quick Actions */}
                  {canManage && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunPreview(integration)}
                        disabled={runPreviewMutation.isPending}
                      >
                        {runPreviewMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        {t('virtualization.runPreview')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/integrations/virtualization/${integration.id}/preview`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t('virtualization.viewDiscovered')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('virtualization.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('virtualization.deleteConfirmDescription').replace('{name}', selectedIntegration?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Virtualization;
