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

interface GDriveStoreState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
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
   EXTERNAL STORE SUBSCRIPTION & SINGLE SNAPSHOT SELECTOR
   ========================================================== */

const subscribe = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};

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

let cachedState: GDriveStoreState = {
  isConnected: false,
  isSyncing: false,
  lastSyncTime: null,
  error: null,
};

const getStoreSnapshot = (): GDriveStoreState => {
  const status = syncService.getStatus();
  const isConnected = syncService.hasCachedSession();

  // Return identical object reference if primitives haven't changed to prevent unnecessary re-renders
  if (
    cachedState.isConnected === isConnected &&
    cachedState.isSyncing === status.isSyncing &&
    cachedState.lastSyncTime === status.lastSyncTime &&
    cachedState.error === status.error
  ) {
    return cachedState;
  }

  cachedState = {
    isConnected,
    isSyncing: status.isSyncing,
    lastSyncTime: status.lastSyncTime,
    error: status.error,
  };

  return cachedState;
};

const getServerSnapshot = (): GDriveStoreState => ({
  isConnected: false,
  isSyncing: false,
  lastSyncTime: null,
  error: null,
});

/* ==========================================================
   HOOK IMPLEMENTATION
   ========================================================== */

export const useGDriveSession = (): UseGDriveSessionReturn => {
  const storeState = useSyncExternalStore(
    subscribe,
    getStoreSnapshot,
    getServerSnapshot
  );

  const [isPending, setIsPending] = useState<boolean>(false);

  // Private helper to retrieve token without mutating UI pending state directly
  const getOrAcquireToken = useCallback(async (): Promise<string> => {
    const cached = await syncService.getValidToken(false);
    if (cached) return cached;

    const token = await syncService.authenticate();
    if (!token) throw new Error('Google sign-in was cancelled.');

    notifySessionChange();
    return token;
  }, []);

  const ensureAuthenticated = useCallback(async (): Promise<string> => {
    setIsPending(true);
    try {
      return await getOrAcquireToken();
    } finally {
      setIsPending(false);
    }
  }, [getOrAcquireToken]);

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
        const token = await getOrAcquireToken();
        const fileName = await syncService.exportBackupToDrive(token, customFileName);
        notifySessionChange();
        return fileName;
      } finally {
        setIsPending(false);
      }
    },
    [getOrAcquireToken]
  );

  const importBackup = useCallback(
    async (customFileName?: string): Promise<void> => {
      setIsPending(true);
      try {
        const token = await getOrAcquireToken();
        await syncService.importBackupFromDrive(token, customFileName);
        notifySessionChange();
      } finally {
        setIsPending(false);
      }
    },
    [getOrAcquireToken]
  );

  return {
    ...storeState,
    isPending,
    ensureAuthenticated,
    disconnect,
    sync,
    exportBackup,
    importBackup,
  };
};