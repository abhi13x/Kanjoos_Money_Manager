export interface TokenResponse {
  access_token: string;
  expires_in: string;
  hd?: string;
  prompt: string;
  token_type: string;
  scope: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface OverridableTokenClientConfig {
  prompt?: 'none' | 'consent' | 'select_account' | string;
  scope?: string;
  state?: string;
}

export interface TokenClientConfig extends OverridableTokenClientConfig {
  client_id: string;
  scope: string;
  callback?: (response: TokenResponse) => void;
  error_callback?: (error: { message: string; stack?: string }) => void;
  hint?: string;
  hosted_domain?: string;
}

export interface TokenClient {
  requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (accessToken: string, done?: () => void) => void;
        };
      };
    };
  }
}

export {};