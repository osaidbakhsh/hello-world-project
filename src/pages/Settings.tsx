import React, { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName, useAppSettings } from '@/hooks/useSupabaseData';
import { useLoginBackground } from '@/hooks/useLoginBackground';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Globe, Info, Palette, FileSpreadsheet, Download, User, Mail, Shield, Clock, ImageIcon, Loader2, LayoutDashboard, Lock, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadServerTemplate, downloadEmployeeReportTemplate, downloadLicenseTemplate, downloadNetworkTemplate, downloadEmployeeTemplate } from '@/utils/excelTemplates';
import SectionOrderSettings from '@/components/settings/SectionOrderSettings';
import SidebarOrderSettings from '@/components/settings/SidebarOrderSettings';
import HTTPSSettingsTab from '@/components/settings/HTTPSSettingsTab';

const Settings: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  const { appName, updateAppName } = useAppName();
  const { getSetting, updateSetting } = useAppSettings();
  const { backgroundUrl, uploadBackground } = useLoginBackground();
  const [localAppName, setLocalAppName] = React.useState(appName);
  const [isUploadingBg, setIsUploadingBg] = React.useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
          <p className="text-muted-foreground">إدارة إعدادات التطبيق</p>
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
                معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الاسم</span>
                <span className="font-medium">{profile?.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">البريد الإلكتروني</span>
                <span className="font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الدور</span>
                <span className="font-medium">{profile?.role === 'admin' ? 'مدير النظام' : 'موظف'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">القسم</span>
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
                  تخصيص التطبيق
                </CardTitle>
                <CardDescription>
                  تخصيص اسم التطبيق والعلامة التجارية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم التطبيق</Label>
                  <div className="flex gap-2">
                    <Input
                      value={localAppName}
                      onChange={(e) => setLocalAppName(e.target.value)}
                      placeholder="IT"
                      maxLength={20}
                    />
                    <Button onClick={handleSaveAppName}>حفظ</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">يظهر هذا الاسم في الشريط الجانبي</p>
                </div>

                <Separator className="my-4" />

                {/* Login Background Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    خلفية صفحة الدخول
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
                        {isUploadingBg ? 'جارٍ الرفع...' : 'رفع صورة جديدة'}
                      </Button>
                      <p className="text-xs text-muted-foreground">يُفضل صورة بدقة 1920×1080 أو أعلى</p>
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
                إعدادات اللغة
              </CardTitle>
              <CardDescription>
                اختر لغة الواجهة المفضلة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>لغة الواجهة</Label>
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
                حول التطبيق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">التطبيق</span>
                  <span className="font-medium">IT Infrastructure Manager</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الإصدار</span>
                  <span className="font-medium">2.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">التخزين</span>
                  <span className="font-medium">Lovable Cloud</span>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  يتم تخزين جميع البيانات بشكل آمن في السحابة مع تشفير كامل.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-6 mt-6">
          <SectionOrderSettings />
          <SidebarOrderSettings />
        </TabsContent>

        {/* Mail Settings Tab */}
        <TabsContent value="mail" className="space-y-6 mt-6">
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
                <Button variant="outline">
                  اختبار الاتصال
                </Button>
              </div>
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
                <Button variant="outline">
                  اختبار الاتصال
                </Button>
                <Button variant="outline">
                  مزامنة المستخدمين
                </Button>
              </div>

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
                <Button variant="outline">
                  اختبار المزامنة
                </Button>
              </div>

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