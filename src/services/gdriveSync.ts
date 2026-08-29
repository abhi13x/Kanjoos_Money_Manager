import { db, type Account, type Category, type Transaction } from '../db/schema';
import type { TokenClient } from '../types/google';

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

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer
const DEFAULT_AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_MAX_BACKUPS = 10;
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export class GDriveSyncService {
  private static instance: GDriveSyncService;

  private tokenKey = 'kanjoos_gdrive_token';
  private expiryKey = 'kanjoos_gdrive_expiry';
  private connectedKey = 'kanjoos_gdrive_connected';
  private lastSyncKey = 'kanjoos_gdrive_last_sync';
  private deletedKey = 'kanjoos_gdrive_deleted_ids';
  private scopes = 'https://www.googleapis.com/auth/drive.appdata';
  private defaultFolders = ['Backups', 'Exports'];
  private autoSyncIntervalMs = DEFAULT_AUTO_SYNC_INTERVAL_MS;
  private maxBackupsToKeep = DEFAULT_MAX_BACKUPS;
  private conflictStrategy: ConflictResolutionStrategy = 'merge-by-id';

  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private lastError: string | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {}

  public static getInstance(config?: GDriveSyncConfig): GDriveSyncService {
    if (!GDriveSyncService.instance) {
      GDriveSyncService.instance = new GDriveSyncService();
    }
    if (config) {
      GDriveSyncService.instance.configure(config);
    }
    return GDriveSyncService.instance;
  }

  public configure(config: Partial<GDriveSyncConfig>): void {
    if (config.tokenKey) this.tokenKey = config.tokenKey;
    if (config.expiryKey) this.expiryKey = config.expiryKey;
    if (config.connectedKey) this.connectedKey = config.connectedKey;
    if (config.lastSyncKey) this.lastSyncKey = config.lastSyncKey;
    if (config.deletedKey) this.deletedKey = config.deletedKey;
    if (config.scopes) this.scopes = config.scopes;
    if (config.defaultFolders) this.defaultFolders = config.defaultFolders;
    if (config.autoSyncIntervalMs !== undefined) this.autoSyncIntervalMs = config.autoSyncIntervalMs;
    if (config.maxBackupsToKeep !== undefined) this.maxBackupsToKeep = config.maxBackupsToKeep;
    if (config.conflictStrategy) this.conflictStrategy = config.conflictStrategy;
  }

  // ─── Helpers ────────────────────────────────────────────────
  private escapeQuery(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // ─── Tombstone Management ──────────────────────────────────
  public markAsDeleted(id: string): void {
    try {
      const deleted = this.getDeletedIds();
      deleted.add(id);
      localStorage.setItem(this.deletedKey, JSON.stringify(Array.from(deleted)));
    } catch (e) {
      console.warn('Failed to record deleted ID locally:', e);
    }
  }

  public getDeletedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.deletedKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  // ─── REST Client ────────────────────────────────────────────
  private async driveFetch<T = unknown>(
    url: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Clear invalid token
      this.clearSession();
      throw new Error('Authentication failed or token expired. Please reconnect.');
    }

    if (response.status === 403) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(
        `Google API Forbidden: ${errorData.error?.message || 'Check Drive API configuration'}`
      );
    }

    if (!response.ok) {
      throw new Error(`Google Drive API Error (${response.status}): ${response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // ─── Status & Subscriptions ─────────────────────────────────
  public getStatus(): SyncStatus {
    const rawTime = localStorage.getItem(this.lastSyncKey);
    return {
      lastSyncTime: rawTime ? Number(rawTime) : null,
      isSyncing: this.isSyncing,
      error: this.lastError,
    };
  }

  public subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  // ─── Auto-Sync Scheduler ────────────────────────────────────
  public startAutoSync(intervalMs = this.autoSyncIntervalMs): void {
    this.stopAutoSync();
    this.autoSyncIntervalMs = intervalMs;

    if (this.autoSyncIntervalMs <= 0) return;

    this.syncTimer = setInterval(() => {
      if (this.hasValidAccessToken()) {
        this.sync().catch((err) => console.warn('Background auto-sync failed:', err));
      }
    }, this.autoSyncIntervalMs);

    window.addEventListener('online', this.handleEventSync);
    document.addEventListener('visibilitychange', this.handleVisibilitySync);
  }

  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    window.removeEventListener('online', this.handleEventSync);
    document.removeEventListener('visibilitychange', this.handleVisibilitySync);
  }

  private handleEventSync = () => {
    if (this.hasValidAccessToken()) {
      this.sync().catch((err) => console.warn('Event auto-sync failed:', err));
    }
  };

  private handleVisibilitySync = () => {
    if (document.visibilityState === 'visible') {
      this.handleEventSync();
    }
  };

  // ─── Backup File Name Generator ─────────────────────────────
  public generateBackupFileName(): string {
    const now = new Date();
    const pad = (num: number, len = 2) => String(num).padStart(len, '0');

    const DD = pad(now.getDate());
    const MM = pad(now.getMonth() + 1);
    const YY = String(now.getFullYear()).slice(-2);
    const HH = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const fff = pad(now.getMilliseconds(), 3);

    return `BKP_${DD}${MM}${YY}_${HH}${mm}${ss}_${fff}.json`;
  }

  // ─── Folder Management ──────────────────────────────────────
  async getOrCreateFolder(token: string | null, folderName: string): Promise<string> {
    const activeToken = await this.ensureValidToken(token);
    const safeName = this.escapeQuery(folderName);
    const query = encodeURIComponent(
      `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and 'appDataFolder' in parents and trashed = false`
    );

    const searchData = await this.driveFetch<{ files?: GDriveFile[] }>(
      `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`,
      activeToken
    );

    if (searchData.files?.[0]?.id) {
      return searchData.files[0].id;
    }

    const folderData = await this.driveFetch<{ id: string }>(
      `${DRIVE_API_BASE}/files?fields=id`,
      activeToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['appDataFolder'],
        }),
      }
    );

    return folderData.id;
  }

  async ensureAppFolders(
    token: string | null,
    folderNames = this.defaultFolders
  ): Promise<Record<string, string>> {
    const activeToken = await this.ensureValidToken(token);
    const folderEntries = await Promise.all(
      folderNames.map(async (name) => [name, await this.getOrCreateFolder(activeToken, name)])
    );
    return Object.fromEntries(folderEntries);
  }

  private async pruneOldBackups(token: string, parentFolderId: string): Promise<void> {
    const query = encodeURIComponent(
      `'${this.escapeQuery(parentFolderId)}' in parents and trashed = false and name contains 'BKP_'`
    );

    const result = await this.driveFetch<{ files?: GDriveFile[] }>(
      `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&orderBy=createdTime%20desc&pageSize=100&fields=files(id,name,createdTime)`,
      token
    );

    const files = result.files || [];
    if (files.length > this.maxBackupsToKeep) {
      const filesToDelete = files.slice(this.maxBackupsToKeep);
      await Promise.all(
        filesToDelete.map((file) =>
          this.driveFetch(`${DRIVE_API_BASE}/files/${file.id}`, token, { method: 'DELETE' }).catch(
            (err) => console.warn(`Failed to prune backup file ${file.id}:`, err)
          )
        )
      );
    }
  }

  // ─── Token & Session Management ────────────────────────────
  async ensureValidToken(token?: string | null): Promise<string> {
    const activeToken = token || (await this.getValidToken());
    if (!activeToken) {
      throw new Error('Authentication required. Please sign in to Google Drive.');
    }
    return activeToken;
  }

  /**
   * Returns true only if we have a **valid** (non‑expired) token.
   * This prevents false "connected" state after the token expires.
   */
  hasCachedSession(): boolean {
    return this.hasValidAccessToken();
  }

  hasValidAccessToken(): boolean {
    const cachedToken = localStorage.getItem(this.tokenKey);
    const expiresAt = Number(localStorage.getItem(this.expiryKey) || 0);
    return Boolean(cachedToken && Date.now() < expiresAt - TOKEN_EXPIRY_BUFFER_MS);
  }

  async authenticate(): Promise<string | null> {
    // Force a fresh token, even if a cached one exists (user explicitly wants to reconnect)
    return this.requestAuth('select_account');
  }

  async getValidToken(forceInteractive = false): Promise<string | null> {
    if (this.hasValidAccessToken()) {
      return localStorage.getItem(this.tokenKey);
    }

    if (forceInteractive) {
      return this.requestAuth('select_account');
    }

    return null;
  }

  async requestAuth(prompt: '' | 'consent' | 'select_account' = ''): Promise<string | null> {
    return new Promise((resolve, reject) => {
      try {
        if (!window.google?.accounts?.oauth2) {
          reject(new Error('Google Identity Services SDK not loaded.'));
          return;
        }

        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!client_id) {
          reject(new Error('Google Client ID is missing in environment variables.'));
          return;
        }

        const client: TokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id,
          scope: this.scopes,
          callback: (response) => {
            if (response.error) {
              // If user cancels or error, reject
              reject(new Error(typeof response.error === 'string' ? response.error : 'Authentication failed.'));
              return;
            }

            if (!response.access_token) {
              reject(new Error('No access token received.'));
              return;
            }

            const expiresInMs = (Number(response.expires_in) || 3600) * 1000;
            const expiresAt = Date.now() + expiresInMs;

            try {
              localStorage.setItem(this.tokenKey, response.access_token);
              localStorage.setItem(this.expiryKey, expiresAt.toString());
              localStorage.setItem(this.connectedKey, 'true');
            } catch (e) {
              reject(new Error('Failed to store authentication token.'));
              return;
            }

            // Start auto-sync and create folders in background
            this.startAutoSync();
            this.ensureAppFolders(response.access_token).catch((err) =>
              console.warn('Background folder creation failed:', err)
            );

            resolve(response.access_token);
          },
        });

        client.requestAccessToken({ prompt });
      } catch (error) {
        console.error('OAuth initialization failed:', error);
        reject(error);
      }
    });
  }

  clearSession(): void {
    this.stopAutoSync();
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.expiryKey);
    localStorage.removeItem(this.connectedKey);
    localStorage.removeItem(this.lastSyncKey);
    localStorage.removeItem(this.deletedKey);
    this.notifyStatus();
  }

  // ─── File Operations ────────────────────────────────────────
  async findBackupFile(
    token: string,
    fileName: string,
    parentFolderId = 'appDataFolder'
  ): Promise<GDriveFile | null> {
    const safeName = this.escapeQuery(fileName);
    const safeParent = this.escapeQuery(parentFolderId);
    const query = encodeURIComponent(
      `name = '${safeName}' and '${safeParent}' in parents and trashed = false`
    );

    const result = await this.driveFetch<{ files?: GDriveFile[] }>(
      `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`,
      token
    );

    return result.files?.[0] || null;
  }

  async findLatestBackupFile(
    token: string,
    parentFolderId = 'appDataFolder'
  ): Promise<GDriveFile | null> {
    const safeParent = this.escapeQuery(parentFolderId);
    const query = encodeURIComponent(
      `'${safeParent}' in parents and trashed = false and name contains 'BKP_'`
    );

    const result = await this.driveFetch<{ files?: GDriveFile[] }>(
      `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&orderBy=createdTime%20desc&pageSize=1&fields=files(id,name,createdTime)`,
      token
    );

    return result.files?.[0] || null;
  }

  async createFile(
    token: string,
    contentBlob: Blob,
    fileName: string,
    parentFolderId = 'appDataFolder'
  ): Promise<GDriveFile> {
    const metadata = { name: fileName, parents: [parentFolderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', contentBlob);

    const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Failed to create file on GDrive: ${response.statusText}`);
    }

    return response.json() as Promise<GDriveFile>;
  }

  async readFile<T = unknown>(token: string, fileId: string): Promise<T> {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to read file content: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // ─── Sync Engine ────────────────────────────────────────────
  async sync(strategy = this.conflictStrategy): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.lastError = null;
    this.notifyStatus();

    try {
      const activeToken = await this.ensureValidToken();
      const folders = await this.ensureAppFolders(activeToken);
      const backupFolderId = folders['Backups'] || 'appDataFolder';

      const latestRemoteFile = await this.findLatestBackupFile(activeToken, backupFolderId);

      if (strategy === 'local-wins' || !latestRemoteFile) {
        await this.exportBackupToDrive(activeToken);
      } else if (strategy === 'remote-wins') {
        await this.importBackupFromDrive(activeToken, latestRemoteFile.name);
      } else {
        // Merge strategy
        const remoteData = await this.readFile<{
          accounts?: Account[];
          transactions?: Transaction[];
          categories?: Category[];
          deletedIds?: string[];
        }>(activeToken, latestRemoteFile.id);

        // Merge remote deleted IDs into local tombstone state
        if (remoteData.deletedIds && Array.isArray(remoteData.deletedIds)) {
          remoteData.deletedIds.forEach((id) => this.markAsDeleted(id));
        }

        const localAccounts = await db.accounts.toArray();
        const localTransactions = await db.transactions.toArray();
        const localCategories = await db.categories.toArray();

        const mergedAccounts = this.mergeEntities(localAccounts, remoteData.accounts || []);
        const mergedTransactions = this.mergeEntities(localTransactions, remoteData.transactions || []);
        const mergedCategories = this.mergeEntities(localCategories, remoteData.categories || []);

        await db.transaction('rw', [db.accounts, db.transactions, db.categories], async () => {
          await db.accounts.clear();
          await db.transactions.clear();
          await db.categories.clear();

          if (mergedAccounts.length) await db.accounts.bulkPut(mergedAccounts);
          if (mergedTransactions.length) await db.transactions.bulkPut(mergedTransactions);
          if (mergedCategories.length) await db.categories.bulkPut(mergedCategories);
        });

        // Upload merged backup
        const mergedBlob = new Blob(
          [
            JSON.stringify(
              {
                accounts: mergedAccounts,
                transactions: mergedTransactions,
                categories: mergedCategories,
                deletedIds: Array.from(this.getDeletedIds()),
                exportedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          ],
          { type: 'application/json' }
        );

        await this.createFile(activeToken, mergedBlob, this.generateBackupFileName(), backupFolderId);
      }

      await this.pruneOldBackups(activeToken, backupFolderId);
      localStorage.setItem(this.lastSyncKey, Date.now().toString());
    } catch (err: unknown) {
      this.lastError = err instanceof Error ? err.message : 'Synchronization failed.';
      throw err;
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }
  }

  private mergeEntities<T extends { id: string; updatedAt?: number }>(
    localList: T[],
    remoteList: T[]
  ): T[] {
    const map = new Map<string, T>();
    const getItemTimestamp = (item: T): number => item.updatedAt ?? 0;
    const deletedIds = this.getDeletedIds();

    // 1. Populate local items, excluding deleted
    localList.forEach((item) => {
      if (!deletedIds.has(item.id)) {
        map.set(item.id, item);
      }
    });

    // 2. Merge remote items (skip deleted)
    remoteList.forEach((remoteItem) => {
      if (deletedIds.has(remoteItem.id)) {
        return;
      }

      const localItem = map.get(remoteItem.id);
      if (!localItem || getItemTimestamp(remoteItem) > getItemTimestamp(localItem)) {
        map.set(remoteItem.id, remoteItem);
      }
    });

    return Array.from(map.values());
  }

  // ─── Backup & Restore ───────────────────────────────────────
  async exportBackupToDrive(token?: string, customFileName?: string): Promise<string> {
    const activeToken = await this.ensureValidToken(token);
    const folders = await this.ensureAppFolders(activeToken);
    const backupFolderId = folders['Backups'] || 'appDataFolder';

    const fileName = customFileName || this.generateBackupFileName();

    const data = {
      accounts: await db.accounts.toArray(),
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      deletedIds: Array.from(this.getDeletedIds()),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    await this.createFile(activeToken, blob, fileName, backupFolderId);
    await this.pruneOldBackups(activeToken, backupFolderId);
    return fileName;
  }

  public async exportToGDrive(token?: string): Promise<string> {
    return this.exportBackupToDrive(token);
  }

  async importBackupFromDrive(token?: string, customFileName?: string): Promise<void> {
    const activeToken = await this.ensureValidToken(token);
    const folders = await this.ensureAppFolders(activeToken);
    const backupFolderId = folders['Backups'] || 'appDataFolder';

    const fileToImport = customFileName
      ? await this.findBackupFile(activeToken, customFileName, backupFolderId)
      : await this.findLatestBackupFile(activeToken, backupFolderId);

    if (!fileToImport) {
      throw new Error('No valid backup file found on Google Drive.');
    }

    const data = await this.readFile<{
      accounts?: Account[];
      transactions?: Transaction[];
      categories?: Category[];
      deletedIds?: string[];
    }>(activeToken, fileToImport.id);

    if (data.deletedIds && Array.isArray(data.deletedIds)) {
      data.deletedIds.forEach((id) => this.markAsDeleted(id));
    }

    await db.transaction('rw', [db.accounts, db.transactions, db.categories], async () => {
      await db.accounts.clear();
      await db.transactions.clear();
      await db.categories.clear();

      if (data.accounts?.length) await db.accounts.bulkPut(data.accounts);
      if (data.transactions?.length) await db.transactions.bulkPut(data.transactions);
      if (data.categories?.length) await db.categories.bulkPut(data.categories);
    });
  }
}

// ─── Exported Helpers ─────────────────────────────────────────
export const exportBackupToGDrive = async (): Promise<string> => {
  const syncService = GDriveSyncService.getInstance();
  return await syncService.exportBackupToDrive();
};

export const recordDeletedTransactionId = (id: string): void => {
  GDriveSyncService.getInstance().markAsDeleted(id);
};