import { createTheme, type Theme } from '@mui/material/styles';
import type { ThemeMode } from '@/hooks/useSettings';

declare module '@mui/material/styles' {
  interface SimplePaletteColorOptions {
    soft?: string;
  }
  interface PaletteColor {
    soft?: string;
  }
}

const buildTheme = (mode: 'light' | 'dark'): Theme => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#a78bfa' : '#6d28d9',
        light: isDark ? '#c4b5fd' : '#8b5cf6',
        dark: isDark ? '#7c3aed' : '#5b21b6',
        soft: isDark ? 'rgba(167, 139, 250, 0.12)' : 'rgba(109, 40, 217, 0.08)',
      },
      secondary: {
        main: isDark ? '#38bdf8' : '#0ea5e9',
        light: isDark ? '#7dd3fc' : '#38bdf8',
        dark: isDark ? '#0284c7' : '#0369a1',
        soft: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.08)',
      },
      success: {
        main: isDark ? '#34d399' : '#10b981',
        soft: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.08)',
      },
      error: {
        main: isDark ? '#f87171' : '#ef4444',
        soft: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      },
      warning: {
        main: isDark ? '#fbbf24' : '#f59e0b',
        soft: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(245, 158, 11, 0.08)',
      },
      info: {
        main: isDark ? '#60a5fa' : '#3b82f6',
        soft: isDark ? 'rgba(96, 165, 250, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      },
      background: {
        default: isDark ? '#0f172a' : '#f8fafc',
        paper: isDark ? '#1e293b' : '#ffffff',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
      ].join(','),
      h5: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 800, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      body1: { fontSize: '0.95rem' },
      body2: { fontSize: '0.85rem' },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#334155 #0f172a' : '#cbd5e1 #f8fafc',
            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? '#334155' : '#cbd5e1',
              borderRadius: '4px',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            paddingTop: 10,
            paddingBottom: 10,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            borderRadius: 18,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 14,
            '& fieldset': {
              borderColor: theme.palette.divider,
            },
          }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700,
          },
        },
      },
    },
  });
};

// Singleton theme instances to prevent re-creation during render cycles
const lightTheme = buildTheme('light');
const darkTheme = buildTheme('dark');

export const getAppTheme = (mode: ThemeMode): Theme => {
  const isSystemDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const resolvedMode = mode === 'system' ? (isSystemDark ? 'dark' : 'light') : mode;
  return resolvedMode === 'dark' ? darkTheme : lightTheme;
};