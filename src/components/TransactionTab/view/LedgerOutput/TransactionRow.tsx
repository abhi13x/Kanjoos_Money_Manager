/*
* Transaction / Period Row Component
* Renders individual transactions in 'daily' mode, or a Month/Year header with stacked Income, 
* Expense, and Net rows in 'monthly' / 'yearly' mode.
*/
import React from 'react';
import { Box, Typography, IconButton, Chip, Avatar } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft,
  Repeat, Edit2, TrendingUp, TrendingDown, Scale
} from 'lucide-react';
import type { Transaction, Account } from '@/db/schema';

const SIZES = {
  avatar: 44,
  avatarIconRatio: 0.5,
  actionBtn: 36,
  actionIconRatio: 0.5,
  borderRadiusRatio: 0.3,
};

export type ViewMode = 'daily' | 'monthly' | 'yearly';

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
}

export interface TransactionRowProps {
  tx?: Transaction;
  accounts?: Account[];
  getCategoryName?: (tx: Transaction) => string;
  format: (v: number) => string;
  onDelete?: () => void;
  onEdit?: () => void;
  viewMode?: ViewMode;
  periodLabel?: string; // e.g. "August 2026" or "2026"
  totals?: PeriodTotals;
}

const getVisualTypeConfig = (type: Transaction['type']) => {
  const iconSize = Math.round(SIZES.avatar * SIZES.avatarIconRatio);

  switch (type) {
    case 'income':
      return {
        color: 'success.main',
        bgColor: (theme: any) => alpha(theme.palette.success.main, 0.14),
        borderColor: (theme: any) => alpha(theme.palette.success.main, 0.24),
        icon: <ArrowDownLeft size={iconSize} />,
        sign: '+'
      };
    case 'expense':
      return {
        color: 'error.main',
        bgColor: (theme: any) => alpha(theme.palette.error.main, 0.14),
        borderColor: (theme: any) => alpha(theme.palette.error.main, 0.24),
        icon: <ArrowUpRight size={iconSize} />,
        sign: '-'
      };
    case 'transfer':
    default:
      return {
        color: 'info.main',
        bgColor: (theme: any) => alpha(theme.palette.info.main, 0.14),
        borderColor: (theme: any) => alpha(theme.palette.info.main, 0.24),
        icon: <ArrowRightLeft size={iconSize} />,
        sign: ''
      };
  }
};

export const TransactionRow: React.FC<TransactionRowProps> = ({
  tx,
  accounts = [],
  getCategoryName,
  format,
  onDelete,
  onEdit,
  viewMode = 'daily',
  periodLabel,
  totals,
}) => {
  const actionIconSize = Math.round(SIZES.actionBtn * SIZES.actionIconRatio);

  /* --- MONTHLY / YEARLY VIEW --- */
  if ((viewMode === 'monthly' || viewMode === 'yearly') && totals) {
    const isNetPositive = totals.net >= 0;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header: <Month/Year> */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'text.primary',
            pb: 0.5,
            borderBottom: '1px solid',
            borderColor: (theme) => alpha(theme.palette.divider, 0.6)
          }}
        >
          {periodLabel || 'Period Summary'}
        </Typography>

        {/* <row1 Income> */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: 1.5,
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1)
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}>
              <TrendingUp size={18} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Income
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main', fontSize: '0.95rem' }}>
            + {format(Math.abs(totals.income))}
          </Typography>
        </Box>

        {/* <row2 Expense> */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: 1.5,
            bgcolor: (theme) => alpha(theme.palette.error.main, 0.1)
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: 'error.main', display: 'flex', alignItems: 'center' }}>
              <TrendingDown size={18} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Expense
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.95rem' }}>
            - {format(Math.abs(totals.expense))}
          </Typography>
        </Box>

        {/* <row3 Net> */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              alpha(isNetPositive ? theme.palette.success.main : theme.palette.error.main, 0.1)
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                color: isNetPositive ? 'success.main' : 'error.main',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Scale size={18} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Net
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              color: isNetPositive ? 'success.main' : 'error.main',
              fontSize: '0.95rem'
            }}
          >
            {isNetPositive ? '+' : ''} {format(totals.net)}
          </Typography>
        </Box>
      </Box>
    );
  }

  /* --- DAILY VIEW (Single Transaction) --- */
  if (!tx) return null;

  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
  const typeConfig = getVisualTypeConfig(tx.type);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: 2,
        borderRadius: 2,
        transition: 'background-color 0.2s ease-in-out',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': { bgcolor: (theme) => alpha(theme.palette.action.hover, 0.08) }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: typeConfig.bgColor,
            color: typeConfig.color,
            width: SIZES.avatar,
            height: SIZES.avatar,
            borderRadius: `${Math.round(SIZES.avatar * SIZES.borderRadiusRatio)}px`,
            border: '1px solid',
            borderColor: typeConfig.borderColor,
            flexShrink: 0,
            '& svg': { color: 'currentColor' }
          }}
        >
          {typeConfig.icon}
        </Avatar>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0, flexGrow: 1 }}>
          {tx.note && (
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.25,
                color: 'text.primary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {tx.note}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 800,
              color: typeConfig.color,
              fontSize: '1.05rem',
              lineHeight: 1.2
            }}
          >
            {typeConfig.sign} {format(tx.amount)}
          </Typography>
        </Box>
      </Box>

      {/* Account / Category & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, minWidth: 0, flexGrow: 1 }}>
          {tx.type === 'transfer' && account && toAccount ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {account.name} ➔ {toAccount.name}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {account?.name || 'Unknown Account'}
              </Typography>
              <Box component="span" sx={{ color: 'text.disabled', mx: 0.75 }}>
                •
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {getCategoryName ? getCategoryName(tx) : ''}
              </Typography>
            </Box>
          )}

          {tx.isRecurring && (
            <Chip
              icon={<Repeat size={10} />}
              label={tx.repeatInterval}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize', ml: 0.5 }}
            />
          )}
        </Box>

        {(onEdit || onDelete) && (
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {onEdit && (
              <IconButton size="small" onClick={onEdit} aria-label="edit">
                <Edit2 size={actionIconSize} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton size="small" onClick={onDelete} aria-label="delete">
                <Trash2 size={actionIconSize} />
              </IconButton>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};