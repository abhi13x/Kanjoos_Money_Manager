import React from 'react';
import {
  Box,
  Typography,
  MenuItem,
  TextField,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha,
} from '@mui/material';
import { Filter } from 'lucide-react';
import type { SortedCategoryOption } from '../features/CategoryManager';

interface DashboardControlHeaderProps {
  groupBy: 'month' | 'year';
  onGroupByChange: (val: 'month' | 'year') => void;
  effectivePeriod: string;
  onEffectivePeriodChange: (val: string) => void;
  availablePeriods: string[];
  statType: 'expense' | 'income';
  handleStatTypeChange: (val: 'expense' | 'income') => void;
  selectedCategory: string | number;
  setSelectedCategory: (val: string) => void;
  sortedCategoryOptions: SortedCategoryOption[];
}

export const DashboardControlHeader: React.FC<DashboardControlHeaderProps> = ({
  groupBy,
  onGroupByChange,
  effectivePeriod,
  onEffectivePeriodChange,
  availablePeriods,
  statType,
  handleStatTypeChange,
  selectedCategory,
  setSelectedCategory,
  sortedCategoryOptions,
}) => {
  const theme = useTheme();

  // MUI v9 Menu slot configuration
  const menuSlotConfig = {
    slotProps: {
      paper: {
        sx: {
          borderRadius: '12px',
          maxHeight: 300,
          boxShadow: theme.shadows[4],
          '& .MuiMenuItem-root': {
            fontSize: '0.85rem',
            py: 1,
          },
        },
      },
    },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: '18px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        paddingTop: `calc(16px + env(safe-area-inset-top, 0px))`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
        }}
      >
        <Typography
          component="div"
          variant="h6"
          sx={{
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            fontSize: '1.1rem',
            color: 'text.primary',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 0.75,
              borderRadius: '10px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            <Filter size={20} />
          </Box>
          Analytics Dashboard
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <ToggleButtonGroup
            size="small"
            value={groupBy}
            exclusive
            onChange={(_, val) => val && onGroupByChange(val)}
            sx={{
              height: 40,
              bgcolor: alpha(theme.palette.action.hover, 0.05),
              borderRadius: '12px',
              p: '3px',
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '9px',
                px: 2,
                fontWeight: 700,
                fontSize: '0.75rem',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  '&:hover': {
                    bgcolor: 'background.paper',
                  },
                },
              },
            }}
          >
            <ToggleButton value="month">MONTH</ToggleButton>
            <ToggleButton value="year">YEAR</ToggleButton>
          </ToggleButtonGroup>

          {/* Time Horizon Select */}
          <TextField
            select
            size="small"
            label="Time Horizon"
            value={effectivePeriod}
            onChange={(e) => onEffectivePeriodChange(e.target.value)}
            sx={{
              flex: { xs: 1, sm: 'initial' },
              minWidth: { xs: '100%', sm: '150px' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.85rem',
              },
            }}
            slotProps={{
              select: {
                MenuProps: menuSlotConfig,
              },
            }}
          >
            <MenuItem value="all" sx={{ fontWeight: 600 }}>
              All {groupBy === 'month' ? 'Months' : 'Years'}
            </MenuItem>
            {availablePeriods.map((pKey) => {
              let display = pKey;
              if (groupBy === 'month') {
                const [y, m] = pKey.split('-');
                display = `${new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', {
                  month: 'short',
                })} ${y}`;
              }
              return (
                <MenuItem key={pKey} value={pKey}>
                  {display}
                </MenuItem>
              );
            })}
          </TextField>

          {/* Stat Type Select */}
          <TextField
            select
            size="small"
            label="Type"
            value={statType}
            onChange={(e) => handleStatTypeChange(e.target.value as 'expense' | 'income')}
            sx={{
              flex: { xs: 1, sm: 'initial' },
              minWidth: { xs: 'calc(50% - 6px)', sm: '120px' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.85rem',
              },
            }}
            slotProps={{
              select: {
                MenuProps: menuSlotConfig,
              },
            }}
          >
            <MenuItem value="expense" sx={{ fontWeight: 600 }}>
              Expense
            </MenuItem>
            <MenuItem value="income" sx={{ fontWeight: 600 }}>
              Income
            </MenuItem>
          </TextField>

          {/* Category Select */}
          <TextField
            select
            size="small"
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{
              flex: { xs: 1, sm: 'initial' },
              minWidth: { xs: '100%', sm: '200px' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.85rem',
              },
            }}
            slotProps={{
              select: {
                MenuProps: menuSlotConfig,
              },
            }}
          >
            <MenuItem value="all" sx={{ fontWeight: 700 }}>
              All Categories
            </MenuItem>
            {sortedCategoryOptions.map((cat) => (
              <MenuItem
                key={cat.id}
                value={cat.id}
                sx={
                  cat.isSub
                    ? { pl: 3.5, fontSize: '0.85rem', color: 'text.secondary' }
                    : { fontWeight: 700 }
                }
              >
                {cat.isSub ? `↳ ${cat.label}` : cat.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
    </Paper>
  );
};