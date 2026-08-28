import React, { useCallback, useMemo } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
  const handleChange = useCallback(
    (_: React.SyntheticEvent, newValue: DashboardView) => {
      if (newValue && newValue !== value) {
        onChange(newValue);
      }
    },
    [onChange, value]
  );

  const activeTabKeys = useMemo(
    () => new Set(tabs.map((tab) => tab.key)),
    [tabs]
  );

  // Fallback if current value is invalid or not found in configured tabs
  const safeValue = activeTabKeys.has(value) ? value : tabs[0]?.key ?? 'daily';

  return (
    <Tabs
      value={safeValue}
      onChange={handleChange}
      variant="fullWidth"
      aria-label="Dashboard view navigation"
      slotProps={{
        indicator: {
          style: { transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' },
        },
      }}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 48,
        pb: 'calc(env(safe-area-inset-bottom, 0px))',
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
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            minHeight: 48,
            py: 1.5,
            transition: (theme) =>
              theme.transitions.create(['color', 'font-weight', 'background-color'], {
                duration: theme.transitions.duration.short,
              }),
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
            '&.Mui-selected': {
              color: 'primary.main',
              fontWeight: 800,
            },
            '&.Mui-focusVisible': {
              bgcolor: 'action.focus',
              outline: (theme) => `2px solid ${theme.palette.primary.main}`,
              outlineOffset: '-2px',
            },
          }}
        />
      ))}
    </Tabs>
  );
});

TabMenu.displayName = 'TabMenu';