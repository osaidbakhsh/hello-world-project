import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDomains } from '@/hooks/useSupabaseData';
import { useCreateProcurementRequest, useGenerateRequestNumber, useAddProcurementItem, useAddActivityLog } from '@/hooks/useProcurement';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShoppingCart, ArrowLeft, ArrowRight, Plus, Trash2, CalendarIcon, Save, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ItemRow {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  specs: string;
  estimated_unit_price: number;
}

const ProcurementCreate: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: domains } = useDomains();

  const createRequest = useCreateProcurementRequest();
  const generateNumber = useGenerateRequestNumber();
  const addItem = useAddProcurementItem();
  const addActivityLog = useAddActivityLog();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    domain_id: '',
    title: '',
    description: '',
    priority: 'medium',
    currency: 'SAR',
    needed_by: null as Date | null,
  });

  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), item_name: '', quantity: 1, unit: 'pcs', specs: '', estimated_unit_price: 0 }
  ]);

  const addNewItem = () => {
    setItems([...items, { id: crypto.randomUUID(), item_name: '', quantity: 1, unit: 'pcs', specs: '', estimated_unit_price: 0 }]);
  };

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.estimated_unit_price), 0);
  };

  const validateStep1 = () => {
    if (!formData.domain_id) {
      toast({ title: t('common.error'), description: language === 'ar' ? 'اختر النطاق' : 'Select a domain', variant: 'destructive' });
      return false;
    }
    if (!formData.title.trim()) {
      toast({ title: t('common.error'), description: language === 'ar' ? 'أدخل عنوان الطلب' : 'Enter request title', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const validItems = items.filter(i => i.item_name.trim());
    if (validItems.length === 0) {
      toast({ title: t('common.error'), description: language === 'ar' ? 'أضف عنصر واحد على الأقل' : 'Add at least one item', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSave = async (submitAfterSave: boolean) => {
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);
    try {
      // Generate request number
      const requestNumber = await generateNumber.mutateAsync(formData.domain_id);

      // Create request
      const request = await createRequest.mutateAsync({
        domain_id: formData.domain_id,
        request_number: requestNumber,
        title: formData.title,
        description: formData.description,
        priority: formData.priority as any,
        currency: formData.currency,
        needed_by: formData.needed_by?.toISOString().split('T')[0],
        status: submitAfterSave ? 'submitted' : 'draft',
        created_by: profile?.id,
      });

      // Add items
      const validItems = items.filter(i => i.item_name.trim());
      for (const item of validItems) {
        await addItem.mutateAsync({
          request_id: request.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          specs: item.specs,
          estimated_unit_price: item.estimated_unit_price || undefined,
        });
      }

      // Add activity log
      await addActivityLog.mutateAsync({
        request_id: request.id,
        actor_profile_id: profile?.id,
        action: submitAfterSave ? 'submitted' : 'created',
        details: { title: formData.title, items_count: validItems.length },
      });

      navigate(`/procurement/${request.id}`);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;
  const NextIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/procurement')}>
          <BackIcon className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('procurement.newRequest')}</h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? `الخطوة ${step} من 2` : `Step ${step} of 2`}
            </p>
          </div>
        </div>
      </div>

      {/* Steps Progress */}
      <div className="flex gap-2">
        {[1, 2].map(s => (
          <div
            key={s}
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'معلومات الطلب' : 'Request Information'}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'أدخل المعلومات الأساسية للطلب' : 'Enter the basic request information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.domain')} *</Label>
                <Select value={formData.domain_id} onValueChange={v => setFormData({ ...formData, domain_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر النطاق' : 'Select domain'} />
                  </SelectTrigger>
                  <SelectContent>
                    {domains?.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('procurement.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('procurement.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('procurement.priority.high')}</SelectItem>
                    <SelectItem value="urgent">{t('procurement.priority.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'عنوان الطلب' : 'Request Title'} *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: شراء أجهزة كمبيوتر' : 'e.g., Purchase computers'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ar' ? 'وصف تفصيلي للطلب...' : 'Detailed description...'}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('procurement.neededBy')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left', !formData.needed_by && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.needed_by ? format(formData.needed_by, 'PPP', { locale: language === 'ar' ? ar : undefined }) : (language === 'ar' ? 'اختر التاريخ' : 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.needed_by || undefined}
                      onSelect={date => setFormData({ ...formData, needed_by: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => validateStep1() && setStep(2)} className="gap-2">
                {language === 'ar' ? 'التالي' : 'Next'}
                <NextIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('procurement.items')}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'أضف العناصر المطلوبة للشراء' : 'Add items to purchase'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('procurement.itemName')}</TableHead>
                  <TableHead className="w-24">{t('procurement.quantity')}</TableHead>
                  <TableHead className="w-24">{t('procurement.unit')}</TableHead>
                  <TableHead>{t('procurement.specs')}</TableHead>
                  <TableHead className="w-32">{t('procurement.estimatedPrice')}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.item_name}
                        onChange={e => updateItem(item.id, 'item_name', e.target.value)}
                        placeholder={language === 'ar' ? 'اسم العنصر' : 'Item name'}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={item.unit} onValueChange={v => updateItem(item.id, 'unit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">{language === 'ar' ? 'قطعة' : 'Piece'}</SelectItem>
                          <SelectItem value="set">{language === 'ar' ? 'طقم' : 'Set'}</SelectItem>
                          <SelectItem value="license">{language === 'ar' ? 'ترخيص' : 'License'}</SelectItem>
                          <SelectItem value="month">{language === 'ar' ? 'شهر' : 'Month'}</SelectItem>
                          <SelectItem value="year">{language === 'ar' ? 'سنة' : 'Year'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.specs}
                        onChange={e => updateItem(item.id, 'specs', e.target.value)}
                        placeholder={language === 'ar' ? 'المواصفات' : 'Specifications'}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.estimated_unit_price || ''}
                        onChange={e => updateItem(item.id, 'estimated_unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button variant="outline" onClick={addNewItem} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('procurement.addItem')}
            </Button>

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">{language === 'ar' ? 'الإجمالي التقديري' : 'Estimated Total'}</span>
              <span className="text-xl font-bold">
                {calculateTotal().toLocaleString()} {formData.currency}
              </span>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <BackIcon className="w-4 h-4" />
                {language === 'ar' ? 'السابق' : 'Previous'}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('procurement.saveDraft')}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('procurement.submit')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcurementCreate;
