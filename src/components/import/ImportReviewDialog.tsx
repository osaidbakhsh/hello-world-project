import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportPreview {
  toCreate: number;
  toUpdate: number;
  unchanged: number;
  errors: ImportError[];
}

interface ImportReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ImportReviewDialog: React.FC<ImportReviewDialogProps> = ({
  open,
  onOpenChange,
  preview,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { t, dir } = useLanguage();

  const totalRecords = preview.toCreate + preview.toUpdate + preview.unchanged;
  const hasErrors = preview.errors.length > 0;
  const canImport = preview.toCreate > 0 || preview.toUpdate > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            {t('import.review')}
          </DialogTitle>
          <DialogDescription>
            {t('import.dryRun')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-success/10 border-success/20">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-success">{preview.toCreate}</p>
                <p className="text-xs text-muted-foreground">{t('import.newRecords')}</p>
              </CardContent>
            </Card>

            <Card className="bg-warning/10 border-warning/20">
              <CardContent className="p-4 text-center">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold text-warning">{preview.toUpdate}</p>
                <p className="text-xs text-muted-foreground">{t('import.toUpdate')}</p>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{preview.errors.length}</p>
                <p className="text-xs text-muted-foreground">{t('import.errors')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Total info */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{t('common.all')}: {totalRecords}</span>
            {preview.unchanged > 0 && (
              <>
                <span>•</span>
                <span>{t('common.noData')}: {preview.unchanged}</span>
              </>
            )}
          </div>

          {/* Error Details */}
          {hasErrors && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="w-4 h-4" />
                {t('import.errors')} ({preview.errors.length})
              </div>
              <ScrollArea className="h-32 rounded-lg border bg-destructive/5 p-3">
                <div className="space-y-2">
                  {preview.errors.map((error, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Badge variant="destructive" className="text-xs shrink-0">
                        {t('common.row')} {error.row}
                      </Badge>
                      <span className="text-destructive">{error.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Warning if no records to import */}
          {!canImport && !hasErrors && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span>{t('common.noData')}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={!canImport || isLoading}
            className="gap-2"
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {t('import.confirmImport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportReviewDialog;
