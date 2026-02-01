// File Share Analytics Types

export type ShareType = 'SMB' | 'NFS' | 'LOCAL';
export type ScanMode = 'DIRECT' | 'AGENT';
export type AgentStatus = 'ONLINE' | 'OFFLINE';
export type ScanStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type ScanErrorCode = 'ACCESS_DENIED' | 'PATH_NOT_FOUND' | 'TIMEOUT' | 'IO_ERROR';

export interface ScanAgent {
  id: string;
  domain_id: string;
  name: string;
  site_tag: string | null;
  status: AgentStatus;
  last_seen_at: string | null;
  version: string | null;
  auth_token_hash: string;
  created_by: string | null;
  created_at: string;
}

export interface FileShare {
  id: string;
  domain_id: string;
  name: string;
  share_type: ShareType;
  path: string;
  scan_mode: ScanMode;
  agent_id: string | null;
  credential_vault_id: string | null;
  scan_depth: number;
  exclude_patterns: string[];
  schedule_cron: string | null;
  maintenance_window_id: string | null;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  agent?: ScanAgent;
  domain?: { id: string; name: string };
  latest_snapshot?: ScanSnapshot;
}

export interface FileshareScan {
  id: string;
  file_share_id: string;
  domain_id: string | null;
  scan_mode: ScanMode;
  agent_id: string | null;
  status: ScanStatus;
  progress_percent: number;
  started_at: string | null;
  finished_at: string | null;
  error_code: ScanErrorCode | null;
  log_text: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScanSnapshot {
  id: string;
  file_share_id: string;
  scan_id: string;
  total_bytes: number;
  total_files: number;
  total_folders: number;
  created_at: string;
}

export interface FolderStat {
  id: string;
  snapshot_id: string;
  parent_id: string | null;
  path: string;
  name: string;
  depth: number;
  size_bytes: number;
  files_count: number;
  folders_count: number;
  percent_of_share: number;
  children?: FolderStat[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

export interface FileShareFormData {
  domain_id: string;
  name: string;
  share_type: ShareType;
  path: string;
  scan_mode: ScanMode;
  agent_id?: string | null;
  credential_vault_id?: string | null;
  scan_depth: number;
  exclude_patterns: string[];
  schedule_cron?: string | null;
  maintenance_window_id?: string | null;
  is_enabled: boolean;
}

// Helper to format bytes
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
