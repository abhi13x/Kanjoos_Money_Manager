import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

// Define the possible views based on user requirements and existing structure
export type DashboardView = 'daily' | 'weekly' | 'monthly' | 'calendar';

interface TabMenuProps {
  value: DashboardView;
  onChange: (newValue: DashboardView) => void;
}

/**
 * A tab menu component for switching between different transaction views.
 */
export const TabMenu: React.FC<TabMenuProps> = ({ value, onChange }) => {
  const tabs: { label: string; key: DashboardView }[] = [
    { label: 'Daily', key: 'daily' },
    { label: 'Calendar', key: 'calendar' },
    { label: 'Weekly', key: 'weekly' },
    { label: 'Monthly', key: 'monthly' },
  ];

  return (
    <Tabs 
      value={value} 
      onChange={(_, newValue: DashboardView) => {
        //  Fixed: Changed 'event' to '_' to satisfy strict TS6133 parameters
        onChange(newValue);
      }}
      variant="fullWidth" //  Stretches the tabs evenly across the screen
      aria-label="Dashboard view tabs"
      sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
      }} 
    >
      {tabs.map((tab) => (
        <Tab 
          key={tab.key} 
          label={tab.label} 
          value={tab.key} 
          sx={{
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'uppercase', 
            color: 'text.secondary', //  Fixed: Ensures clear visibility in dark mode
            transition: 'color 0.2s ease',
            '&.Mui-selected': {
              color: 'primary.main', // Highlight color when selected
              fontWeight: 800,
            }
          }}
        />
      ))}
    </Tabs>
  );
};