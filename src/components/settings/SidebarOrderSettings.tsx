import React, { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useSupabaseData';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowUp, ArrowDown, GripVertical, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  labelKey: string;
  enabled: boolean;
}

const defaultMenuItems: MenuItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', enabled: true },
  { id: 'domainSummary', labelKey: 'nav.domainSummary', enabled: true },
  { id: 'datacenter', labelKey: 'nav.datacenter', enabled: true },
  { id: 'servers', labelKey: 'nav.servers', enabled: true },
  { id: 'employees', labelKey: 'nav.employees', enabled: true },
  { id: 'employeePermissions', labelKey: 'nav.employeePermissions', enabled: true },
  { id: 'vacations', labelKey: 'nav.vacations', enabled: true },
  { id: 'licenses', labelKey: 'nav.licenses', enabled: true },
  { id: 'tasks', labelKey: 'nav.tasks', enabled: true },
  { id: 'vault', labelKey: 'nav.vault', enabled: true },
  { id: 'itTools', labelKey: 'nav.itTools', enabled: true },
  { id: 'onCall', labelKey: 'nav.onCall', enabled: true },
  { id: 'maintenance', labelKey: 'nav.maintenance', enabled: true },
  { id: 'lifecycle', labelKey: 'nav.lifecycle', enabled: true },
  { id: 'fileShares', labelKey: 'nav.fileShares', enabled: true },
  { id: 'scanAgents', labelKey: 'nav.scanAgents', enabled: true },
  { id: 'networks', labelKey: 'nav.networks', enabled: true },
  { id: 'networkScan', labelKey: 'nav.networkScan', enabled: true },
  { id: 'webApps', labelKey: 'nav.webApps', enabled: true },
  { id: 'employeeReports', labelKey: 'nav.employeeReports', enabled: true },
  { id: 'reports', labelKey: 'nav.reports', enabled: true },
  { id: 'auditLog', labelKey: 'nav.auditLog', enabled: true },
  { id: 'settings', labelKey: 'nav.settings', enabled: true },
];

const SidebarOrderSettings: React.FC = () => {
  const { getSetting, updateSetting } = useAppSettings();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true);
      const saved = await getSetting('sidebar_order');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all items exist
          const merged = defaultMenuItems.map(def => {
            const found = parsed.find((p: MenuItem) => p.id === def.id);
            return found ? { ...def, ...found } : def;
          });
          setMenuItems(merged);
        } catch (e) {
          console.error('Failed to parse sidebar order');
        }
      }
      setIsLoading(false);
    };
    loadOrder();
  }, [getSetting]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...menuItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;
    
    [newItems[index], newItems[targetIndex]] = 
    [newItems[targetIndex], newItems[index]];
    
    setMenuItems(newItems);
  };

  const toggleItem = (index: number) => {
    const newItems = [...menuItems];
    newItems[index] = { ...newItems[index], enabled: !newItems[index].enabled };
    setMenuItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateSetting('sidebar_order', JSON.stringify(menuItems));
    setIsSaving(false);
    
    if (success) {
      toast({ 
        title: t('common.success'), 
        description: language === 'ar' ? 'تم حفظ ترتيب القائمة' : 'Menu order saved' 
      });
    } else {
      toast({ 
        title: t('common.error'), 
        description: language === 'ar' ? 'فشل حفظ الترتيب' : 'Failed to save order', 
        variant: 'destructive' 
      });
    }
  };

  const handleReset = () => {
    setMenuItems(defaultMenuItems);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Menu className="w-5 h-5" />
          {t('sidebar.orderTitle')}
        </CardTitle>
        <CardDescription>
          {t('sidebar.orderDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 transition-colors hover:bg-muted/50"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <span className="flex-1 font-medium">
                {t(item.labelKey)}
              </span>
              <Switch
                checked={item.enabled}
                onCheckedChange={() => toggleItem(index)}
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === menuItems.length - 1}
                  className="h-8 w-8"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
            {isSaving 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
              : t('sidebar.saveOrder')}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            {t('sidebar.reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SidebarOrderSettings;
