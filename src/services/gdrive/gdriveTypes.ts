export type ConflictResolutionStrategy = 'merge-by-id' | 'local-wins' | 'remote-wins';

export interface GDriveSyncConfig {
  tokenKey?: string;
  expiryKey?: string;
  connectedKey?: string;
  lastSyncKey?: string;
  deletedKey?: string;
  scopes?: string;
  defaultFolders?: string[];
  autoSyncIntervalMs?: number;
  conflictStrategy?: ConflictResolutionStrategy;
  maxBackupsToKeep?: number;
}

export interface SyncStatus {
  lastSyncTime: number | null;
  isSyncing: boolean;
  error: string | null;
}

export interface GDriveFile {
  id: string;
  name: string;
  createdTime?: string;
}
