import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import type { FC } from 'react';

interface ViewTogglesProps {
  value: number;
  onChange: (value: number) => void;
}

export const ViewToggles: FC<ViewTogglesProps> = ({ value, onChange }) => {
  /*
   * View Toggles Component
   * Controls transaction view mode (Daily/Monthly/Yearly)
   */
  return (
    <AppBar position="static" sx={{ 
      bgcolor: 'background.paper', 
      borderBottom: '1px solid', 
      borderColor: 'divider', 
      WebkitTapHighlightColor: 'transparent !important' 
      }}>
        <Tabs
          value={value}
          onChange={(_, newValue) => { onChange(newValue); }}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="view mode tabs example"
          sx={{ WebkitTapHighlightColor: 'transparent !important' }}
          >
            <Tab label="Daily" value={0} sx={{ WebkitTapHighlightColor: 'transparent !important' }} />
            <Tab label="Monthly" value={1} sx={{ WebkitTapHighlightColor: 'transparent !important' }} />
            <Tab label="Yearly" value={2} sx={{ WebkitTapHighlightColor: 'transparent !important' }} />
        </Tabs>
      </AppBar>
  );
};