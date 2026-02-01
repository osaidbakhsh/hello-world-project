import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatBytes, FolderStat } from '@/types/fileshares';
import { Progress } from '@/components/ui/progress';
import { Folder } from 'lucide-react';

interface TopFoldersChartProps {
  folders: FolderStat[];
}

const TopFoldersChart: React.FC<TopFoldersChartProps> = ({ folders }) => {
  const { t } = useLanguage();

  if (folders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('fileShares.noData')}
      </div>
    );
  }

  const maxSize = Math.max(...folders.map(f => f.size_bytes));

  return (
    <div className="space-y-3">
      {folders.map((folder, index) => (
        <div key={folder.id} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-muted-foreground w-5">{index + 1}.</span>
              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="truncate" title={folder.path}>
                {folder.path}
              </span>
            </div>
            <span className="font-mono text-muted-foreground ms-4 flex-shrink-0">
              {formatBytes(folder.size_bytes)}
            </span>
          </div>
          <Progress 
            value={(folder.size_bytes / maxSize) * 100} 
            className="h-2"
          />
        </div>
      ))}
    </div>
  );
};

export default TopFoldersChart;
