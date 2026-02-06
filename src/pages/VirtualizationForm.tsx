// ============================================================
// VIRTUALIZATION INTEGRATION FORM
// Configure wizard for Nutanix Prism and Hyper-V integrations
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSION_KEYS } from '@/security/permissionKeys';
import {
  useVirtualizationIntegration,
  useCreateVirtualizationIntegration,
  useUpdateVirtualizationIntegration,
  useTestConnection,
} from '@/hooks/useVirtualizationIntegrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import NoAccess from '@/components/common/NoAccess';
import { ArrowLeft, CheckCircle2, Loader2, AlertTriangle, Server, Cloud } from 'lucide-react';
import type { IntegrationType, IntegrationConfig, IntegrationMode } from '@/types/virtualization';

const VirtualizationForm: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedSite } = useSite();
  const { hasPermission } = usePermissions();

  const isEdit = id && id !== 'new';
  const canManage = hasPermission(PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_MANAGE);

  const { data: existingIntegration, isLoading: loadingExisting } = useVirtualizationIntegration(isEdit ? id : undefined);

  const createMutation = useCreateVirtualizationIntegration();
  const updateMutation = useUpdateVirtualizationIntegration();
  const testConnectionMutation = useTestConnection();

  // Form state
  const [integrationType, setIntegrationType] = useState<IntegrationType>('nutanix_prism');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<IntegrationMode>('preview');
  const [config, setConfig] = useState<IntegrationConfig>({
    host: '',
    port: 9440,
    preview_interval_minutes: 60,
    sync_interval_minutes: 240,
  });
  const [credential, setCredential] = useState({ username: '', password: '' });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing data
  useEffect(() => {
    if (existingIntegration) {
      setIntegrationType(existingIntegration.integration_type);
      setName(existingIntegration.name);
      setMode(existingIntegration.mode);
      setConfig(existingIntegration.config_json || {});
    }
  }, [existingIntegration]);

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  if (!canManage) {
    return <NoAccess />;
  }

  if (isEdit && loadingExisting) {
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

  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await testConnectionMutation.mutateAsync({
      integration_type: integrationType,
      config: {
        ...config,
        prism_url: integrationType === 'nutanix_prism' ? `https://${config.host}:${config.port || 9440}` : undefined,
      },
      credential,
    });
    setTestResult(result);
  };

  const handleSave = async () => {
    if (isEdit && existingIntegration) {
      await updateMutation.mutateAsync({
        id: existingIntegration.id,
        name,
        mode,
        config_json: config,
      });
    } else {
      await createMutation.mutateAsync({
        site_id: selectedSite.id,
        integration_type: integrationType,
        name,
        mode,
        status: 'disabled',
        config_json: config,
      });
    }
    navigate('/integrations/virtualization');
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/integrations/virtualization')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? t('virtualization.editIntegration') : t('virtualization.newIntegration')}
          </h1>
          <p className="text-muted-foreground">{t('virtualization.configureDescription')}</p>
        </div>
      </div>

      {/* Integration Type Selection (only for new) */}
      {!isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{t('virtualization.selectType')}</CardTitle>
            <CardDescription>{t('virtualization.selectTypeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setIntegrationType('nutanix_prism')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  integrationType === 'nutanix_prism'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Cloud className="h-6 w-6 text-primary" />
                  <span className="font-medium">Nutanix Prism</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('virtualization.nutanixDescription')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIntegrationType('hyperv')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  integrationType === 'hyperv'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Server className="h-6 w-6 text-primary" />
                  <span className="font-medium">Microsoft Hyper-V</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('virtualization.hypervDescription')}
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('virtualization.configuration')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={integrationType === 'nutanix_prism' ? 'Production Nutanix Cluster' : 'Production Hyper-V'}
            />
          </div>

          {/* Connection Settings */}
          <Tabs defaultValue="connection" className="w-full">
            <TabsList>
              <TabsTrigger value="connection">{t('virtualization.connection')}</TabsTrigger>
              <TabsTrigger value="schedule">{t('virtualization.schedule')}</TabsTrigger>
              <TabsTrigger value="mode">{t('virtualization.mode')}</TabsTrigger>
            </TabsList>

            <TabsContent value="connection" className="space-y-4 mt-4">
              {integrationType === 'nutanix_prism' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="host">{t('virtualization.prismHost')}</Label>
                      <Input
                        id="host"
                        value={config.host || ''}
                        onChange={e => setConfig({ ...config, host: e.target.value })}
                        placeholder="prism.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">{t('virtualization.port')}</Label>
                      <Input
                        id="port"
                        type="number"
                        value={config.port || 9440}
                        onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">{t('common.username')}</Label>
                      <Input
                        id="username"
                        value={credential.username}
                        onChange={e => setCredential({ ...credential, username: e.target.value })}
                        placeholder="admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('common.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={credential.password}
                        onChange={e => setCredential({ ...credential, password: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="host">{t('virtualization.hypervHost')}</Label>
                    <Input
                      id="host"
                      value={config.host || ''}
                      onChange={e => setConfig({ ...config, host: e.target.value })}
                      placeholder="hyperv-host.example.com"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">{t('common.username')}</Label>
                      <Input
                        id="username"
                        value={credential.username}
                        onChange={e => setCredential({ ...credential, username: e.target.value })}
                        placeholder="DOMAIN\\admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('common.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={credential.password}
                        onChange={e => setCredential({ ...credential, password: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Test Connection */}
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending || !config.host || !credential.username}
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {t('virtualization.testConnection')}
                </Button>

                {testResult && (
                  <Alert className="mt-4" variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>{testResult.success ? t('common.success') : t('common.error')}</AlertTitle>
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preview_interval">{t('virtualization.previewInterval')}</Label>
                  <Select
                    value={String(config.preview_interval_minutes || 60)}
                    onValueChange={v => setConfig({ ...config, preview_interval_minutes: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 {t('common.minutes')}</SelectItem>
                      <SelectItem value="30">30 {t('common.minutes')}</SelectItem>
                      <SelectItem value="60">1 {t('common.hour')}</SelectItem>
                      <SelectItem value="120">2 {t('common.hours')}</SelectItem>
                      <SelectItem value="240">4 {t('common.hours')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sync_interval">{t('virtualization.syncInterval')}</Label>
                  <Select
                    value={String(config.sync_interval_minutes || 240)}
                    onValueChange={v => setConfig({ ...config, sync_interval_minutes: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 {t('common.hour')}</SelectItem>
                      <SelectItem value="120">2 {t('common.hours')}</SelectItem>
                      <SelectItem value="240">4 {t('common.hours')}</SelectItem>
                      <SelectItem value="480">8 {t('common.hours')}</SelectItem>
                      <SelectItem value="1440">24 {t('common.hours')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mode" className="space-y-4 mt-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('virtualization.modeWarningTitle')}</AlertTitle>
                <AlertDescription>{t('virtualization.modeWarningDescription')}</AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{t('virtualization.syncModeLabel')}</p>
                  <p className="text-sm text-muted-foreground">{t('virtualization.syncModeDescription')}</p>
                </div>
                <Switch
                  checked={mode === 'sync'}
                  onCheckedChange={checked => setMode(checked ? 'sync' : 'preview')}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/integrations/virtualization')}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !name}>
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </div>
  );
};

export default VirtualizationForm;
