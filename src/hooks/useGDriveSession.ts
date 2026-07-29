import { useCallback, useSyncExternalStore } from 'react';
import { GDriveSyncService } from '@/services/gdriveSync';

const SESSION_CHANGE_EVENT = 'kanjoos_gdrive_session_change';

const syncService = GDriveSyncService.getInstance({
  tokenKey: 'kanjoos_gdrive_token',
  expiryKey: 'kanjoos_gdrive_expiry',
  connectedKey: 'kanjoos_gdrive_connected',
  defaultFolders: ['Backups', 'Exports'],
});

const subscribe = (callback: () => void) => {
  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
};

const getSnapshot = (): boolean => syncService.hasCachedSession();

const notifySessionChange = () => {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

export const useGDriveSession = () => {
  const isConnected = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const ensureAuthenticated = useCallback(async (): Promise<string> => {
    const cached = await syncService.getValidToken(false);
    if (cached) return cached;

    const token = await syncService.authenticate();
    if (!token) throw new Error('Google sign-in was cancelled.');

    notifySessionChange();
    return token;
  }, []);

  const disconnect = useCallback(() => {
    syncService.clearSession();
    notifySessionChange();
  }, []);

  const exportBackup = useCallback(async (): Promise<string> => {
    const token = await ensureAuthenticated();
    const fileName = await syncService.exportBackupToDrive(token);
    notifySessionChange();
    return fileName;
  }, [ensureAuthenticated]);

  const importBackup = useCallback(async (): Promise<void> => {
    const token = await ensureAuthenticated();
    await syncService.importBackupFromDrive(token);
    notifySessionChange();
  }, [ensureAuthenticated]);

  return {
    isConnected,
    ensureAuthenticated,
    disconnect,
    exportBackup,
    importBackup,
  };
};
