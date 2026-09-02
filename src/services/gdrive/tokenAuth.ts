import type { TokenClient } from '../../types/google';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer

export interface GDriveTokenAuthConfig {
  tokenKey: string;
  expiryKey: string;
  connectedKey: string;
  scopes: string;
  /** Invoked right after a token is successfully obtained (interactive or silent). */
  onAuthenticated?: (token: string) => void;
}

/** Handles Google Identity Services OAuth token acquisition, caching, and silent renewal. */
export class GDriveTokenAuth {
  private tokenKey: string;
  private expiryKey: string;
  private connectedKey: string;
  private scopes: string;
  private onAuthenticated?: (token: string) => void;

  constructor(config: GDriveTokenAuthConfig) {
    this.tokenKey = config.tokenKey;
    this.expiryKey = config.expiryKey;
    this.connectedKey = config.connectedKey;
    this.scopes = config.scopes;
    this.onAuthenticated = config.onAuthenticated;
  }

  configure(config: Partial<Omit<GDriveTokenAuthConfig, 'onAuthenticated'>>): void {
    if (config.tokenKey) this.tokenKey = config.tokenKey;
    if (config.expiryKey) this.expiryKey = config.expiryKey;
    if (config.connectedKey) this.connectedKey = config.connectedKey;
    if (config.scopes) this.scopes = config.scopes;
  }

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
  hasValidAccessToken(): boolean {
    try {
      const cachedToken = localStorage.getItem(this.tokenKey);
      const expiresAt = Number(localStorage.getItem(this.expiryKey) || 0);
      return Boolean(cachedToken && Date.now() < expiresAt - TOKEN_EXPIRY_BUFFER_MS);
    } catch {
      return false;
    }
  }

  /**
   * True if the user has granted access before (even if the short-lived access
   * token has since expired). Used to decide whether a silent renewal is worth
   * attempting instead of requiring the user to sign in again from scratch.
   */
  hasStoredCredentials(): boolean {
    try {
      return localStorage.getItem(this.connectedKey) === 'true';
    } catch {
      return false;
    }
  }

  /** Current localStorage key names this module reads/writes. */
  getStorageKeys(): string[] {
    return [this.tokenKey, this.expiryKey, this.connectedKey];
  }

  async authenticate(): Promise<string | null> {
    // Force a fresh token, even if a cached one exists (user explicitly wants to reconnect)
    return this.requestAuth('select_account');
  }

  async getValidToken(forceInteractive = false): Promise<string | null> {
    if (this.hasValidAccessToken()) {
      try {
        return localStorage.getItem(this.tokenKey);
      } catch {
        return null;
      }
    }

    // Access tokens from Google Identity Services expire after ~1 hour with no refresh
    // token. If we were previously connected, try a silent (no-popup) renewal first so
    // the user isn't forced to re-login just because the app was closed for a while.
    if (this.hasStoredCredentials()) {
      try {
        const renewed = await this.requestAuth('');
        if (renewed) return renewed;
      } catch (err) {
        console.warn('Silent Google Drive token renewal failed:', err);
      }
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
            } catch {
              reject(new Error('Failed to store authentication token.'));
              return;
            }

            this.onAuthenticated?.(response.access_token);
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

  clearTokens(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.expiryKey);
      localStorage.removeItem(this.connectedKey);
    } catch (e) {
      console.warn('Failed to clear Google Drive tokens locally:', e);
    }
  }
}
