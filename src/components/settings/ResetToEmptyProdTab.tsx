import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Loader2, CheckCircle, XCircle, Eye, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ResetResult {
  success: boolean;
  dry_run: boolean;
  timestamp: string;
  preserved: {
    owner_user_id: string;
    owner_profile_id: string;
    owner_email: string;
  };
  would_delete?: Record<string, number>;
  deleted?: Record<string, number>;
  skipped_missing?: string[];
  warnings?: string[];
  errors?: string[];
}

const CONFIRM_PHRASE = 'DELETE ALL DATA';

const ResetToEmptyProdTab: React.FC = () => {
  const { dir } = useLanguage();
  const { toast } = useToast();
  const { user, profile, isSuperAdmin } = useAuth();
  
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [isRunningReset, setIsRunningReset] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isOwner = profile?.email === 'osaidbakhsh@gmail.com';
  const canExecute = isSuperAdmin && isOwner;
  const phraseMatches = confirmPhrase === CONFIRM_PHRASE;

  const callResetFunction = async (dryRun: boolean) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await supabase.functions.invoke('admin-reset-to-empty-prod', {
      body: {
        type: 'RESET_EMPTY_PROD',
        confirm_token: 'CONFIRM_DELETE_ALL_DATA_EXCEPT_OWNER',
        confirm_phrase: CONFIRM_PHRASE,
        dry_run: dryRun,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Reset failed');
    }

    return response.data;
  };

  const handleDryRun = async () => {
    setIsRunningDryRun(true);
    setResult(null);
    
    try {
      const data = await callResetFunction(true);
      setResult(data.result);
      toast({
        title: 'معاينة مكتملة',
        description: 'تم عرض ما سيتم حذفه دون تنفيذ فعلي',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunningDryRun(false);
    }
  };

  const handleReset = async () => {
    setIsRunningReset(true);
    setResult(null);
    setShowConfirmDialog(false);
    
    try {
      const data = await callResetFunction(false);
      setResult(data.result);
      setConfirmPhrase('');
      toast({
        title: 'تم إعادة الضبط',
        description: 'تم حذف جميع البيانات مع الحفاظ على حساب المالك',
      });
    } catch (error: any) {
      toast({
        title: 'فشل إعادة الضبط',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunningReset(false);
    }
  };

  const renderCounts = (counts: Record<string, number> | undefined, title: string) => {
    if (!counts) return null;
    const entries = Object.entries(counts).filter(([, count]) => count > 0);
    if (entries.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <ScrollArea className="h-48 border rounded-lg p-3">
          <div className="space-y-1">
            {entries.map(([table, count]) => (
              <div key={table} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono">{table}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  if (!canExecute) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2 text-destructive", dir === 'rtl' && 'flex-row-reverse justify-end')}>
            <Shield className="w-5 h-5" />
            إعادة الضبط للإنتاج الفارغ
          </CardTitle>
          <CardDescription className={dir === 'rtl' ? 'text-right' : 'text-left'}>
            هذه الميزة متاحة فقط لمالك النظام (Super Admin)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className={cn("flex gap-2 items-center", dir === 'rtl' && 'flex-row-reverse')}>
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm text-destructive">
                غير مصرح لك بتنفيذ هذه العملية
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2 text-destructive", dir === 'rtl' && 'flex-row-reverse justify-end')}>
          <Trash2 className="w-5 h-5" />
          إعادة الضبط للإنتاج الفارغ
        </CardTitle>
        <CardDescription className={dir === 'rtl' ? 'text-right' : 'text-left'}>
          حذف جميع بيانات النظام مع الحفاظ على حساب المالك فقط
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Banner */}
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className={cn("flex gap-3 items-start", dir === 'rtl' && 'flex-row-reverse')}>
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className={cn("space-y-2", dir === 'rtl' ? 'text-right' : 'text-left')}>
              <p className="font-semibold text-destructive">تحذير: عملية لا رجعة فيها!</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>سيتم حذف جميع المواقع والنطاقات والموارد</li>
                <li>سيتم حذف جميع المهام والموافقات والسجلات</li>
                <li>سيتم حذف جميع المستخدمين ما عدا حسابك</li>
                <li>لن تتمكن من استعادة البيانات المحذوفة</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className={cn("flex gap-3 items-center", dir === 'rtl' && 'flex-row-reverse')}>
            <CheckCircle className="w-5 h-5 text-primary" />
            <div className={cn(dir === 'rtl' ? 'text-right' : 'text-left')}>
              <p className="font-medium">الحساب المحفوظ</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-4">
          {/* Dry Run Button */}
          <div className="space-y-2">
            <Label>الخطوة 1: معاينة ما سيتم حذفه</Label>
            <Button
              variant="outline"
              onClick={handleDryRun}
              disabled={isRunningDryRun || isRunningReset}
              className="w-full"
            >
              {isRunningDryRun ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Eye className="w-4 h-4 me-2" />
              )}
              معاينة (Dry Run)
            </Button>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label>الخطوة 2: اكتب عبارة التأكيد</Label>
            <Input
              placeholder={CONFIRM_PHRASE}
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className={cn(
                "font-mono",
                phraseMatches && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <p className="text-xs text-muted-foreground">
              اكتب <code className="bg-muted px-1 rounded">{CONFIRM_PHRASE}</code> للتأكيد
            </p>
          </div>

          {/* Reset Button */}
          <div className="space-y-2">
            <Label>الخطوة 3: تنفيذ إعادة الضبط</Label>
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={!phraseMatches || isRunningReset || isRunningDryRun}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  إعادة الضبط للإنتاج الفارغ
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className={cn("flex items-center gap-2 text-destructive", dir === 'rtl' && 'flex-row-reverse')}>
                    <AlertTriangle className="w-5 h-5" />
                    تأكيد نهائي
                  </AlertDialogTitle>
                  <AlertDialogDescription className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    أنت على وشك حذف جميع بيانات النظام بشكل نهائي. هل أنت متأكد تماماً؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={dir === 'rtl' ? 'flex-row-reverse' : ''}>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRunningReset ? (
                      <Loader2 className="w-4 h-4 animate-spin me-2" />
                    ) : null}
                    نعم، احذف كل شيء
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className={cn("flex items-center gap-2", dir === 'rtl' && 'flex-row-reverse')}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <span className="font-medium">
                  {result.dry_run ? 'نتيجة المعاينة' : 'نتيجة إعادة الضبط'}
                </span>
                <Badge variant={result.dry_run ? 'secondary' : 'destructive'}>
                  {result.dry_run ? 'معاينة فقط' : 'تم التنفيذ'}
                </Badge>
              </div>

              {/* Preserved Account */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-primary">
                  ✓ تم الحفاظ على: {result.preserved.owner_email}
                </p>
              </div>

              {/* Counts */}
              {renderCounts(result.would_delete, 'سيتم حذفها (معاينة)')}
              {renderCounts(result.deleted, 'تم حذفها')}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="font-medium text-warning text-sm mb-1">تحذيرات:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive text-sm mb-1">أخطاء:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                التوقيت: {new Date(result.timestamp).toLocaleString('ar-SA')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ResetToEmptyProdTab;
