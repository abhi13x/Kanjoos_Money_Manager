import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Plus, Wallet } from 'lucide-react';
import { iOSFont } from '../features/accountHelpers';

const headerTitleSx = {
  fontWeight: 700,
  letterSpacing: '-0.5px',
  color: 'text.primary',
  fontSize: 34,
  lineHeight: '41px',
};

const addButtonSx = {
  borderRadius: '20px',
  fontWeight: 600,
  textTransform: 'none',
  px: 2,
  py: 0.75,
  fontSize: 15,
  bgcolor: '#007AFF',
  boxShadow: 'none',
  '&:hover': { bgcolor: '#0066CC', boxShadow: 'none' },
  ...iOSFont,
};

const netWorthCardSx = {
  p: 2,
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export interface AccountsHeaderProps {
  totalNetWorthCents: number;
  format: (cents: number) => string;
  onAddClick: () => void;
}

/** Page title, "Add" button, and the Total Net Balance summary card. */
export const AccountsHeader: React.FC<AccountsHeaderProps> = ({ totalNetWorthCents, format, onAddClick }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
      <Typography variant="h4" sx={headerTitleSx}>
        Accounts
      </Typography>
      <Button
        variant="contained"
        disableElevation
        startIcon={<Plus size={18} strokeWidth={2.5} />}
        onClick={onAddClick}
        sx={addButtonSx}
      >
        Add
      </Button>
    </Box>

    <Paper
      elevation={0}
      sx={{
        ...netWorthCardSx,
        bgcolor: alpha('#007AFF', 0.06),
        border: '1px solid',
        borderColor: alpha('#007AFF', 0.12),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: '#007AFF',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Wallet size={22} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#8E8E93' }}>
            Total Net Balance
          </Typography>
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: totalNetWorthCents < 0 ? '#FF3B30' : 'text.primary',
            }}
          >
            {format(totalNetWorthCents)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  </Box>
);
