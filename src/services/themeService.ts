import { createTheme } from '@mui/material/styles';
import type { ThemeMode } from '@/hooks/useSettings';

export const getAppTheme = (mode: ThemeMode) => {
  // Map 'system' to actual light/dark based on browser preference
  const resolvedMode = mode === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
    : mode;

  return createTheme({
    palette: {
      mode: resolvedMode as 'light' | 'dark',
      primary: {
        main: resolvedMode === 'dark' ? '#a78bfa' : '#6d28d9',
      },
      secondary: {
        main: resolvedMode === 'dark' ? '#38bdf8' : '#0ea5e9',
      },
      background: {
        default: resolvedMode === 'dark' ? '#16171d' : '#fafafa',
        paper: resolvedMode === 'dark' ? '#1e1f26' : '#ffffff',
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
          },
        },
      },
    },
  });
};