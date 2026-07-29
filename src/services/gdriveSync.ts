import { db } from '../db/schema';

export type ConflictResolutionStrategy = 'merge-by-id' | 'local-wins' | 'remote-wins';

export interface GDriveSyncConfig {
  tokenKey?: string;
  expiryKey?: string;
  connectedKey?: string;
  lastSyncKey?: string;
  scopes?: string;
  defaultFolders?: string[];
  autoSyncIntervalMs?: number;
  conflictStrategy?: ConflictResolutionStrategy;
}

export interface SyncStatus {
  lastSyncTime: number | null;
  isSyncing: boolean;
  error: string | null;
}

export class GDriveSyncService {
  private static instance: GDriveSyncService;

  private tokenKey: string = 'kanjoos_gdrive_token';
  private expiryKey: string = 'kanjoos_gdrive_expiry';
  private connectedKey: string = 'kanjoos_gdrive_connected';
  private lastSyncKey: string = 'kanjoos_gdrive_last_sync';
  private scopes: string = 'https://www.googleapis.com/auth/drive.appdata';
  private defaultFolders: string[] = ['Backups', 'Exports'];
  private autoSyncIntervalMs: number = 15 * 60 * 1000; // Default: 15 mins
  private conflictStrategy: ConflictResolutionStrategy = 'merge-by-id';

  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing: boolean = false;
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
    if (config.scopes) this.scopes = config.scopes;
    if (config.defaultFolders) this.defaultFolders = config.defaultFolders;
    if (config.autoSyncIntervalMs !== undefined) this.autoSyncIntervalMs = config.autoSyncIntervalMs;
    if (config.conflictStrategy) this.conflictStrategy = config.conflictStrategy;
  }

  /* ==========================================================
     STATUS & EVENT LISTENERS
     ========================================================== */

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

  /* ==========================================================
     AUTOMATIC PERIODIC SYNC SCHEDULER
     ========================================================== */

  public startAutoSync(intervalMs = this.autoSyncIntervalMs): void {
    this.stopAutoSync();
    this.autoSyncIntervalMs = intervalMs;

    if (this.autoSyncIntervalMs <= 0) return;

    // Periodically run sync
    this.syncTimer = setInterval(() => {
      if (this.hasValidAccessToken()) {
        this.sync().catch((err) => console.warn('Background auto-sync failed:', err));
      }
    }, this.autoSyncIntervalMs);

    // Sync on tab focus or back online
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

  /* ==========================================================
     TIMESTAMP FILENAME GENERATOR
     ========================================================== */

  public generateBackupFileName(): string {
    const now = new Date();
    const DD = String(now.getDate()).padStart(2, '0');
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const YY = String(now.getFullYear()).slice(-2);
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const fff = String(now.getMilliseconds()).padStart(3, '0');

    return `BKP_${DD}${MM}${YY}_${HH}:${mm}:${ss}.${fff}.json`;
  }

  /* ==========================================================
     AUTOMATIC FOLDER CREATION & MANAGEMENT
     ========================================================== */

  async getOrCreateFolder(token: string | null, folderName: string): Promise<string> {
    if (!token) {
      throw new Error('No access token provided. Please authenticate first.');
    }

    const query = encodeURIComponent(
      `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'appDataFolder' in parents and trashed = false`
    );

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (searchRes.status === 403) {
      const errorData = await searchRes.json();
      throw new Error(`Google API Forbidden: ${errorData.error?.message || 'Check Drive API configuration'}`);
    }

    if (searchRes.status === 401) {
      throw new Error('Authentication failed or token expired.');
    }

    const searchData = await searchRes.json();
    if (searchData.files?.[0]?.id) {
      return searchData.files[0].id;
    }

    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['appDataFolder'],
    };

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderMetadata),
    });

    const folderData = await createRes.json();
    return folderData.id;
  }

  async ensureAppFolders(token: string | null, folderNames = this.defaultFolders): Promise<Record<string, string>> {
    const activeToken = await this.ensureValidToken(token);
    const folderMap: Record<string, string> = {};
    for (const folderName of folderNames) {
      folderMap[folderName] = await this.getOrCreateFolder(activeToken, folderName);
    }
    return folderMap;
  }

  /* ==========================================================
     TOKEN & SESSION MANAGEMENT
     ========================================================== */

  async ensureValidToken(token?: string | null): Promise<string> {
    const activeToken = token || (await this.getValidToken());
    if (!activeToken) {
      throw new Error('Authentication required. Please sign in to Google Drive.');
    }
    return activeToken;
  }

  hasCachedSession(): boolean {
    if (localStorage.getItem(this.connectedKey) === 'true') {
      return true;
    }
    return this.hasValidAccessToken();
  }

  hasValidAccessToken(): boolean {
    const cachedToken = localStorage.getItem(this.tokenKey);
    const expiresAt = Number(localStorage.getItem(this.expiryKey) || 0);
    return Boolean(cachedToken && Date.now() < expiresAt - 5 * 60 * 1000);
  }

  async authenticate(): Promise<string | null> {
    return this.requestAuth('select_account');
  }

  async getValidToken(forceInteractive = false): Promise<string | null> {
    const cachedToken = localStorage.getItem(this.tokenKey);
    const expiresAt = Number(localStorage.getItem(this.expiryKey) || 0);

    if (cachedToken && Date.now() < expiresAt - 5 * 60 * 1000) {
      return cachedToken;
    }

    if (forceInteractive) {
      return this.requestAuth('select_account');
    }

    return null;
  }

  async requestAuth(prompt: '' | 'consent' | 'select_account' = ''): Promise<string | null> {
    return new Promise((resolve, reject) => {
      try {
        if (!(window as any).google?.accounts?.oauth2) {
          throw new Error('Google Identity Services SDK not loaded.');
        }

        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!client_id) {
          throw new Error('Google Client ID is missing in environment variables.');
        }

        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id,
          scope: this.scopes,
          callback: async (response: any) => {
            if (response.error) {
              if (prompt === '') {
                resolve(this.requestAuth('select_account'));
              } else {
                reject(response.error);
              }
            } else {
              const expiresInMs = (response.expires_in || 3600) * 1000;
              const expiresAt = Date.now() + expiresInMs;

              localStorage.setItem(this.tokenKey, response.access_token);
              localStorage.setItem(this.expiryKey, expiresAt.toString());
              localStorage.setItem(this.connectedKey, 'true');

              resolve(response.access_token);

              this.ensureAppFolders(response.access_token).catch((err) =>
                console.warn('Background folder creation failed:', err)
              );
            }
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
    this.notifyStatus();
  }

  /* ==========================================================
     CRUD & QUERY OPERATIONS
     ========================================================== */

  async findBackupFile(token: string, fileName: string, parentFolderId = 'appDataFolder'): Promise<{ id: string; name: string } | null> {
    const query = encodeURIComponent(`name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error(`Failed to list Drive files: ${response.statusText}`);
    const result = await response.json();
    return result.files?.[0] || null;
  }

  async findLatestBackupFile(token: string, parentFolderId = 'appDataFolder'): Promise<{ id: string; name: string } | null> {
    const query = encodeURIComponent(`'${parentFolderId}' in parents and trashed = false and name contains 'BKP_'`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&orderBy=createdTime%20desc&pageSize=1&fields=files(id,name,createdTime)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error(`Failed to query latest backup file: ${response.statusText}`);
    const result = await response.json();
    return result.files?.[0] || null;
  }

  async createFile(token: string, contentBlob: Blob, fileName: string, parentFolderId = 'appDataFolder'): Promise<any> {
    const metadata = {
      name: fileName,
      parents: [parentFolderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', contentBlob);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    if (!response.ok) throw new Error(`Failed to create file on GDrive: ${response.statusText}`);
    return await response.json();
  }

  async readFile<T = any>(token: string, fileId: string): Promise<T> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error(`Failed to read file content: ${response.statusText}`);
    return await response.json();
  }

  /* ==========================================================
     CONFLICT RESOLUTION & SYNC ENGINE
     ========================================================== */

  /**
   * Primary entry point for Syncing local and remote stores.
   */
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
        // 'merge-by-id' Strategy
        const remoteData = await this.readFile(activeToken, latestRemoteFile.id);
        
        const localAccounts = await db.accounts.toArray();
        const localTransactions = await db.transactions.toArray();
        const localCategories = await db.categories.toArray();

        const mergedAccounts = this.mergeEntities(localAccounts, remoteData.accounts || []);
        const mergedTransactions = this.mergeEntities(localTransactions, remoteData.transactions || []);
        const mergedCategories = this.mergeEntities(localCategories, remoteData.categories || []);

        // Save merged result locally
        await db.transaction('rw', [db.accounts, db.transactions, db.categories], async () => {
          await db.accounts.clear();
          await db.transactions.clear();
          await db.categories.clear();

          if (mergedAccounts.length) await db.accounts.bulkAdd(mergedAccounts);
          if (mergedTransactions.length) await db.transactions.bulkAdd(mergedTransactions);
          if (mergedCategories.length) await db.categories.bulkAdd(mergedCategories);
        });

        // Push merged state back to Google Drive
        const mergedBlob = new Blob(
          [
            JSON.stringify(
              {
                accounts: mergedAccounts,
                transactions: mergedTransactions,
                categories: mergedCategories,
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

      const now = Date.now();
      localStorage.setItem(this.lastSyncKey, now.toString());
    } catch (err: any) {
      this.lastError = err.message || 'Synchronization failed.';
      throw err;
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }
  }

  /**
   * Merges two entity collections based on primary key `id` and item timestamps.
   */
  private mergeEntities<T extends { id: string; updatedAt?: number; date?: number }>(
    localList: T[],
    remoteList: T[]
  ): T[] {
    const map = new Map<string, T>();

    const getItemTimestamp = (item: T): number => {
      return item.updatedAt ?? item.date ?? 0;
    };

    localList.forEach((item) => map.set(item.id, item));

    remoteList.forEach((remoteItem) => {
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, remoteItem);
      } else {
        if (getItemTimestamp(remoteItem) > getItemTimestamp(localItem)) {
          map.set(remoteItem.id, remoteItem);
        }
      }
    });

    return Array.from(map.values());
  }

  /* ==========================================================
     BACKUP & RESTORE WORKFLOWS
     ========================================================== */

  async exportBackupToDrive(token?: string, customFileName?: string): Promise<string> {
    const activeToken = token || (await this.getValidToken());
    if (!activeToken) throw new Error('No valid access token available.');

    const folders = await this.ensureAppFolders(activeToken);
    const backupFolderId = folders['Backups'] || 'appDataFolder';

    const fileName = customFileName || this.generateBackupFileName();

    const data = {
      accounts: await db.accounts.toArray(),
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    await this.createFile(activeToken, blob, fileName, backupFolderId);
    return fileName;
  }

  async importBackupFromDrive(token?: string, customFileName?: string): Promise<void> {
    const activeToken = token || (await this.getValidToken());
    if (!activeToken) throw new Error('No valid access token available.');

    const folders = await this.ensureAppFolders(activeToken);
    const backupFolderId = folders['Backups'] || 'appDataFolder';

    let fileToImport: { id: string; name: string } | null = null;

    if (customFileName) {
      fileToImport = await this.findBackupFile(activeToken, customFileName, backupFolderId);
    } else {
      fileToImport = await this.findLatestBackupFile(activeToken, backupFolderId);
    }

    if (!fileToImport) {
      throw new Error('No valid backup file found on Google Drive.');
    }

    const data = await this.readFile(activeToken, fileToImport.id);

    await db.transaction('rw', [db.accounts, db.transactions, db.categories], async () => {
      await db.accounts.clear();
      await db.transactions.clear();
      await db.categories.clear();

      if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts);
      if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
      if (data.categories?.length) await db.categories.bulkAdd(data.categories);
    });
  }
}