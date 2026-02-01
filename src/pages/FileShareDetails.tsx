import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFileShare, useFileShareScans, useFileShareSnapshots, useTriggerScan } from '@/hooks/useFileShares';
import { useFolderStats } from '@/hooks/useFolderStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Play, 
  Edit, 
  HardDrive, 
  FileText, 
  Folder,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { formatBytes } from '@/types/fileshares';
import FolderTree from '@/components/fileshares/FolderTree';
import TopFoldersChart from '@/components/fileshares/TopFoldersChart';
import ScanHistory from '@/components/fileshares/ScanHistory';
import { formatDistanceToNow, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const FileShareDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language, dir } = useLanguage();
  const dateLocale = language === 'ar' ? ar : enUS;

  const { data: share, isLoading, refetch } = useFileShare(id || '');
  const { data: scans, refetch: refetchScans } = useFileShareScans(id || '');
  const { data: snapshots } = useFileShareSnapshots(id || '');
  const { triggerScan, isLoading: isScanLoading } = useTriggerScan();
  const { 
    rootFolders, 
    expandedFolders, 
    isLoading: isFolderLoading, 
    fetchRootFolders, 
    toggleFolder,
    fetchTopFolders
  } = useFolderStats(share?.latest_snapshot?.id);

  const [topFolders, setTopFolders] = useState<any[]>([]);

  useEffect(() => {
    if (share?.latest_snapshot?.id) {
      fetchRootFolders();
      fetchTopFolders(10).then(setTopFolders);
    }
  }, [share?.latest_snapshot?.id, fetchRootFolders, fetchTopFolders]);

  const handleRunScan = async () => {
    if (!id) return;
    const { error } = await triggerScan(id);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('fileShares.scanQueued') });
      refetch();
      refetchScans();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!share) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('common.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/file-shares')} className="mt-4">
          <ArrowLeft className="w-4 h-4 me-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const latestScan = scans[0];
  const snapshot = share.latest_snapshot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/file-shares')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-primary" />
              {share.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{share.domain?.name}</Badge>
              <Badge variant="secondary">{share.share_type}</Badge>
              <Badge variant={share.scan_mode === 'AGENT' ? 'default' : 'outline'}>
                {t(`fileShares.scanMode.${share.scan_mode.toLowerCase()}`)}
              </Badge>
              <Badge variant={share.is_enabled ? 'default' : 'secondary'}>
                {share.is_enabled ? t('common.enabled') : t('common.disabled')}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/file-shares?edit=${id}`)}>
            <Edit className="w-4 h-4 me-2" />
            {t('common.edit')}
          </Button>
          <Button onClick={handleRunScan} disabled={!share.is_enabled || isScanLoading}>
            {isScanLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Play className="w-4 h-4 me-2" />}
            {t('fileShares.runScan')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fileShares.totalSize')}</p>
                <p className="text-2xl font-bold">
                  {snapshot ? formatBytes(snapshot.total_bytes) : '-'}
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fileShares.filesCount')}</p>
                <p className="text-2xl font-bold">
                  {snapshot ? snapshot.total_files.toLocaleString() : '-'}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fileShares.foldersCount')}</p>
                <p className="text-2xl font-bold">
                  {snapshot ? snapshot.total_folders.toLocaleString() : '-'}
                </p>
              </div>
              <Folder className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fileShares.lastScan')}</p>
                <p className="text-lg font-bold">
                  {snapshot ? formatDistanceToNow(new Date(snapshot.created_at), { addSuffix: true, locale: dateLocale }) : '-'}
                </p>
                {latestScan && (
                  <Badge variant={latestScan.status === 'SUCCESS' ? 'default' : latestScan.status === 'FAILED' ? 'destructive' : 'secondary'} className="mt-1">
                    {latestScan.status === 'SUCCESS' && <CheckCircle className="w-3 h-3 me-1" />}
                    {latestScan.status === 'FAILED' && <XCircle className="w-3 h-3 me-1" />}
                    {latestScan.status === 'RUNNING' && <Loader2 className="w-3 h-3 me-1 animate-spin" />}
                    {t(`scan.status.${latestScan.status.toLowerCase()}`)}
                  </Badge>
                )}
              </div>
              <Clock className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('lifecycle.overview')}</TabsTrigger>
          <TabsTrigger value="tree">{t('fileShares.folderTree')}</TabsTrigger>
          <TabsTrigger value="scans">{t('fileShares.scanHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Folders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('fileShares.topFolders')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopFoldersChart folders={topFolders} />
              </CardContent>
            </Card>

            {/* Share Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('common.details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('fileShares.path')}</span>
                  <span className="font-mono text-sm">{share.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('fileShares.scanDepth')}</span>
                  <span>{share.scan_depth}</span>
                </div>
                {share.agent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('fileShares.agent')}</span>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${share.agent.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {share.agent.name}
                    </span>
                  </div>
                )}
                {share.exclude_patterns && share.exclude_patterns.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">{t('fileShares.excludePatterns')}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {share.exclude_patterns.map((p, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tree">
          <Card>
            <CardContent className="p-4">
              {isFolderLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : rootFolders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('fileShares.noData')}
                </div>
              ) : (
                <FolderTree 
                  folders={rootFolders} 
                  expandedFolders={expandedFolders}
                  onToggle={toggleFolder}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scans">
          <Card>
            <CardContent className="p-4">
              <ScanHistory scans={scans} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FileShareDetails;
