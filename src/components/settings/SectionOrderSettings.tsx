import React, { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useSupabaseData';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowUp, ArrowDown, GripVertical, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Section {
  id: string;
  nameAr: string;
  nameEn: string;
  enabled: boolean;
}

const defaultSections: Section[] = [
  { id: 'stats', nameAr: 'الإحصائيات', nameEn: 'Statistics', enabled: true },
  { id: 'webapps', nameAr: 'تطبيقات الويب', nameEn: 'Web Apps', enabled: true },
  { id: 'tasks', nameAr: 'المهام', nameEn: 'Tasks', enabled: true },
  { id: 'progress', nameAr: 'نسبة الإنجاز', nameEn: 'Progress', enabled: true },
];

const SectionOrderSettings: React.FC = () => {
  const { getSetting, updateSetting } = useAppSettings();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true);
      const saved = await getSetting('dashboard_order');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all sections exist
          const merged = defaultSections.map(def => {
            const found = parsed.find((p: Section) => p.id === def.id);
            return found ? { ...def, ...found } : def;
          });
          setSections(merged);
        } catch (e) {
          console.error('Failed to parse dashboard order');
        }
      }
      setIsLoading(false);
    };
    loadOrder();
  }, [getSetting]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    
    [newSections[index], newSections[targetIndex]] = 
    [newSections[targetIndex], newSections[index]];
    
    setSections(newSections);
  };

  const toggleSection = (index: number) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], enabled: !newSections[index].enabled };
    setSections(newSections);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateSetting('dashboard_order', JSON.stringify(sections));
    setIsSaving(false);
    
    if (success) {
      toast({ 
        title: t('common.success'), 
        description: language === 'ar' ? 'تم حفظ ترتيب الأقسام' : 'Section order saved' 
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
    setSections(defaultSections);
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
          <LayoutDashboard className="w-5 h-5" />
          {language === 'ar' ? 'ترتيب أقسام لوحة التحكم' : 'Dashboard Section Order'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'قم بترتيب وتفعيل/تعطيل أقسام لوحة التحكم حسب تفضيلاتك' 
            : 'Arrange and enable/disable dashboard sections according to your preferences'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sections.map((section, index) => (
            <div 
              key={section.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 transition-colors hover:bg-muted/50"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <span className="flex-1 font-medium">
                {language === 'ar' ? section.nameAr : section.nameEn}
              </span>
              <Switch
                checked={section.enabled}
                onCheckedChange={() => toggleSection(index)}
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
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
              : (language === 'ar' ? 'حفظ الترتيب' : 'Save Order')}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SectionOrderSettings;
