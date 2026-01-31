import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Globe, Database, Info, Palette, FileSpreadsheet, Download, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadServerTemplate, downloadEmployeeReportTemplate, downloadLicenseTemplate, downloadNetworkTemplate, downloadEmployeeTemplate } from '@/utils/excelTemplates';

const Settings: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  const { appName, updateAppName } = useAppName();
  const [localAppName, setLocalAppName] = React.useState(appName);

  React.useEffect(() => {
    setLocalAppName(appName);
  }, [appName]);

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

      {/* Excel Templates */}
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
    </div>
  );
};

export default Settings;
