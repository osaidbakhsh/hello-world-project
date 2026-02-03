import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  domainId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const DatacenterForm: React.FC<Props> = ({ domainId, onClose, onSuccess }) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    notes: '',
  });

  const handleSubmit = async () => {
    // Validation
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push(language === 'ar' ? 'الاسم مطلوب' : 'Name is required');
    } else if (formData.name.length > 100) {
      errors.push(language === 'ar' ? 'الاسم يجب أن يكون أقل من 100 حرف' : 'Name must be less than 100 characters');
    }
    
    if (formData.location && formData.location.length > 200) {
      errors.push(language === 'ar' ? 'الموقع يجب أن يكون أقل من 200 حرف' : 'Location must be less than 200 characters');
    }
    
    if (formData.notes && formData.notes.length > 2000) {
      errors.push(language === 'ar' ? 'الملاحظات يجب أن تكون أقل من 2000 حرف' : 'Notes must be less than 2000 characters');
    }
    
    if (errors.length > 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: errors[0],
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('datacenters')
        .insert([{
          domain_id: domainId,
          name: formData.name.trim(),
          location: formData.location.trim() || null,
          notes: formData.notes.trim() || null,
        }]);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إنشاء مركز البيانات بنجاح' : 'Datacenter created successfully',
      });

      queryClient.invalidateQueries({ queryKey: ['datacenters'] });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إضافة مركز بيانات' : 'Add Datacenter'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('common.name')} *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={language === 'ar' ? 'مركز البيانات الرئيسي' : 'Main Datacenter'}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim()}>
            {isSubmitting 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
              : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DatacenterForm;
