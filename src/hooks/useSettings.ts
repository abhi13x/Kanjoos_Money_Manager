import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEYS = {
  CURRENCY: 'app_default_currency',
  THEME: 'app_theme_mode',
  USERNAME: 'app_username',
} as const;

export const useSettings = () => {
  // 1. Currency State
  const [defaultCurrency, setDefaultCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'INR';
    }
    return 'INR';
  });

  // 2. Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || 'system';
    }
    return 'system';
  });

  // 3. Username State
  const [username, setUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.USERNAME) || 'User';
    }
    return 'User';
  });

  // Setter functions with immediate persistence and custom event dispatching
  const updateDefaultCurrency = (currency: string) => {
    const upperCurrency = currency.toUpperCase();
    setDefaultCurrency(upperCurrency);
    localStorage.setItem(STORAGE_KEYS.CURRENCY, upperCurrency);
    window.dispatchEvent(new Event('app_settings_updated'));
  };

  const updateThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(STORAGE_KEYS.THEME, mode);
    window.dispatchEvent(new Event('app_settings_updated'));
  };

  const updateUsername = (newName: string) => {
    setUsername(newName);
    localStorage.setItem(STORAGE_KEYS.USERNAME, newName);
    window.dispatchEvent(new Event('app_settings_updated'));
  };

  // Sync state changes across all components and tabs instantaneously
  useEffect(() => {
    const handleSync = () => {
      if (typeof window !== 'undefined') {
        const storedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY);
        const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode;
        const storedUsername = localStorage.getItem(STORAGE_KEYS.USERNAME);

        if (storedCurrency) setDefaultCurrency(storedCurrency);
        if (storedTheme) setThemeMode(storedTheme);
        if (storedUsername !== null) setUsername(storedUsername);
      }
    };

    window.addEventListener('app_settings_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('app_settings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Theme application logic
  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      if (themeMode === 'dark') {
        root.classList.add('dark');
      } else if (themeMode === 'light') {
        root.classList.add('light');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isDark ? 'dark' : 'light');
      }
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode]);

  return {
    defaultCurrency,
    updateDefaultCurrency,
    themeMode,
    updateThemeMode,
    username,
    updateUsername,
  };
};