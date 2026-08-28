import type { FC } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

// Number/currency formatting helper
const format = (amount: number) =>
  (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const GroupTitle: FC<{ groupTitle: string }> = ({ groupTitle }) => {
  return (
    <Typography
      variant="subtitle2"
      sx={(theme) => ({
        fontWeight: 800,
        fontSize: 'clamp(0.85rem, 0.8rem + 0.3vw, 1rem)',
        color: theme.vars?.palette.text.primary ?? 'text.primary',
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap',
      })}
    >
      {groupTitle}
    </Typography>
  );
};

const TotalIncome: FC<{ totalIncome: number }> = ({ totalIncome }) => {
  return (
    <Chip
      label={`Income: ${format(totalIncome)}`}
      size="small"
      sx={(theme) => ({
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 24,
        bgcolor: theme.vars?.palette.success[50] ?? 'success.50',
        color: theme.vars?.palette.success.main ?? 'success.main',
        border: '1px solid',
        borderColor: theme.vars?.palette.success[200] ?? 'success.200',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      })}
    />
  );
};

const TotalExpense: FC<{ totalExpense: number }> = ({ totalExpense }) => {
  return (
    <Chip
      label={`Expense: ${format(totalExpense)}`}
      size="small"
      sx={(theme) => ({
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 24,
        bgcolor: theme.vars?.palette.error[50] ?? 'error.50',
        color: theme.vars?.palette.error.main ?? 'error.main',
        border: '1px solid',
        borderColor: theme.vars?.palette.error[200] ?? 'error.200',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      })}
    />
  );
};

const NetCents: FC<{ netCents: number }> = ({ netCents }) => {
  const isPositive = netCents > 0;
  return (
    <Chip
      label={`Net: ${isPositive ? '+' : ''}${format(netCents)}`}
      size="small"
      sx={(theme) => ({
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 24,
        bgcolor: isPositive
          ? theme.vars?.palette.success[50] ?? 'success.50'
          : theme.vars?.palette.error[50] ?? 'error.50',
        color: isPositive
          ? theme.vars?.palette.success.main ?? 'success.main'
          : theme.vars?.palette.error.main ?? 'error.main',
        border: '1px solid',
        borderColor: isPositive
          ? theme.vars?.palette.success[200] ?? 'success.200'
          : theme.vars?.palette.error[200] ?? 'error.200',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      })}
    />
  );
};

export const GroupTotalAndTitle: FC<{
  groupTitle: string;
  totalIncome: number;
  totalExpense: number;
  netCents: number;
}> = ({ groupTitle, totalIncome, totalExpense, netCents }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 1,
        mb: 1.25,
        mt: 2,
        px: 0.5,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <GroupTitle groupTitle={groupTitle} />

      {/* Horizontally scrollable chip container on narrow screens */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.75,
          alignItems: 'center',
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          pb: 0.25, // prevents shadow/border clipping on scroll
          '&::-webkit-scrollbar': { display: 'none' }, // clean look on iOS Safari
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {totalIncome !== 0 && <TotalIncome totalIncome={totalIncome} />}
        {totalExpense !== 0 && <TotalExpense totalExpense={totalExpense} />}
        {netCents !== 0 && <NetCents netCents={netCents} />}
      </Box>
    </Box>
  );
};