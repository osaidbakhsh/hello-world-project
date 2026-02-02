import React, { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName, useAppSettings, useDomains } from '@/hooks/useSupabaseData';
import { useLoginBackground } from '@/hooks/useLoginBackground';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Globe, Info, Palette, FileSpreadsheet, Download, User, Mail, Shield, Clock, ImageIcon, Loader2, LayoutDashboard, Lock, Upload, Database, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadServerTemplate, downloadEmployeeReportTemplate, downloadLicenseTemplate, downloadNetworkTemplate, downloadEmployeeTemplate } from '@/utils/excelTemplates';
import SectionOrderSettings from '@/components/settings/SectionOrderSettings';
import SidebarOrderSettings from '@/components/settings/SidebarOrderSettings';
import HTTPSSettingsTab from '@/components/settings/HTTPSSettingsTab';
import { seedAllData, resetAndSeedData } from '@/utils/seedData';
import { cn } from '@/lib/utils';

interface TestResult {
  success: boolean;
  status: string;
  message: string;
  latency_ms?: number;
  error_details?: any;
}

const Settings: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const { appName, updateAppName } = useAppName();
  const { getSetting, updateSetting } = useAppSettings();
  const { backgroundUrl, uploadBackground } = useLoginBackground();
  const { data: domains } = useDomains();
  const [localAppName, setLocalAppName] = React.useState(appName);
  const [isUploadingBg, setIsUploadingBg] = React.useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Test states
  const [mailTestResult, setMailTestResult] = useState<TestResult | null>(null);
  const [isTestingMail, setIsTestingMail] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState<TestResult | null>(null);
  const [isTestingLdap, setIsTestingLdap] = useState(false);
  const [ntpTestResult, setNtpTestResult] = useState<TestResult | null>(null);
  const [isTestingNtp, setIsTestingNtp] = useState(false);

  // Mail Settings State
  const [mailSettings, setMailSettings] = React.useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_encryption: 'tls',
    smtp_enabled: false,
  });

  // LDAP Settings State
  const [ldapSettings, setLdapSettings] = React.useState({
    ldap_host: '',
    ldap_port: '389',
    ldap_base_dn: '',
    ldap_bind_dn: '',
    ldap_bind_password: '',
    ldap_user_filter: '(sAMAccountName={username})',
    ldap_use_ssl: false,
    ldap_enabled: false,
  });

  // NTP Settings State
  const [ntpSettings, setNtpSettings] = React.useState({
    ntp_server_primary: '',
    ntp_server_secondary: '',
    ntp_sync_interval: '3600',
    ntp_enabled: false,
  });

  React.useEffect(() => {
    setLocalAppName(appName);
  }, [appName]);

  // Load settings from database
  React.useEffect(() => {
    const loadSettings = async () => {
      const savedMailSettings = await getSetting('mail_settings');
      if (savedMailSettings) {
        try {
          setMailSettings(JSON.parse(savedMailSettings));
        } catch (e) {
          console.error('Failed to parse mail settings');
        }
      }

      const savedLdapSettings = await getSetting('ldap_settings');
      if (savedLdapSettings) {
        try {
          setLdapSettings(JSON.parse(savedLdapSettings));
        } catch (e) {
          console.error('Failed to parse LDAP settings');
        }
      }

      const savedNtpSettings = await getSetting('ntp_settings');
      if (savedNtpSettings) {
        try {
          setNtpSettings(JSON.parse(savedNtpSettings));
        } catch (e) {
          console.error('Failed to parse NTP settings');
        }
      }
    };
    loadSettings();
  }, [getSetting]);

  const handleSaveAppName = async () => {
    const success = await updateAppName(localAppName);
    if (success) {
      toast({ title: t('common.success'), description: 'تم تحديث اسم التطبيق' });
    } else {
      toast({ 
        title: t('common.error'), 
        description: 'فشل في تحديث اسم التطبيق. تأكد من صلاحياتك.',
        variant: 'destructive' 
      });
    }
  };

  const handleSaveMailSettings = async () => {
    const success = await updateSetting('mail_settings', JSON.stringify(mailSettings));
    if (success) {
      toast({ title: t('common.success'), description: 'تم حفظ إعدادات البريد' });
    } else {
      toast({ 
        title: t('common.error'), 
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive' 
      });
    }
  };

  const handleSaveLdapSettings = async () => {
    const success = await updateSetting('ldap_settings', JSON.stringify(ldapSettings));
    if (success) {
      toast({ title: t('common.success'), description: 'تم حفظ إعدادات LDAP' });
    } else {
      toast({ 
        title: t('common.error'), 
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive' 
      });
    }
  };

  const handleSaveNtpSettings = async () => {
    const success = await updateSetting('ntp_settings', JSON.stringify(ntpSettings));
    if (success) {
      toast({ title: t('common.success'), description: 'تم حفظ إعدادات NTP' });
    } else {
      toast({ 
        title: t('common.error'), 
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive' 
      });
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
    const success = await uploadBackground(file);
    setIsUploadingBg(false);
    if (success) {
      toast({ title: t('common.success'), description: 'تم رفع خلفية صفحة الدخول' });
    } else {
      toast({ title: t('common.error'), description: 'فشل رفع الخلفية', variant: 'destructive' });
    }
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    const result = await seedAllData();
    setIsSeeding(false);
    
    if (result.success) {
      toast({ 
        title: t('common.success'), 
        description: result.message 
      });
    } else {
      toast({ 
        title: t('common.error'), 
        description: result.message, 
        variant: 'destructive' 
      });
    }
  };

  // Test connection handlers
  const handleTestMail = async () => {
    if (!selectedDomainId) {
      toast({ title: t('common.error'), description: t('settings.selectDomainFirst'), variant: 'destructive' });
      return;
    }
    setIsTestingMail(true);
    setMailTestResult(null);
    try {
      const response = await supabase.functions.invoke('test-connection', {
        body: { domain_id: selectedDomainId, module: 'mail' }
      });
      setMailTestResult(response.data || { success: false, status: 'fail', message: 'No response' });
    } catch (error: any) {
      setMailTestResult({ success: false, status: 'fail', message: error.message });
    } finally {
      setIsTestingMail(false);
    }
  };

  const handleTestLdap = async () => {
    if (!selectedDomainId) {
      toast({ title: t('common.error'), description: t('settings.selectDomainFirst'), variant: 'destructive' });
      return;
    }
    setIsTestingLdap(true);
    setLdapTestResult(null);
    try {
      const response = await supabase.functions.invoke('test-connection', {
        body: { domain_id: selectedDomainId, module: 'ldap' }
      });
      setLdapTestResult(response.data || { success: false, status: 'fail', message: 'No response' });
    } catch (error: any) {
      setLdapTestResult({ success: false, status: 'fail', message: error.message });
    } finally {
      setIsTestingLdap(false);
    }
  };

  const handleTestNtp = async () => {
    if (!selectedDomainId) {
      toast({ title: t('common.error'), description: t('settings.selectDomainFirst'), variant: 'destructive' });
      return;
    }
    setIsTestingNtp(true);
    setNtpTestResult(null);
    try {
      const response = await supabase.functions.invoke('test-connection', {
        body: { domain_id: selectedDomainId, module: 'ntp' }
      });
      setNtpTestResult(response.data || { success: false, status: 'fail', message: 'No response' });
    } catch (error: any) {
      setNtpTestResult({ success: false, status: 'fail', message: error.message });
    } finally {
      setIsTestingNtp(false);
    }
  };

  const renderTestResult = (result: TestResult | null) => {
    if (!result) return null;
    return (
      <div className={cn(
        "p-4 rounded-lg border mt-4",
        result.success 
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
      )}>
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="font-medium">
            {result.success ? t('settings.testSuccess') : t('settings.testFailed')}
          </span>
          {result.latency_ms && (
            <Badge variant="outline">{result.latency_ms}ms</Badge>
          )}
        </div>
        <p className="text-sm mt-2">{result.message}</p>
      </div>
    );
  };

  const handleResetDemoData = async () => {
    setIsResetting(true);
    const result = await resetAndSeedData();
    setIsResetting(false);
    
    if (result.success) {
      toast({ 
        title: t('common.success'), 
        description: result.message 
      });
    } else {
      toast({ 
        title: t('common.error'), 
        description: result.message, 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
          <p className="text-muted-foreground">{t('settings.manageSettings')}</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="customization" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.customization')}</span>
          </TabsTrigger>
          <TabsTrigger value="mail" className="gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.mail')}</span>
          </TabsTrigger>
          <TabsTrigger value="ldap" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.ldap')}</span>
          </TabsTrigger>
          <TabsTrigger value="ntp" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.ntp')}</span>
          </TabsTrigger>
          <TabsTrigger value="https" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.https') || 'HTTPS'}</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.templates')}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('settings.accountInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('settings.name')}</span>
                <span className="font-medium">{profile?.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('settings.email')}</span>
                <span className="font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('settings.role')}</span>
                <span className="font-medium">{profile?.role === 'admin' ? t('settings.admin') : t('settings.employee')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('settings.department')}</span>
                <span className="font-medium">{profile?.department || 'IT'}</span>
              </div>
            </CardContent>
          </Card>

          {/* App Branding - Admin Only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  {t('settings.appBranding')}
                </CardTitle>
                <CardDescription>
                  {t('settings.appBrandingDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.appName')}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={localAppName}
                      onChange={(e) => setLocalAppName(e.target.value)}
                      placeholder="IT"
                      maxLength={20}
                    />
                    <Button onClick={handleSaveAppName}>{t('common.save')}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('settings.showsInSidebar')}</p>
                </div>

                <Separator className="my-4" />

                {/* Login Background Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {t('settings.loginBackground')}
                  </Label>
                  <div className="flex gap-2 items-center">
                    <img
                      src={backgroundUrl}
                      alt="Login background preview"
                      className="h-16 w-28 object-cover rounded border"
                    />
                    <div className="flex flex-col gap-1">
                      <input
                        ref={bgInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBackgroundUpload}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingBg}
                        onClick={() => bgInputRef.current?.click()}
                      >
                        {isUploadingBg ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : null}
                        {isUploadingBg ? t('settings.uploading') : t('settings.uploadNewImage')}
                      </Button>
                      <p className="text-xs text-muted-foreground">{t('settings.preferredResolution')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('settings.languageSettings')}
              </CardTitle>
              <CardDescription>
                {t('settings.chooseLanguage')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.interfaceLanguage')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'العربية' : 'English'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={language === 'en' ? 'font-medium' : 'text-muted-foreground'}>EN</span>
                  <Switch
                    checked={language === 'ar'}
                    onCheckedChange={(checked) => setLanguage(checked ? 'ar' : 'en')}
                  />
                  <span className={language === 'ar' ? 'font-medium' : 'text-muted-foreground'}>AR</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                {t('settings.about')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('settings.application')}</span>
                  <span className="font-medium">IT Infrastructure Manager</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('settings.version')}</span>
                  <span className="font-medium">2.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('settings.storage')}</span>
                  <span className="font-medium">Lovable Cloud</span>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {t('settings.cloudStorageNote')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Test Data - Admin Only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {t('settings.testData')}
                </CardTitle>
                <CardDescription>
                  {t('settings.testDataDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSeedData} disabled={isSeeding || isResetting}>
                  {isSeeding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin me-2" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('settings.createTestData')
                  )}
                </Button>
                
                {/* Reset Demo Data - Super Admin Only */}
                {isSuperAdmin && (
                  <Button 
                    variant="destructive" 
                    onClick={handleResetDemoData}
                    disabled={isSeeding || isResetting}
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('settings.resetDemoData')
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-6 mt-6">
          <SectionOrderSettings />
          <SidebarOrderSettings />
        </TabsContent>

        {/* Mail Settings Tab */}
        <TabsContent value="mail" className="space-y-6 mt-6">
          {/* Domain Selector for Tests */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Label>{t('common.domain')}</Label>
                <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={t('settings.selectDomainFirst')} />
                  </SelectTrigger>
                  <SelectContent>
                    {domains?.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                إعدادات البريد (Exchange Server)
              </CardTitle>
              <CardDescription>
                تكوين خادم البريد للتكامل مع Exchange Server 2019
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base">تفعيل البريد</Label>
                  <p className="text-sm text-muted-foreground">تفعيل إرسال الإشعارات عبر البريد</p>
                </div>
                <Switch
                  checked={mailSettings.smtp_enabled}
                  onCheckedChange={(checked) => setMailSettings(prev => ({ ...prev, smtp_enabled: checked }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>خادم SMTP</Label>
                  <Input
                    placeholder="mail.example.com"
                    value={mailSettings.smtp_host}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المنفذ</Label>
                  <Input
                    placeholder="587"
                    value={mailSettings.smtp_port}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, smtp_port: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input
                    placeholder="user@example.com"
                    value={mailSettings.smtp_user}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, smtp_user: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={mailSettings.smtp_password}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد المرسل</Label>
                  <Input
                    placeholder="noreply@example.com"
                    value={mailSettings.smtp_from_email}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, smtp_from_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المرسل</Label>
                  <Input
                    placeholder="IT Infrastructure"
                    value={mailSettings.smtp_from_name}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>تشفير TLS/SSL</Label>
                  <p className="text-sm text-muted-foreground">استخدام اتصال آمن</p>
                </div>
                <Switch
                  checked={mailSettings.smtp_encryption === 'tls'}
                  onCheckedChange={(checked) => setMailSettings(prev => ({ ...prev, smtp_encryption: checked ? 'tls' : 'none' }))}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveMailSettings} className="flex-1">
                  حفظ الإعدادات
                </Button>
                <Button variant="outline" onClick={handleTestMail} disabled={isTestingMail || !selectedDomainId}>
                  {isTestingMail ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  اختبار الاتصال
                </Button>
              </div>
              {renderTestResult(mailTestResult)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LDAP Settings Tab */}
        <TabsContent value="ldap" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إعدادات LDAP (Active Directory)
              </CardTitle>
              <CardDescription>
                تكوين الاتصال بـ Active Directory Domain Controller لاستيراد المستخدمين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base">تفعيل LDAP</Label>
                  <p className="text-sm text-muted-foreground">تفعيل مزامنة المستخدمين من Active Directory</p>
                </div>
                <Switch
                  checked={ldapSettings.ldap_enabled}
                  onCheckedChange={(checked) => setLdapSettings(prev => ({ ...prev, ldap_enabled: checked }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>خادم LDAP</Label>
                  <Input
                    placeholder="dc.example.local"
                    value={ldapSettings.ldap_host}
                    onChange={(e) => setLdapSettings(prev => ({ ...prev, ldap_host: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المنفذ</Label>
                  <Input
                    placeholder="389 أو 636 لـ SSL"
                    value={ldapSettings.ldap_port}
                    onChange={(e) => setLdapSettings(prev => ({ ...prev, ldap_port: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Base DN</Label>
                  <Input
                    placeholder="DC=example,DC=local"
                    value={ldapSettings.ldap_base_dn}
                    onChange={(e) => setLdapSettings(prev => ({ ...prev, ldap_base_dn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bind DN (حساب الربط)</Label>
                  <Input
                    placeholder="CN=ldap_user,OU=Service Accounts,DC=example,DC=local"
                    value={ldapSettings.ldap_bind_dn}
                    onChange={(e) => setLdapSettings(prev => ({ ...prev, ldap_bind_dn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة مرور الربط</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={ldapSettings.ldap_bind_password}
                    onChange={(e) => setLdapSettings(prev => ({ ...prev, ldap_bind_password: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>فلتر المستخدمين</Label>
                  <Input
                    placeholder="(sAMAccountName={username})"
                    value={ldapSettings.ldap_user_filter}
                    onChange={(e) => setLdapSettings(prev => ({ ...prev, ldap_user_filter: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    فلتر LDAP للبحث عن المستخدمين. استخدم {'{username}'} كعنصر نائب.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>استخدام SSL/TLS</Label>
                  <p className="text-sm text-muted-foreground">اتصال آمن (LDAPS - المنفذ 636)</p>
                </div>
                <Switch
                  checked={ldapSettings.ldap_use_ssl}
                  onCheckedChange={(checked) => setLdapSettings(prev => ({ ...prev, ldap_use_ssl: checked }))}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveLdapSettings} className="flex-1">
                  حفظ الإعدادات
                </Button>
                <Button variant="outline" onClick={handleTestLdap} disabled={isTestingLdap || !selectedDomainId}>
                  {isTestingLdap ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  اختبار الاتصال
                </Button>
                <Button variant="outline">
                  مزامنة المستخدمين
                </Button>
              </div>
              {renderTestResult(ldapTestResult)}

              <div className="p-4 border rounded-lg bg-info/10 border-info/20">
                <div className="flex gap-2 items-start">
                  <Info className="w-5 h-5 text-info mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-info">ملاحظة هامة</p>
                    <p className="text-muted-foreground">
                      تأكد من أن حساب الربط لديه صلاحيات القراءة على OU المستخدمين في Active Directory.
                      لا يتم تخزين كلمات المرور محلياً - يتم التحقق منها مباشرة مع DC.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NTP Settings Tab */}
        <TabsContent value="ntp" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                إعدادات NTP (مزامنة الوقت)
              </CardTitle>
              <CardDescription>
                تكوين خوادم NTP لمزامنة الوقت عبر جميع السيرفرات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base">تفعيل NTP</Label>
                  <p className="text-sm text-muted-foreground">تفعيل مزامنة الوقت التلقائية</p>
                </div>
                <Switch
                  checked={ntpSettings.ntp_enabled}
                  onCheckedChange={(checked) => setNtpSettings(prev => ({ ...prev, ntp_enabled: checked }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>خادم NTP الأساسي</Label>
                  <Input
                    placeholder="time.windows.com أو pool.ntp.org"
                    value={ntpSettings.ntp_server_primary}
                    onChange={(e) => setNtpSettings(prev => ({ ...prev, ntp_server_primary: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>خادم NTP الاحتياطي</Label>
                  <Input
                    placeholder="time.google.com"
                    value={ntpSettings.ntp_server_secondary}
                    onChange={(e) => setNtpSettings(prev => ({ ...prev, ntp_server_secondary: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>فترة المزامنة (بالثواني)</Label>
                  <Input
                    type="number"
                    placeholder="3600"
                    value={ntpSettings.ntp_sync_interval}
                    onChange={(e) => setNtpSettings(prev => ({ ...prev, ntp_sync_interval: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    الافتراضي: 3600 ثانية (ساعة واحدة)
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">خوادم NTP شائعة:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>• time.windows.com (Microsoft)</div>
                  <div>• time.google.com (Google)</div>
                  <div>• pool.ntp.org (عام)</div>
                  <div>• time.apple.com (Apple)</div>
                  <div>• ntp.ubuntu.com (Ubuntu)</div>
                  <div>• time.cloudflare.com (Cloudflare)</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveNtpSettings} className="flex-1">
                  حفظ الإعدادات
                </Button>
                <Button variant="outline" onClick={handleTestNtp} disabled={isTestingNtp || !selectedDomainId}>
                  {isTestingNtp ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  اختبار المزامنة
                </Button>
              </div>
              {renderTestResult(ntpTestResult)}

              <div className="p-4 border rounded-lg bg-warning/10 border-warning/20">
                <div className="flex gap-2 items-start">
                  <Info className="w-5 h-5 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">نصيحة</p>
                    <p className="text-muted-foreground">
                      للبيئات الإنتاجية، يُفضل استخدام خادم NTP داخلي (مثل Domain Controller) لضمان تزامن الوقت
                      بين جميع الأجهزة في الشبكة المحلية.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                قوالب Excel
              </CardTitle>
              <CardDescription>
                تحميل قوالب جاهزة لاستيراد البيانات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button variant="outline" onClick={downloadServerTemplate} className="gap-2 justify-start">
                  <Download className="w-4 h-4" />
                  قالب السيرفرات
                </Button>
                <Button variant="outline" onClick={downloadNetworkTemplate} className="gap-2 justify-start">
                  <Download className="w-4 h-4" />
                  قالب الشبكات
                </Button>
                <Button variant="outline" onClick={downloadEmployeeTemplate} className="gap-2 justify-start">
                  <Download className="w-4 h-4" />
                  قالب الموظفين
                </Button>
                <Button variant="outline" onClick={downloadLicenseTemplate} className="gap-2 justify-start">
                  <Download className="w-4 h-4" />
                  قالب التراخيص
                </Button>
                <Button variant="outline" onClick={downloadEmployeeReportTemplate} className="gap-2 justify-start">
                  <Download className="w-4 h-4" />
                  قالب تقارير الموظفين
                </Button>
              </div>
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                كل قالب يتضمن صفحة تعليمات توضح الأعمدة المطلوبة وتنسيق البيانات.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HTTPS Settings Tab */}
        <TabsContent value="https" className="space-y-6 mt-6">
          <HTTPSSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;