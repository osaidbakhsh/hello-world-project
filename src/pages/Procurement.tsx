import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDomains } from '@/hooks/useSupabaseData';
import { useProcurementRequests, useDeleteProcurementRequest } from '@/hooks/useProcurement';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ShoppingCart, Plus, Search, Eye, Trash2, FileText, Clock, CheckCircle, XCircle, Package, Loader2, Database, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const Procurement: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { isAdmin, isSuperAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: domains } = useDomains();
  
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);

  const { data: requests, isLoading } = useProcurementRequests(
    selectedDomainId === 'all' ? undefined : selectedDomainId,
    statusFilter
  );
  const deleteRequest = useDeleteProcurementRequest();

  // Fetch employees for filter (admin only)
  const { data: employees } = useQuery({
    queryKey: ['employees_for_filter'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data;
    },
    enabled: isAdmin,
  });

  // Apply filters
  const filteredRequests = useMemo(() => {
    return requests?.filter(r => 
      (!searchQuery || 
        r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (employeeFilter === 'all' || r.created_by === employeeFilter)
    );
  }, [requests, searchQuery, employeeFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: requests?.length || 0,
    draft: requests?.filter(r => r.status === 'draft').length || 0,
    pending: requests?.filter(r => ['submitted', 'under_review'].includes(r.status)).length || 0,
    approved: requests?.filter(r => r.status === 'approved').length || 0,
    rejected: requests?.filter(r => r.status === 'rejected').length || 0,
  }), [requests]);

  // Generate sample data (super_admin only)
  const generateSampleData = async () => {
    if (!selectedDomainId || selectedDomainId === 'all') {
      toast({ 
        title: t('common.error'), 
        description: t('procurement.selectDomainFirst'), 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsGeneratingSample(true);
    try {
      // Generate request number
      const { data: requestNumber, error: rpcError } = await supabase.rpc('generate_procurement_request_number', { 
        p_domain_id: selectedDomainId 
      });
      
      if (rpcError) throw rpcError;
      
      // Create sample request
      const { data: request, error: requestError } = await supabase
        .from('procurement_requests')
        .insert({
          domain_id: selectedDomainId,
          request_number: requestNumber,
          title: language === 'ar' ? 'طلب تجريبي - أجهزة حاسوب' : 'Sample Request - Computer Equipment',
          description: language === 'ar' ? 'طلب تجريبي لأغراض الاختبار' : 'Sample request for testing purposes',
          status: 'draft',
          priority: 'medium',
          currency: 'SAR',
          created_by: profile?.id,
        })
        .select()
        .single();
      
      if (requestError) throw requestError;
      
      // Add sample items
      await supabase.from('procurement_request_items').insert([
        { request_id: request.id, item_name: 'Laptop Dell XPS 15', quantity: 5, unit: 'pcs', estimated_unit_price: 5500 },
        { request_id: request.id, item_name: 'Monitor 27"', quantity: 10, unit: 'pcs', estimated_unit_price: 1200 },
        { request_id: request.id, item_name: 'USB-C Dock', quantity: 5, unit: 'pcs', estimated_unit_price: 350 },
      ]);
      
      // Add activity log
      await supabase.from('procurement_activity_logs').insert({
        request_id: request.id,
        actor_profile_id: profile?.id,
        action: 'created',
        details: { source: 'sample_generator' },
      });
      
      toast({ 
        title: t('common.success'), 
        description: t('procurement.sampleDataCreated')
      });
      queryClient.invalidateQueries({ queryKey: ['procurement_requests'] });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingSample(false);
      setSampleDialogOpen(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!filteredRequests?.length) return;
    
    const data = filteredRequests.map(r => ({
      [language === 'ar' ? 'رقم الطلب' : 'Request Number']: r.request_number,
      [language === 'ar' ? 'العنوان' : 'Title']: r.title,
      [language === 'ar' ? 'النطاق' : 'Domain']: r.domains?.name,
      [language === 'ar' ? 'الحالة' : 'Status']: r.status,
      [language === 'ar' ? 'الأولوية' : 'Priority']: r.priority,
      [language === 'ar' ? 'المنشئ' : 'Created By']: r.profiles?.full_name,
      [language === 'ar' ? 'مطلوب بتاريخ' : 'Needed By']: r.needed_by || '',
      [language === 'ar' ? 'تاريخ الإنشاء' : 'Created At']: format(new Date(r.created_at), 'yyyy-MM-dd'),
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, language === 'ar' ? 'طلبات المشتريات' : 'Procurement Requests');
    XLSX.writeFile(wb, `procurement-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: <FileText className="w-3 h-3" /> },
      submitted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: <Clock className="w-3 h-3" /> },
      under_review: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
      ordered: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: <Package className="w-3 h-3" /> },
      received: { color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400', icon: <CheckCircle className="w-3 h-3" /> },
      closed: { color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: <CheckCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.draft;
    return (
      <Badge className={`gap-1 ${c.color}`}>
        {c.icon}
        {t(`procurement.status.${status}`)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return <Badge className={colors[priority] || colors.medium}>{t(`procurement.priority.${priority}`)}</Badge>;
  };

  const handleDelete = async () => {
    if (requestToDelete) {
      await deleteRequest.mutateAsync(requestToDelete);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('procurement.title')}</h1>
            <p className="text-muted-foreground">{t('procurement.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <Button variant="outline" onClick={() => setSampleDialogOpen(true)} className="gap-2">
              <Database className="w-4 h-4" />
              {t('procurement.generateSample')}
            </Button>
          )}
          <Button variant="outline" onClick={exportToExcel} disabled={!filteredRequests?.length} className="gap-2">
            <FileDown className="w-4 h-4" />
            {t('procurement.exportExcel')}
          </Button>
          <Button onClick={() => navigate('/procurement/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('procurement.newRequest')}
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('procurement.totalRequests')}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('procurement.status.draft')}</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('procurement.pendingReview')}</p>
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('procurement.status.approved')}</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('procurement.status.rejected')}</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('common.allDomains')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allDomains')}</SelectItem>
                {domains?.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdmin && employees && (
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={t('procurement.allEmployees')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('procurement.allEmployees')}</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث برقم الطلب أو العنوان...' : 'Search by request number or title...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">{language === 'ar' ? 'الكل' : 'All'}</TabsTrigger>
              <TabsTrigger value="draft">{t('procurement.status.draft')}</TabsTrigger>
              <TabsTrigger value="submitted">{t('procurement.status.submitted')}</TabsTrigger>
              <TabsTrigger value="under_review">{t('procurement.status.under_review')}</TabsTrigger>
              <TabsTrigger value="approved">{t('procurement.status.approved')}</TabsTrigger>
              <TabsTrigger value="rejected">{t('procurement.status.rejected')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('procurement.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !filteredRequests?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'ar' ? 'لا توجد طلبات مشتريات' : 'No procurement requests'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('procurement.requestNumber')}</TableHead>
                  <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                  <TableHead>{t('common.domain')}</TableHead>
                  <TableHead>{t('procurement.createdBy')}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                  <TableHead>{t('procurement.neededBy')}</TableHead>
                  <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(request => (
                  <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/procurement/${request.id}`)}>
                    <TableCell className="font-mono font-medium">{request.request_number}</TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{request.domains?.name || '-'}</TableCell>
                    <TableCell>{request.profiles?.full_name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>
                      {request.needed_by ? format(new Date(request.needed_by), 'PP', { locale: language === 'ar' ? ar : undefined }) : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), 'PP', { locale: language === 'ar' ? ar : undefined })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/procurement/${request.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(request.status === 'draft' || isAdmin) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              setRequestToDelete(request.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'حذف الطلب' : 'Delete Request'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this request? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sample Data Confirmation Dialog */}
      <AlertDialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('procurement.generateSample')}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'سيتم إنشاء طلب مشتريات تجريبي مع عناصر وهمية. هذا للاختبار فقط.'
                : 'A sample procurement request with dummy items will be created. This is for testing only.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={generateSampleData} disabled={isGeneratingSample}>
              {isGeneratingSample ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Database className="w-4 h-4 me-2" />
              )}
              {language === 'ar' ? 'إنشاء' : 'Generate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Procurement;