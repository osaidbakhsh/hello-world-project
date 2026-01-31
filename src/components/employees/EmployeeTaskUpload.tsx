import React, { useState, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useServers } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { downloadTaskTemplate } from '@/utils/excelTemplates';

interface ParsedTask {
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
  frequency: string;
  tags?: string[];
  linkedServerName?: string;
  evidenceRequired?: boolean;
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  action: 'create' | 'update' | 'skip';
  existingTaskId?: string;
}

interface ImportBatch {
  id: string;
  entity_type: string;
  employee_id: string;
  created_count: number;
  updated_count: number;
  failed_count: number;
  import_data: { created: string[]; updated: string[] };
  created_at: string;
}

interface EmployeeTaskUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EmployeeTaskUpload: React.FC<EmployeeTaskUploadProps> = ({ open, onOpenChange, onSuccess }) => {
  const { t, dir, language } = useLanguage();
  const { profile } = useAuth();
  const { data: profiles } = useProfiles();
  const { data: servers } = useServers();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importResults, setImportResults] = useState<{ created: number; updated: number; failed: number } | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSelectedEmployee('');
    setParsedTasks([]);
    setIsImporting(false);
    setImportComplete(false);
    setImportResults(null);
    setBatchId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const validateDate = (dateStr: string): boolean => {
    if (!dateStr) return true;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const normalizeStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'draft': 'draft',
      'assigned': 'assigned',
      'in progress': 'in_progress',
      'in_progress': 'in_progress',
      'قيد التنفيذ': 'in_progress',
      'in review': 'in_review',
      'in_review': 'in_review',
      'في المراجعة': 'in_review',
      'done': 'done',
      'مكتملة': 'done',
      'blocked': 'blocked',
      'معلقة': 'blocked',
      'مسودة': 'draft',
      'تم الإسناد': 'assigned',
    };
    return statusMap[status.toLowerCase().trim()] || 'draft';
  };

  const normalizePriority = (priority: string): string => {
    const priorityMap: Record<string, string> = {
      'low': 'low',
      'منخفضة': 'low',
      'medium': 'medium',
      'متوسطة': 'medium',
      'high': 'high',
      'عالية': 'high',
      'critical': 'critical',
      'حرجة': 'critical',
    };
    return priorityMap[priority.toLowerCase().trim()] || 'medium';
  };

  const normalizeFrequency = (frequency: string): string => {
    const frequencyMap: Record<string, string> = {
      'none': 'once',
      'once': 'once',
      'مرة واحدة': 'once',
      'daily': 'daily',
      'يومي': 'daily',
      'weekly': 'weekly',
      'أسبوعي': 'weekly',
      'monthly': 'monthly',
      'شهري': 'monthly',
    };
    return frequencyMap[frequency.toLowerCase().trim()] || 'once';
  };

  const parseExcelFile = async (file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast({ title: t('common.error'), description: t('import.emptyFile'), variant: 'destructive' });
          return;
        }

        // Find header row (skip empty rows)
        let headerRowIndex = 0;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length > 0 && row.some(cell => cell)) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = jsonData[headerRowIndex].map((h: any) => String(h || '').toLowerCase().trim());
        
        // Get existing tasks for this employee to detect duplicates
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('id, title, due_date')
          .eq('assigned_to', selectedEmployee);

        const parsed: ParsedTask[] = [];
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || !row.some(cell => cell)) continue;

          const getCell = (key: string) => {
            const index = headers.findIndex((h: string) => 
              h.includes(key) || h === key
            );
            return index >= 0 ? String(row[index] || '').trim() : '';
          };

          const title = getCell('title') || getCell('tasktitle') || getCell('عنوان');
          const description = getCell('description') || getCell('الوصف');
          const dueDate = getCell('due') || getCell('duedate') || getCell('تاريخ');
          const priority = getCell('priority') || getCell('الأولوية');
          const status = getCell('status') || getCell('الحالة');
          const frequency = getCell('recurrence') || getCell('frequency') || getCell('التكرار');
          const tags = getCell('tags') || getCell('العلامات');
          const linkedServer = getCell('server') || getCell('linkedservername') || getCell('السيرفر');
          const evidenceRequired = getCell('evidence') || getCell('evidencerequired') || getCell('الدليل');

          const errors: string[] = [];
          
          if (!title) {
            errors.push(t('import.titleRequired'));
          }

          if (dueDate && !validateDate(dueDate)) {
            errors.push(t('import.invalidDateFormat'));
          }

          // Check for duplicates
          const duplicate = existingTasks?.find(
            t => t.title === title && t.due_date === (dueDate || null)
          );

          const parsedTask: ParsedTask = {
            title,
            description,
            due_date: dueDate || undefined,
            priority: normalizePriority(priority || 'medium'),
            status: normalizeStatus(status || 'draft'),
            frequency: normalizeFrequency(frequency || 'once'),
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
            linkedServerName: linkedServer,
            evidenceRequired: ['yes', 'نعم', 'true', '1'].includes(evidenceRequired.toLowerCase()),
            rowIndex: i + 1,
            isValid: errors.length === 0 && !!title,
            errors,
            action: duplicate ? 'update' : 'create',
            existingTaskId: duplicate?.id,
          };

          parsed.push(parsedTask);
        }

        setParsedTasks(parsed);
        
      } catch (error) {
        console.error('Parse error:', error);
        toast({ title: t('common.error'), description: t('import.parseError'), variant: 'destructive' });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedEmployee) {
      toast({ title: t('common.error'), description: t('import.selectEmployeeFirst'), variant: 'destructive' });
      e.target.value = '';
      return;
    }

    parseExcelFile(file);
  };

  const handleImport = async () => {
    if (!selectedEmployee || parsedTasks.length === 0) return;

    setIsImporting(true);
    const validTasks = parsedTasks.filter(t => t.isValid);
    const createdIds: string[] = [];
    const updatedIds: string[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    try {
      for (const task of validTasks) {
        // Find linked server by name
        const linkedServer = task.linkedServerName 
          ? servers.find(s => s.name.toLowerCase() === task.linkedServerName?.toLowerCase())
          : undefined;

        const taskData = {
          title: task.title,
          description: task.description || null,
          due_date: task.due_date || null,
          priority: task.priority,
          task_status: task.status,
          status: task.status === 'done' ? 'completed' : 'pending',
          frequency: task.frequency,
          assigned_to: selectedEmployee,
          created_by: profile?.id,
          linked_server_id: linkedServer?.id || null,
        };

        if (task.action === 'update' && task.existingTaskId) {
          const { error } = await supabase
            .from('tasks')
            .update(taskData)
            .eq('id', task.existingTaskId);
          
          if (error) {
            failed++;
          } else {
            updated++;
            updatedIds.push(task.existingTaskId);
          }
        } else {
          const { data, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select('id')
            .single();
          
          if (error) {
            failed++;
          } else {
            created++;
            if (data?.id) createdIds.push(data.id);
          }
        }
      }

      // Create import batch record
      const { data: batch } = await supabase
        .from('import_batches')
        .insert({
          imported_by: profile?.id,
          entity_type: 'tasks',
          employee_id: selectedEmployee,
          created_count: created,
          updated_count: updated,
          failed_count: failed,
          import_data: { created: createdIds, updated: updatedIds },
        })
        .select('id')
        .single();

      if (batch) setBatchId(batch.id);

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'create',
        table_name: 'tasks',
        entity_name: `Import batch: ${created} created, ${updated} updated`,
        new_data: { batch_id: batch?.id, employee_id: selectedEmployee, created, updated, failed },
      });

      setImportResults({ created, updated, failed });
      setImportComplete(true);
      
      toast({
        title: t('common.success'),
        description: `${t('import.success')}: ${created} ${t('import.created')}, ${updated} ${t('import.updated')}`,
      });

      onSuccess?.();
      
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: t('common.error'), description: t('import.importError'), variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRollback = async () => {
    if (!batchId) return;

    const confirm = window.confirm(t('import.confirmRollback'));
    if (!confirm) return;

    setIsImporting(true);

    try {
      const { data: batch } = await supabase
        .from('import_batches')
        .select('import_data')
        .eq('id', batchId)
        .single();

      if (batch?.import_data) {
        const importData = batch.import_data as { created: string[]; updated: string[] };
        
        // Delete created tasks
        if (importData.created && importData.created.length > 0) {
          await supabase.from('tasks').delete().in('id', importData.created);
        }

        // Log rollback
        await supabase.from('audit_logs').insert({
          user_id: profile?.id,
          user_name: profile?.full_name,
          user_email: profile?.email,
          action: 'delete',
          table_name: 'tasks',
          entity_name: `Rollback import batch: ${batchId}`,
        });
      }

      await supabase.from('import_batches').delete().eq('id', batchId);

      toast({ title: t('common.success'), description: t('import.rollbackSuccess') });
      handleClose();
      onSuccess?.();
      
    } catch (error) {
      toast({ title: t('common.error'), description: t('import.rollbackError'), variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const summary = {
    total: parsedTasks.length,
    valid: parsedTasks.filter(t => t.isValid).length,
    toCreate: parsedTasks.filter(t => t.isValid && t.action === 'create').length,
    toUpdate: parsedTasks.filter(t => t.isValid && t.action === 'update').length,
    errors: parsedTasks.filter(t => !t.isValid).length,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {t('import.uploadEmployeeTasks')}
          </DialogTitle>
          <DialogDescription>
            {t('import.uploadDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Employee */}
          <div className="space-y-2">
            <Label>{t('import.selectEmployee')} *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={parsedTasks.length > 0}>
              <SelectTrigger>
                <SelectValue placeholder={t('import.selectEmployee')} />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} - {p.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Download Template */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTaskTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              {t('import.downloadTemplate')}
            </Button>
          </div>

          {/* Step 2: Upload File */}
          {selectedEmployee && !importComplete && (
            <Card className={cn(
              "border-2 border-dashed transition-colors",
              parsedTasks.length > 0 ? "border-primary" : "border-muted"
            )}>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('import.dragDrop')}</p>
                    <p className="text-sm text-muted-foreground">{t('import.supportedFormats')}</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    {t('import.chooseFile')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview */}
          {parsedTasks.length > 0 && !importComplete && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('import.previewTitle')}</CardTitle>
                <CardDescription>
                  <div className="flex gap-4 mt-2">
                    <Badge variant="outline" className="bg-success/10 text-success">
                      <CheckCircle className="w-3 h-3 me-1" />
                      {summary.toCreate} {t('import.toCreate')}
                    </Badge>
                    <Badge variant="outline" className="bg-warning/10 text-warning">
                      {summary.toUpdate} {t('import.toUpdate')}
                    </Badge>
                    {summary.errors > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive">
                        <AlertTriangle className="w-3 h-3 me-1" />
                        {summary.errors} {t('import.errors')}
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>{t('tasks.name')}</TableHead>
                        <TableHead>{t('tasks.status')}</TableHead>
                        <TableHead>{t('tasks.priority')}</TableHead>
                        <TableHead>{t('import.action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedTasks.slice(0, 20).map((task, idx) => (
                        <TableRow 
                          key={idx} 
                          className={cn(
                            !task.isValid && "bg-destructive/5",
                            task.action === 'update' && "bg-warning/5"
                          )}
                        >
                          <TableCell className="text-muted-foreground">{task.rowIndex}</TableCell>
                          <TableCell>
                            {task.title}
                            {!task.isValid && (
                              <p className="text-xs text-destructive mt-1">
                                {task.errors.join(', ')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{task.status}</Badge>
                          </TableCell>
                          <TableCell>{task.priority}</TableCell>
                          <TableCell>
                            {task.isValid ? (
                              <Badge className={task.action === 'create' ? 'bg-success' : 'bg-warning'}>
                                {task.action === 'create' ? t('import.new') : t('import.update')}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">{t('import.skip')}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                    {parsedTasks.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      {language === 'ar' ? `و ${parsedTasks.length - 20} سجل آخر...` : `and ${parsedTasks.length - 20} more records...`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Complete */}
          {importComplete && importResults && (
            <Card className="border-success">
              <CardContent className="py-8 text-center space-y-4">
                <CheckCircle className="w-16 h-16 mx-auto text-success" />
                <div>
                  <h3 className="text-lg font-semibold">{t('import.complete')}</h3>
                  <div className="flex justify-center gap-4 mt-4">
                    <div>
                      <p className="text-2xl font-bold text-success">{importResults.created}</p>
                      <p className="text-sm text-muted-foreground">{t('import.created')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning">{importResults.updated}</p>
                      <p className="text-sm text-muted-foreground">{t('import.updated')}</p>
                    </div>
                    {importResults.failed > 0 && (
                      <div>
                        <p className="text-2xl font-bold text-destructive">{importResults.failed}</p>
                        <p className="text-sm text-muted-foreground">{t('import.failed')}</p>
                      </div>
                    )}
                  </div>
                </div>
                {batchId && (
                  <Button variant="outline" onClick={handleRollback} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    {t('import.rollback')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {importComplete ? t('common.close') : t('common.cancel')}
            </Button>
            {!importComplete && parsedTasks.length > 0 && (
              <Button onClick={handleImport} disabled={isImporting || summary.valid === 0}>
                {isImporting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t('import.confirm')} ({summary.valid})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeTaskUpload;
