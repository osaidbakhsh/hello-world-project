import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useProcurementRequest,
  useProcurementItems,
  useProcurementQuotations,
  useProcurementActivityLogs,
  useUpdateProcurementRequest,
  useAddActivityLog,
  useAddProcurementQuotation,
  useDeleteProcurementQuotation,
} from '@/hooks/useProcurement';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, ArrowLeft, ArrowRight, Upload, FileText, Download, Eye, Trash2, CheckCircle, XCircle, Clock, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ProcurementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: request, isLoading } = useProcurementRequest(id);
  const { data: items } = useProcurementItems(id);
  const { data: quotations } = useProcurementQuotations(id);
  const { data: activityLogs } = useProcurementActivityLogs(id);

  const updateRequest = useUpdateProcurementRequest();
  const addActivityLog = useAddActivityLog();
  const addQuotation = useAddProcurementQuotation();
  const deleteQuotation = useDeleteProcurementQuotation();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    vendor_name: '',
    quotation_ref: '',
    total: '',
    file: null as File | null,
  });

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const canApprove = isAdmin;
  const canEdit = request?.status === 'draft' && request?.created_by === profile?.id;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="w-3 h-3" /> },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
      under_review: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
      ordered: { color: 'bg-purple-100 text-purple-800', icon: <Package className="w-3 h-3" /> },
      received: { color: 'bg-teal-100 text-teal-800', icon: <CheckCircle className="w-3 h-3" /> },
      closed: { color: 'bg-gray-200 text-gray-700', icon: <CheckCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.draft;
    return <Badge className={`gap-1 ${c.color}`}>{c.icon}{t(`procurement.status.${status}`)}</Badge>;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!request) return;

    try {
      const updates: any = { id: request.id, status: newStatus };
      if (newStatus === 'approved') {
        updates.approved_by = profile?.id;
        updates.approved_at = new Date().toISOString();
      }
      if (newStatus === 'rejected') {
        updates.rejection_reason = rejectionReason;
      }

      await updateRequest.mutateAsync(updates);
      await addActivityLog.mutateAsync({
        request_id: request.id,
        actor_profile_id: profile?.id,
        action: newStatus,
        details: newStatus === 'rejected' ? { reason: rejectionReason } : undefined,
      });

      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadQuotation = async () => {
    if (!uploadForm.file || !uploadForm.vendor_name || !request) {
      toast({ title: t('common.error'), description: language === 'ar' ? 'أكمل البيانات المطلوبة' : 'Complete required fields', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = uploadForm.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${request.domain_id}/${request.id}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('procurement-quotations')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      await addQuotation.mutateAsync({
        request_id: request.id,
        vendor_name: uploadForm.vendor_name,
        quotation_ref: uploadForm.quotation_ref,
        total: uploadForm.total ? parseFloat(uploadForm.total) : undefined,
        currency: request.currency,
        file_path: filePath,
        original_filename: uploadForm.file.name,
        uploaded_by: profile?.id,
      });

      await addActivityLog.mutateAsync({
        request_id: request.id,
        actor_profile_id: profile?.id,
        action: 'uploaded_quotation',
        details: { vendor: uploadForm.vendor_name },
      });

      setUploadDialogOpen(false);
      setUploadForm({ vendor_name: '', quotation_ref: '', total: '', file: null });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadQuotation = async (filePath: string, filename: string) => {
    const { data, error } = await supabase.storage
      .from('procurement-quotations')
      .createSignedUrl(filePath, 60);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  const estimatedTotal = items?.reduce((sum, item) => sum + ((item.quantity || 1) * (item.estimated_unit_price || 0)), 0) || 0;
  const lowestQuotation = quotations?.reduce((min, q) => (q.total && (!min || q.total < min)) ? q.total : min, 0 as number);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{language === 'ar' ? 'الطلب غير موجود' : 'Request not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/procurement')}>
            <BackIcon className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono">{request.request_number}</h1>
                {getStatusBadge(request.status)}
              </div>
              <p className="text-muted-foreground">{request.title}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {request.status === 'draft' && canEdit && (
            <Button onClick={() => handleStatusChange('submitted')} className="gap-2">
              <Clock className="w-4 h-4" />
              {t('procurement.submit')}
            </Button>
          )}
          {request.status === 'submitted' && canApprove && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange('under_review')} className="gap-2">
                <Clock className="w-4 h-4" />
                {language === 'ar' ? 'بدء المراجعة' : 'Start Review'}
              </Button>
            </>
          )}
          {(request.status === 'submitted' || request.status === 'under_review') && canApprove && (
            <>
              <Button onClick={() => handleStatusChange('approved')} className="gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4" />
                {t('procurement.approve')}
              </Button>
              <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} className="gap-2">
                <XCircle className="w-4 h-4" />
                {t('procurement.reject')}
              </Button>
            </>
          )}
          {request.status === 'approved' && canApprove && (
            <Button onClick={() => handleStatusChange('ordered')} className="gap-2">
              <Package className="w-4 h-4" />
              {language === 'ar' ? 'تم الطلب' : 'Mark Ordered'}
            </Button>
          )}
          {request.status === 'ordered' && canApprove && (
            <Button onClick={() => handleStatusChange('received')} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {language === 'ar' ? 'تم الاستلام' : 'Mark Received'}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{language === 'ar' ? 'التفاصيل' : 'Details'}</TabsTrigger>
          <TabsTrigger value="quotations">{t('procurement.quotations')} ({quotations?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">{t('procurement.activity')}</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('common.domain')}</p>
                  <p className="font-medium">{request.domains?.name}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الأولوية' : 'Priority'}</p>
                  <Badge>{t(`procurement.priority.${request.priority}`)}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('procurement.neededBy')}</p>
                  <p className="font-medium">
                    {request.needed_by ? format(new Date(request.needed_by), 'PP', { locale: language === 'ar' ? ar : undefined }) : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {request.description && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'الوصف' : 'Description'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{request.description}</p>
              </CardContent>
            </Card>
          )}

          {request.rejection_reason && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">{t('procurement.rejectionReason')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{request.rejection_reason}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('procurement.items')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('procurement.itemName')}</TableHead>
                    <TableHead>{t('procurement.quantity')}</TableHead>
                    <TableHead>{t('procurement.unit')}</TableHead>
                    <TableHead>{t('procurement.specs')}</TableHead>
                    <TableHead>{t('procurement.estimatedPrice')}</TableHead>
                    <TableHead>{language === 'ar' ? 'المجموع' : 'Subtotal'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.specs || '-'}</TableCell>
                      <TableCell>{item.estimated_unit_price?.toLocaleString() || '-'}</TableCell>
                      <TableCell>
                        {item.estimated_unit_price ? ((item.quantity || 1) * item.estimated_unit_price).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4 p-4 bg-muted rounded-lg">
                <div className="text-end">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الإجمالي التقديري' : 'Estimated Total'}</p>
                  <p className="text-xl font-bold">{estimatedTotal.toLocaleString()} {request.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('procurement.quotations')}</h3>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              {t('procurement.uploadQuotation')}
            </Button>
          </div>

          {!quotations?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('procurement.noQuotations')}
              </CardContent>
            </Card>
          ) : (
            <>
              {lowestQuotation > 0 && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 dark:text-green-300">{t('procurement.lowestPrice')}</span>
                      <span className="text-xl font-bold text-green-700 dark:text-green-400">
                        {lowestQuotation.toLocaleString()} {request.currency}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {quotations.map(q => (
                  <Card key={q.id} className={cn(q.total === lowestQuotation && 'ring-2 ring-green-500')}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{q.vendor_name}</CardTitle>
                          {q.quotation_ref && <CardDescription>{q.quotation_ref}</CardDescription>}
                          {(q as any).profiles?.full_name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {t('procurement.uploadedBy')}: {(q as any).profiles.full_name}
                            </div>
                          )}
                        </div>
                        {q.total === lowestQuotation && (
                          <Badge className="bg-green-100 text-green-800">{t('procurement.lowestPrice')}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('procurement.total')}</span>
                        <span className="font-bold text-lg">{q.total?.toLocaleString() || '-'} {q.currency}</span>
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadQuotation(q.file_path, q.original_filename)} className="gap-2 flex-1">
                          <Eye className="w-4 h-4" />
                          {t('procurement.previewPdf')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteQuotation.mutate({ id: q.id, request_id: q.request_id, file_path: q.file_path })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>{t('procurement.activity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs?.map(log => (
                  <div key={log.id} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {log.profiles?.full_name || 'System'} - {log.action}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Quotation Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('procurement.uploadQuotation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('procurement.vendorName')} *</Label>
              <Input
                value={uploadForm.vendor_name}
                onChange={e => setUploadForm({ ...uploadForm, vendor_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('procurement.quotationRef')}</Label>
              <Input
                value={uploadForm.quotation_ref}
                onChange={e => setUploadForm({ ...uploadForm, quotation_ref: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('procurement.total')}</Label>
              <Input
                type="number"
                value={uploadForm.total}
                onChange={e => setUploadForm({ ...uploadForm, total: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>PDF *</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleUploadQuotation} disabled={isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {language === 'ar' ? 'رفع' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('procurement.reject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('procurement.confirmReject')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>{t('procurement.rejectionReason')}</Label>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange('rejected')} className="bg-destructive text-destructive-foreground">
              {t('procurement.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProcurementDetail;
