import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { formatBytes, FolderStat } from '@/types/fileshares';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface FolderTreeProps {
  folders: FolderStat[];
  expandedFolders: Record<string, FolderStat[]>;
  onToggle: (folderId: string) => void;
  depth?: number;
}

const FolderTree: React.FC<FolderTreeProps> = ({ 
  folders, 
  expandedFolders, 
  onToggle,
  depth = 0 
}) => {
  const { dir } = useLanguage();

  return (
    <div className="font-mono text-sm">
      {folders.map(folder => {
        const isExpanded = !!expandedFolders[folder.id];
        const children = expandedFolders[folder.id] || [];
        const hasChildren = folder.folders_count > 0;

        return (
          <div key={folder.id}>
            <div
              className={cn(
                'flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors',
                depth > 0 && 'border-s-2 border-muted ms-4'
              )}
              style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
              onClick={() => hasChildren && onToggle(folder.id)}
            >
              {/* Expand/Collapse Icon */}
              <span className="w-4 h-4 flex items-center justify-center">
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )
                ) : null}
              </span>

              {/* Folder Icon */}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-500" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500" />
              )}

              {/* Folder Name */}
              <span className="flex-1 truncate">{folder.name || '/'}</span>

              {/* Size Bar */}
              <div className="w-24 hidden sm:block">
                <Progress 
                  value={folder.percent_of_share} 
                  className="h-1.5" 
                />
              </div>

              {/* Size */}
              <span className="text-muted-foreground w-20 text-end">
                {formatBytes(folder.size_bytes)}
              </span>

              {/* Percentage */}
              <span className="text-muted-foreground w-16 text-end">
                {folder.percent_of_share.toFixed(1)}%
              </span>
            </div>

            {/* Children (if expanded) */}
            {isExpanded && children.length > 0 && (
              <FolderTree
                folders={children}
                expandedFolders={expandedFolders}
                onToggle={onToggle}
                depth={depth + 1}
              />
            )}

            {/* Loading indicator */}
            {isExpanded && children.length === 0 && hasChildren && (
              <div 
                className="flex items-center gap-2 py-2 text-muted-foreground"
                style={{ paddingInlineStart: `${(depth + 1) * 16 + 24}px` }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FolderTree;
