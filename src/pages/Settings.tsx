import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Globe, Database, Trash2, Download, Upload, Info, Palette, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useServers, useNetworks, useEmployees, useLicenses, useTasks } from '@/hooks/useLocalStorage';
import { downloadServerTemplate, downloadEmployeeReportTemplate, downloadLicenseTemplate, downloadNetworkTemplate, downloadEmployeeTemplate } from '@/utils/excelTemplates';
import * as XLSX from 'xlsx';

const Settings: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [appSettings, setAppSettings] = useAppSettings();
  const [servers, setServers] = useServers();
  const [networks, setNetworks] = useNetworks();
  const [employees, setEmployees] = useEmployees();
  const [licenses, setLicenses] = useLicenses();
  const [tasks, setTasks] = useTasks();

  const exportAllData = () => {
    const allData = {
      servers,
      networks,
      employees,
      licenses,
      tasks,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `it-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: t('common.success'), description: 'Backup created successfully' });
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.servers) setServers(data.servers);
        if (data.networks) setNetworks(data.networks);
        if (data.employees) setEmployees(data.employees);
        if (data.licenses) setLicenses(data.licenses);
        if (data.tasks) setTasks(data.tasks);

        toast({ title: t('common.success'), description: 'Data imported successfully' });
      } catch (error) {
        toast({
          title: t('common.error'),
          description: 'Failed to import data. Invalid file format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
      setServers([]);
      setNetworks([]);
      setEmployees([]);
      setLicenses([]);
      setTasks([]);
      toast({ title: t('common.success'), description: 'All data cleared' });
    }
  };

  const totalRecords = servers.length + networks.length + employees.length + licenses.length + tasks.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
          <p className="text-muted-foreground">Manage your application settings</p>
        </div>
      </div>

      {/* App Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            App Branding
          </CardTitle>
          <CardDescription>
            Customize the application name and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Application Name</Label>
            <Input
              value={appSettings.appName}
              onChange={(e) => setAppSettings({ appName: e.target.value })}
              placeholder="IT"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">This name appears in the sidebar header</p>
          </div>
          <div className="space-y-2">
            <Label>Company Name (Optional)</Label>
            <Input
              value={appSettings.companyName || ''}
              onChange={(e) => setAppSettings({ companyName: e.target.value })}
              placeholder="Your Company"
              maxLength={50}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language Settings
          </CardTitle>
          <CardDescription>
            Choose your preferred language for the interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Interface Language</Label>
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
            Excel Templates
          </CardTitle>
          <CardDescription>
            Download pre-formatted templates for importing data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button variant="outline" onClick={downloadServerTemplate} className="gap-2 justify-start">
              <Download className="w-4 h-4" />
              Server Template
            </Button>
            <Button variant="outline" onClick={downloadNetworkTemplate} className="gap-2 justify-start">
              <Download className="w-4 h-4" />
              Network Template
            </Button>
            <Button variant="outline" onClick={downloadEmployeeTemplate} className="gap-2 justify-start">
              <Download className="w-4 h-4" />
              Employee Template
            </Button>
            <Button variant="outline" onClick={downloadLicenseTemplate} className="gap-2 justify-start">
              <Download className="w-4 h-4" />
              License Template
            </Button>
            <Button variant="outline" onClick={downloadEmployeeReportTemplate} className="gap-2 justify-start">
              <Download className="w-4 h-4" />
              Employee Report Template
            </Button>
          </div>
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Each template includes an instructions sheet explaining the required columns and data format.
          </p>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Backup, restore, and manage your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Total Records</span>
              <Badge variant="secondary">{totalRecords}</Badge>
            </div>
            <div className="grid grid-cols-5 gap-4 text-center text-sm">
              <div>
                <p className="font-bold text-lg">{servers.length}</p>
                <p className="text-muted-foreground">Servers</p>
              </div>
              <div>
                <p className="font-bold text-lg">{networks.length}</p>
                <p className="text-muted-foreground">Networks</p>
              </div>
              <div>
                <p className="font-bold text-lg">{employees.length}</p>
                <p className="text-muted-foreground">Employees</p>
              </div>
              <div>
                <p className="font-bold text-lg">{licenses.length}</p>
                <p className="text-muted-foreground">Licenses</p>
              </div>
              <div>
                <p className="font-bold text-lg">{tasks.length}</p>
                <p className="text-muted-foreground">Tasks</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Backup & Restore */}
          <div className="space-y-4">
            <h4 className="font-medium">Backup & Restore</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportAllData} className="gap-2">
                <Download className="w-4 h-4" />
                Export Backup (JSON)
              </Button>
              <input
                type="file"
                id="import-backup"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-backup')?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Backup
              </Button>
            </div>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Backups include all your servers, networks, employees, licenses, and tasks data.
              Store backups securely as they contain sensitive information.
            </p>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <h4 className="font-medium text-destructive">Danger Zone</h4>
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear All Data</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all data from this application
                  </p>
                </div>
                <Button variant="destructive" onClick={clearAllData} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">IT Infrastructure Manager</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Version</span>
              <Badge variant="outline">1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium">Local (Browser)</span>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              This application stores all data locally on your device. No data is sent to any external servers.
              Make sure to regularly backup your data to prevent data loss.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
