import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFileShares, useFileShareMutations, useTriggerScan } from '@/hooks/useFileShares';
import { useDomains } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Play, 
  Eye, 
  Edit, 
  ToggleLeft, 
  ToggleRight,
  HardDrive,
  Download
} from 'lucide-react';
import { formatBytes } from '@/types/fileshares';
import FileShareForm from '@/components/fileshares/FileShareForm';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const FileShares: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareTypeFilter, setShareTypeFilter] = useState<string>('all');
  const [scanModeFilter, setScanModeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<string | null>(null);

  const { data: domains } = useDomains();
  const { data: shares, isLoading, refetch } = useFileShares(
    selectedDomain === 'all' ? undefined : selectedDomain
  );
  const { toggleEnabled } = useFileShareMutations();
  const { triggerScan, isLoading: isScanLoading } = useTriggerScan();

  const dateLocale = language === 'ar' ? ar : enUS;

  // Filter shares
  const filteredShares = shares.filter(share => {
    if (searchQuery && !share.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (shareTypeFilter !== 'all' && share.share_type !== shareTypeFilter) {
      return false;
    }
    if (scanModeFilter !== 'all' && share.scan_mode !== scanModeFilter) {
      return false;
    }
    return true;
  });

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    const { error } = await toggleEnabled(id, !currentEnabled);
    if (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } else {
      toast({ title: t('common.success') });
      refetch();
    }
  };

  const handleRunScan = async (id: string) => {
    const { error } = await triggerScan(id);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('fileShares.scanQueued') });
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            {t('fileShares.title')}
          </h1>
          <p className="text-muted-foreground">{t('fileShares.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 me-2" />
            {t('fileShares.export')}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t('fileShares.add')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('dashboard.allDomains')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allDomains')}</SelectItem>
                {domains.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={shareTypeFilter} onValueChange={setShareTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('fileShares.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="SMB">{t('fileShares.type.smb')}</SelectItem>
                <SelectItem value="NFS">{t('fileShares.type.nfs')}</SelectItem>
                <SelectItem value="LOCAL">{t('fileShares.type.local')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scanModeFilter} onValueChange={setScanModeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('fileShares.scanMode')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="DIRECT">{t('fileShares.scanMode.direct')}</SelectItem>
                <SelectItem value="AGENT">{t('fileShares.scanMode.agent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredShares.length === 0 ? (
            <div className="p-12 text-center">
              <HardDrive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('fileShares.noShares')}</p>
              <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 me-2" />
                {t('fileShares.add')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.domain')}</TableHead>
                  <TableHead>{t('fileShares.name')}</TableHead>
                  <TableHead>{t('fileShares.type')}</TableHead>
                  <TableHead>{t('fileShares.scanMode')}</TableHead>
                  <TableHead>{t('fileShares.agent')}</TableHead>
                  <TableHead>{t('fileShares.lastScan')}</TableHead>
                  <TableHead>{t('fileShares.totalSize')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShares.map(share => (
                  <TableRow key={share.id}>
                    <TableCell>
                      <Badge variant="outline">{share.domain?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{share.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{share.share_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={share.scan_mode === 'AGENT' ? 'default' : 'outline'}>
                        {t(`fileShares.scanMode.${share.scan_mode.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {share.agent ? (
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${share.agent.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {share.agent.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {share.latest_snapshot ? (
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(share.latest_snapshot.created_at), { addSuffix: true, locale: dateLocale })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {share.latest_snapshot ? (
                        <span className="font-mono text-sm">
                          {formatBytes(share.latest_snapshot.total_bytes)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={share.is_enabled ? 'default' : 'secondary'}>
                        {share.is_enabled ? t('common.enabled') : t('common.disabled')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/file-shares/${share.id}`)}
                          title={t('common.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRunScan(share.id)}
                          disabled={!share.is_enabled || isScanLoading}
                          title={t('fileShares.runScan')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingShare(share.id)}
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleEnabled(share.id, share.is_enabled)}
                          title={share.is_enabled ? t('common.disable') : t('common.enable')}
                        >
                          {share.is_enabled ? (
                            <ToggleRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen || !!editingShare} onOpenChange={(open) => {
        if (!open) {
          setIsFormOpen(false);
          setEditingShare(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShare ? t('fileShares.edit') : t('fileShares.add')}
            </DialogTitle>
          </DialogHeader>
          <FileShareForm
            editId={editingShare}
            onSuccess={() => {
              setIsFormOpen(false);
              setEditingShare(null);
              refetch();
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingShare(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileShares;
