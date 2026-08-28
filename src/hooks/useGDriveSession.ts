import { useState, useCallback, useSyncExternalStore } from 'react';
import { GDriveSyncService } from '@/services/gdriveSync';

export interface UseGDriveSessionReturn {
  /** True if a valid session or token exists in local storage */
  isConnected: boolean;
  /** True if a sync operation is currently active in the background */
  isSyncing: boolean;
  /** Timestamp (ms) of the last successful database synchronization */
  lastSyncTime: number | null;
  /** Last encountered error message from Google Drive service */
  error: string | null;
  /** True while an authentication, export, or import action is pending */
  isPending: boolean;
  /** Ensure an active OAuth token exists, prompting user login if needed */
  ensureAuthenticated: () => Promise<string>;
  /** Disconnect Google Drive session and purge stored credentials */
  disconnect: () => void;
  /** Perform full bidirectional database sync with Google Drive */
  sync: () => Promise<void>;
  /** Create and upload a backup JSON file to Google Drive */
  exportBackup: (customFileName?: string) => Promise<string>;
  /** Restore database state from a Google Drive backup file */
  importBackup: (customFileName?: string) => Promise<void>;
}

const SESSION_CHANGE_EVENT = 'kanjoos_gdrive_session_change';

const syncService = GDriveSyncService.getInstance({
  tokenKey: 'kanjoos_gdrive_token',
  expiryKey: 'kanjoos_gdrive_expiry',
  connectedKey: 'kanjoos_gdrive_connected',
  defaultFolders: ['Backups', 'Exports'],
});

const notifySessionChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
};

/* ==========================================================
   EXTERNAL STORE SUBSCRIPTION & SNAPSHOT SELECTORS
   ========================================================== */

const subscribe = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};

  // Combine GDriveSyncService updates with browser storage events for multi-tab sync
  const unsubscribeService = syncService.subscribe(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith('kanjoos_gdrive_')) {
      callback();
    }
  };

  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  window.addEventListener('storage', handleStorage);

  return () => {
    unsubscribeService();
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
};

const getConnectedSnapshot = (): boolean => syncService.hasCachedSession();
const getIsSyncingSnapshot = (): boolean => syncService.getStatus().isSyncing;
const getLastSyncTimeSnapshot = (): number | null => syncService.getStatus().lastSyncTime;
const getErrorSnapshot = (): string | null => syncService.getStatus().error;

// SSR Fallbacks
const getServerBooleanSnapshot = (): boolean => false;
const getServerNullSnapshot = (): null => null;

/* ==========================================================
   HOOK IMPLEMENTATION
   ========================================================== */

/**
 * Custom hook to manage Google Drive OAuth sessions, monitor sync status,
 * and execute backup/restore operations reactively.
 */
export const useGDriveSession = (): UseGDriveSessionReturn => {
  const isConnected = useSyncExternalStore(
    subscribe,
    getConnectedSnapshot,
    getServerBooleanSnapshot
  );

  const isSyncing = useSyncExternalStore(
    subscribe,
    getIsSyncingSnapshot,
    getServerBooleanSnapshot
  );

  const lastSyncTime = useSyncExternalStore(
    subscribe,
    getLastSyncTimeSnapshot,
    getServerNullSnapshot
  );

  const error = useSyncExternalStore(
    subscribe,
    getErrorSnapshot,
    getServerNullSnapshot
  );

  const [isPending, setIsPending] = useState<boolean>(false);

  /* ==========================================================
     MEMOIZED SESSION ACTIONS
     ========================================================== */

  const ensureAuthenticated = useCallback(async (): Promise<string> => {
    setIsPending(true);
    try {
      const cached = await syncService.getValidToken(false);
      if (cached) return cached;

      const token = await syncService.authenticate();
      if (!token) throw new Error('Google sign-in was cancelled.');

      notifySessionChange();
      return token;
    } finally {
      setIsPending(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    syncService.clearSession();
    notifySessionChange();
  }, []);

  const sync = useCallback(async (): Promise<void> => {
    setIsPending(true);
    try {
      await syncService.sync();
      notifySessionChange();
    } finally {
      setIsPending(false);
    }
  }, []);

  const exportBackup = useCallback(
    async (customFileName?: string): Promise<string> => {
      setIsPending(true);
      try {
        const token = await ensureAuthenticated();
        const fileName = await syncService.exportBackupToDrive(token, customFileName);
        notifySessionChange();
        return fileName;
      } finally {
        setIsPending(false);
      }
    },
    [ensureAuthenticated]
  );

  const importBackup = useCallback(
    async (customFileName?: string): Promise<void> => {
      setIsPending(true);
      try {
        const token = await ensureAuthenticated();
        await syncService.importBackupFromDrive(token, customFileName);
        notifySessionChange();
      } finally {
        setIsPending(false);
      }
    },
    [ensureAuthenticated]
  );

  return {
    isConnected,
    isSyncing,
    lastSyncTime,
    error,
    isPending,
    ensureAuthenticated,
    disconnect,
    sync,
    exportBackup,
    importBackup,
  };
};