import React from 'react';
import { Paper, Tabs, Tab } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TabSelectorProps {
  activeTab: 'expense' | 'income';
  setActiveTab: (tab: 'expense' | 'income') => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({ 
  activeTab, 
  setActiveTab 
}) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        borderRadius: '16px', 
        bgcolor: 'action.hover', 
        p: 0.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        variant="fullWidth"
        textColor="inherit"
        sx={{
          minHeight: 40,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTabs-flexContainer': { gap: 0.5 }
        }}
      >
        <Tab
          disableRipple
          value="expense"
          label="Expenses"
          icon={<TrendingDown size={16} />}
          iconPosition="start"
          sx={{
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'none',
            minHeight: 40,
            py: 1,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'error.main',
              bgcolor: 'background.paper',
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
            },
            '&:hover:not(.Mui-selected)': {
              bgcolor: 'action.selected',
              color: 'text.primary',
            }
          }}
        />
        <Tab
          disableRipple
          value="income"
          label="Income"
          icon={<TrendingUp size={16} />}
          iconPosition="start"
          sx={{
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'none',
            minHeight: 40,
            py: 1,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'success.main',
              bgcolor: 'background.paper',
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
            },
            '&:hover:not(.Mui-selected)': {
              bgcolor: 'action.selected',
              color: 'text.primary',
            }
          }}
        />
      </Tabs>
    </Paper>
  );
};

export default TabSelector;