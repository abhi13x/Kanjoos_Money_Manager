import { db } from '../db/schema';

export interface GDriveSyncConfig {
  tokenKey?: string;
  expiryKey?: string;
  scopes?: string;
  defaultFolders?: string[];
}

export class GDriveSyncService {
  private static instance: GDriveSyncService;

  private tokenKey: string = 'kanjoos_gdrive_token';
  private expiryKey: string = 'kanjoos_gdrive_expiry';
  private scopes: string = 'https://www.googleapis.com/auth/drive.appdata';
  private defaultFolders: string[] = ['Backups', 'Exports'];

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
    if (config.scopes) this.scopes = config.scopes;
    if (config.defaultFolders) this.defaultFolders = config.defaultFolders;
  }

  /* ==========================================================
     TIMESTAMP FILENAME GENERATOR
     ========================================================== */

  /**
   * Generates dynamic timestamped filename in format: BKP_DDMMYY_HH:mm:ss.fff.json
   */
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
      `https://www.googleapis.com/drive/v3/files?q=${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (searchRes.status === 403) {
      const errorData = await searchRes.json();
      console.error('Google API 403 Forbidden Detail:', errorData);
      throw new Error(`Google API Forbidden: ${errorData.error?.message || 'Check if Drive API is enabled in Cloud Console'}`);
    }

    if (searchRes.status === 401) {
      throw new Error('Authentication failed or token expired. Please sign in again.');
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

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderMetadata),
    });

    if (createRes.status === 403) {
      const errorData = await createRes.json();
      console.error('Google API 403 Forbidden Detail (Create):', errorData);
      throw new Error(`Google API Forbidden: ${errorData.error?.message || 'Check if Drive API is enabled'}`);
    }

    if (createRes.status === 401) {
      throw new Error('Authentication failed or token expired. Please sign in again.');
    }

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

  /**
   * Validates the provided token. If invalid or missing, attempts to get a valid one.
   */
  async ensureValidToken(token?: string | null): Promise<string> {
    const activeToken = token || (await this.getValidToken());
    if (!activeToken) {
      throw new Error('Authentication required. Please sign in to Google Drive.');
    }
    return activeToken;
  }

  async getValidToken(forceInteractive = false): Promise<string | null> {
// ...existing code...
    const cachedToken = localStorage.getItem(this.tokenKey);
    const expiresAt = Number(localStorage.getItem(this.expiryKey) || 0);

    const isTokenValid = cachedToken && Date.now() < expiresAt - 5 * 60 * 1000;

    if (isTokenValid && !forceInteractive) {
      return cachedToken;
    }

    return this.requestAuth(forceInteractive ? 'consent' : '');
  }

  async requestAuth(prompt: '' | 'consent' | 'select_account' = ''): Promise<string | null> {
    return new Promise((resolve, reject) => {
      try {
        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!client_id) {
          throw new Error('Google Client ID is not defined in environment variables.');
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

              // Resolve the token immediately so the UI can update without waiting for network calls
              resolve(response.access_token);

              // Handle folder creation in the background (fire-and-forget)
              this.ensureAppFolders(response.access_token).catch(folderErr => {
                console.warn('Background folder creation failed:', folderErr);
              });
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
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.expiryKey);
  }

  /* ==========================================================
     CRUD & QUERY OPERATIONS
     ========================================================== */

  async findBackupFile(token: string, fileName: string, parentFolderId = 'appDataFolder'): Promise<{ id: string; name: string } | null> {
    const query = encodeURIComponent(`name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error(`Failed to list Drive files: ${response.statusText}`);
    const result = await response.json();
    return result.files?.[0] || null;
  }

  /**
   * Retrieves the most recent BKP_ file in the folder sorted by creation time
   */
  async findLatestBackupFile(token: string, parentFolderId = 'appDataFolder'): Promise<{ id: string; name: string } | null> {
    const query = encodeURIComponent(`'${parentFolderId}' in parents and trashed = false and name contains 'BKP_'`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=1`,
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
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
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
     BACKUP & RESTORE WORKFLOWS
     ========================================================== */

  async exportBackupToDrive(token?: string, customFileName?: string): Promise<string> {
    const activeToken = token || (await this.getValidToken());
    if (!activeToken) throw new Error('No valid access token available.');

    const folders = await this.ensureAppFolders(activeToken);
    const backupFolderId = folders['Backups'] || 'appDataFolder';

    // Generate dynamic timestamp name if no override provided
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