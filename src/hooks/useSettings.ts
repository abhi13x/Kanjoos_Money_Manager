import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  /** Default ISO currency code (e.g., 'INR', 'USD') */
  defaultCurrency: string;
  /** Active theme preference */
  themeMode: ThemeMode;
  /** Display username */
  username: string;
}

export interface UseSettingsReturn extends AppSettings {
  /** Update the default currency and sync state globally */
  updateDefaultCurrency: (currency: string) => void;
  /** Update the theme mode and sync state globally */
  updateThemeMode: (mode: ThemeMode) => void;
  /** Update the username and sync state globally */
  updateUsername: (newName: string) => void;
  /** Reset all settings back to default values */
  resetSettings: () => void;
}

export const STORAGE_KEYS = {
  CURRENCY: 'app_default_currency',
  THEME: 'app_theme_mode',
  USERNAME: 'app_username',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'INR',
  themeMode: 'system',
  username: 'User',
};

const EVENT_CUSTOM_SETTINGS_UPDATE = 'app_settings_updated';

/* ==========================================================
   SAFE STORAGE HELPERS (SSR & PRIVATE BROWSING SAFE)
   ========================================================== */

const safeGetItem = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.warn(`[useSettings] Failed to read key "${key}" from localStorage:`, error);
    return fallback;
  }
};

const safeSetItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(EVENT_CUSTOM_SETTINGS_UPDATE));
  } catch (error) {
    console.warn(`[useSettings] Failed to write key "${key}" to localStorage:`, error);
  }
};

const isThemeMode = (value: string): value is ThemeMode => {
  return ['light', 'dark', 'system'].includes(value);
};

/* ==========================================================
   HOOK IMPLEMENTATION
   ========================================================== */

/**
 * Custom hook for managing application settings with reactive local storage sync,
 * automatic dark mode DOM updates, and multi-tab state management.
 */
export const useSettings = (): UseSettingsReturn => {
  const [defaultCurrency, setDefaultCurrency] = useState<string>(() =>
    safeGetItem(STORAGE_KEYS.CURRENCY, DEFAULT_SETTINGS.defaultCurrency)
  );

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const rawTheme = safeGetItem(STORAGE_KEYS.THEME, DEFAULT_SETTINGS.themeMode);
    return isThemeMode(rawTheme) ? rawTheme : DEFAULT_SETTINGS.themeMode;
  });

  const [username, setUsername] = useState<string>(() =>
    safeGetItem(STORAGE_KEYS.USERNAME, DEFAULT_SETTINGS.username)
  );

  /* ==========================================================
     SETTERS (MEMOIZED WITH USECALLBACK)
     ========================================================== */

  const updateDefaultCurrency = useCallback((currency: string) => {
    const formatted = currency.trim().toUpperCase() || DEFAULT_SETTINGS.defaultCurrency;
    setDefaultCurrency(formatted);
    safeSetItem(STORAGE_KEYS.CURRENCY, formatted);
  }, []);

  const updateThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    safeSetItem(STORAGE_KEYS.THEME, mode);
  }, []);

  const updateUsername = useCallback((newName: string) => {
    const formatted = newName.trim() || DEFAULT_SETTINGS.username;
    setUsername(formatted);
    safeSetItem(STORAGE_KEYS.USERNAME, formatted);
  }, []);

  const resetSettings = useCallback(() => {
    updateDefaultCurrency(DEFAULT_SETTINGS.defaultCurrency);
    updateThemeMode(DEFAULT_SETTINGS.themeMode);
    updateUsername(DEFAULT_SETTINGS.username);
  }, [updateDefaultCurrency, updateThemeMode, updateUsername]);

  /* ==========================================================
     EVENT SYNCHRONIZATION (SAME-TAB & CROSS-TAB)
     ========================================================== */

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSettingsFromStorage = () => {
      const storedCurrency = safeGetItem(STORAGE_KEYS.CURRENCY, DEFAULT_SETTINGS.defaultCurrency);
      const rawTheme = safeGetItem(STORAGE_KEYS.THEME, DEFAULT_SETTINGS.themeMode);
      const storedTheme = isThemeMode(rawTheme) ? rawTheme : DEFAULT_SETTINGS.themeMode;
      const storedUsername = safeGetItem(STORAGE_KEYS.USERNAME, DEFAULT_SETTINGS.username);

      setDefaultCurrency(storedCurrency);
      setThemeMode(storedTheme);
      setUsername(storedUsername);
    };

    window.addEventListener(EVENT_CUSTOM_SETTINGS_UPDATE, syncSettingsFromStorage);
    window.addEventListener('storage', syncSettingsFromStorage);

    return () => {
      window.removeEventListener(EVENT_CUSTOM_SETTINGS_UPDATE, syncSettingsFromStorage);
      window.removeEventListener('storage', syncSettingsFromStorage);
    };
  }, []);

  /* ==========================================================
     AUTOMATIC THEME APPLICATION & DOM MANAGEMENT
     ========================================================== */

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    const applyTheme = (isDarkSystem: boolean) => {
      root.classList.remove('light', 'dark');

      if (themeMode === 'dark') {
        root.classList.add('dark');
      } else if (themeMode === 'light') {
        root.classList.add('light');
      } else {
        root.classList.add(isDarkSystem ? 'dark' : 'light');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mediaQuery.matches);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        applyTheme(event.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode]);

  return {
    defaultCurrency,
    updateDefaultCurrency,
    themeMode,
    updateThemeMode,
    username,
    updateUsername,
    resetSettings,
  };
};