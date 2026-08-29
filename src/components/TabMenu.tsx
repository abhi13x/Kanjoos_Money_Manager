import React, { useCallback } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

export type DashboardView = 'daily' | 'weekly' | 'monthly' | 'calendar';

export interface TabConfig {
  key: DashboardView;
  label: string;
  disabled?: boolean;
}

export interface TabMenuProps {
  /** Currently active tab view */
  value: DashboardView;
  /** Callback triggered when a new tab is selected */
  onChange: (newValue: DashboardView) => void;
  /** Optional custom tabs configuration override */
  tabs?: readonly TabConfig[];
  /** Optional container style overrides */
  sx?: SxProps<Theme>;
  /** Disable interaction across all tabs */
  disabled?: boolean;
}

export const DEFAULT_TABS: readonly TabConfig[] = [
  { label: 'Daily', key: 'daily' },
  { label: 'Calendar', key: 'calendar' },
  { label: 'Weekly', key: 'weekly' },
  { label: 'Monthly', key: 'monthly' },
] as const;

/* ==========================================================
   ACCESSIBILITY HELPERS
   ========================================================== */

const getTabA11yProps = (key: DashboardView) => ({
  id: `dashboard-tab-${key}`,
  'aria-controls': `dashboard-tabpanel-${key}`,
});

/* ==========================================================
   COMPONENT IMPLEMENTATION
   ========================================================== */

export const TabMenu: React.FC<TabMenuProps> = React.memo(({
  value,
  onChange,
  tabs = DEFAULT_TABS,
  sx,
  disabled = false,
}) => {
  const theme = useTheme();

  const handleChange = useCallback(
    (_: React.SyntheticEvent, newValue: DashboardView) => {
      if (newValue && newValue !== value) {
        onChange(newValue);
      }
    },
    [onChange, value]
  );

  // Direct lookup avoids unnecessary object allocation for small arrays
  const isValueValid = tabs.some((tab) => tab.key === value);
  const safeValue = isValueValid ? value : tabs[0]?.key ?? 'daily';

  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Tabs
      value={safeValue}
      onChange={handleChange}
      variant="fullWidth"
      aria-label="Dashboard view navigation"
      slotProps={{
        indicator: {
          style: {
            height: 'calc(100% - 4px)',
            top: 2,
            borderRadius: '7px',
            backgroundColor: isDarkMode ? '#636366' : '#FFFFFF',
            boxShadow: isDarkMode
              ? '0 2px 6px rgba(0, 0, 0, 0.4)'
              : '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
            zIndex: 0,
          },
        },
      }}
      sx={{
        minHeight: 36,
        p: '2px',
        borderRadius: '9px',
        bgcolor: isDarkMode ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        ...sx,
      }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          label={tab.label}
          value={tab.key}
          disabled={disabled || tab.disabled}
          {...getTabA11yProps(tab.key)}
          sx={{
            minHeight: 32,
            py: 0.5,
            px: 1.5,
            zIndex: 1,
            fontWeight: 500,
            fontSize: { xs: '0.78125rem', sm: '0.8125rem' },
            letterSpacing: '-0.1px',
            textTransform: 'none', // iOS standard Title Case
            color: 'text.secondary',
            borderRadius: '7px',
            transition: 'color 0.2s ease',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'transparent',
            },
            '&.Mui-selected': {
              color: 'text.primary',
              fontWeight: 600,
            },
            '&.Mui-focusVisible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: '1px',
            },
          }}
        />
      ))}
    </Tabs>
  );
});

TabMenu.displayName = 'TabMenu';