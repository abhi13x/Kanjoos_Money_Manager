import React, { memo, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Trash2, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { Transaction, Account, Category } from '@/db/schema';

export type ViewMode = 'daily' | 'monthly' | 'yearly';

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
}

export interface TransactionHeaderProps {
  title: string;
  totals?: PeriodTotals;
  format: (v: number) => string;
}

export interface TransactionRowProps {
  tx?: Transaction;
  accounts?: Account[];
  categories?: Category[];
  getCategoryName?: (tx: Transaction) => string;
  format: (v: number) => string;
  onDelete?: () => void;
  onEdit?: () => void;
  viewMode?: ViewMode;
  periodLabel?: string;
  totals?: PeriodTotals;
  isLast?: boolean;
}

// iOS Native System Palette
const IOS_COLORS = {
  income: '#34C759', // Green
  expense: '#FF3B30', // Red
  accent: '#007AFF', // Blue
};

const DELETE_ACTION_WIDTH = 76;

const parseCategories = (tx: Transaction, fallbackCategoryName: string) => {
  if (tx.type === 'transfer') {
    return { parentCategory: 'Transfer', childCategory: '' };
  }

  const delimiter = ['/', '>', ':', '|'].find((d) => fallbackCategoryName.includes(d));
  if (delimiter) {
    const parts = fallbackCategoryName.split(delimiter);
    return {
      parentCategory: parts[0].trim(),
      childCategory: parts.slice(1).join(delimiter).trim(),
    };
  }

  return { parentCategory: fallbackCategoryName, childCategory: '' };
};

const formatAccountLabel = (tx: Transaction, account?: Account, toAccount?: Account | null) => {
  const accountName =
    tx.type === 'transfer' && account && toAccount
      ? `${account.name} ➔ ${toAccount.name}`
      : account?.name || 'Unknown Account';

  return tx.isRecurring ? `${accountName} (${tx.repeatInterval || 'Every Month'})` : accountName;
};

/**
 * Rounded Date Header Box
 */
export const TransactionHeader: React.FC<TransactionHeaderProps> = memo(({ title, totals, format }) => {
  if (!totals) return null;

  const isNetPositive = totals.net >= 0;

  return (
    <Box
      sx={{
        p: 2,
        mt: 2,
        mb: 1.25,
        borderRadius: '16px', // Rounded Header Card Box
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.divider, 0.18),
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
        overflow: 'hidden',
      }}
    >
      {/* Top Line: Date Header */}
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: '1rem',
          color: 'text.primary',
          letterSpacing: '-0.01em',
          mb: 1.25,
        }}
      >
        {title}
      </Typography>

      {/* Bottom Line: Totals Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          {/* Income Total */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <TrendingUp size={15} color={IOS_COLORS.accent} />
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: IOS_COLORS.accent,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              +{format(totals.income)}
            </Typography>
          </Box>

          {/* Expense Total */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <TrendingDown size={15} color={IOS_COLORS.expense} />
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: IOS_COLORS.expense,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              -{format(Math.abs(totals.expense))}
            </Typography>
          </Box>
        </Box>

        {/* Net Total Badge Pill */}
        <Box
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: '8px',
            bgcolor: alpha(
              isNetPositive ? IOS_COLORS.accent : IOS_COLORS.expense,
              0.18
            ),
          }}
        >
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: isNetPositive ? IOS_COLORS.accent : IOS_COLORS.expense,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isNetPositive ? '+' : ''}
            {format(totals.net)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

TransactionHeader.displayName = 'TransactionHeader';

/**
 * Strictly Aligned iOS Transaction Row
 */
export const TransactionRow: React.FC<TransactionRowProps> = memo(({
  tx,
  accounts = [],
  getCategoryName,
  format,
  onDelete,
  onEdit,
  viewMode = 'daily',
  periodLabel,
  totals,
  isLast = false,
}) => {
  const theme = useTheme();

  // Touch Swipe State
  const [translateX, setTranslateX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const currentTranslateRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onDelete) return;
    touchStartXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !onDelete) return;

    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartXRef.current;
    const baseOffset = currentTranslateRef.current < 0 ? -DELETE_ACTION_WIDTH : 0;

    const newOffset = Math.min(0, Math.max(-DELETE_ACTION_WIDTH - 20, baseOffset + diffX));
    setTranslateX(newOffset);
  };

  const handleTouchEnd = () => {
    if (!onDelete) return;

    setIsDragging(false);
    touchStartXRef.current = null;

    if (translateX < -DELETE_ACTION_WIDTH / 2) {
      setTranslateX(-DELETE_ACTION_WIDTH);
      currentTranslateRef.current = -DELETE_ACTION_WIDTH;
    } else {
      setTranslateX(0);
      currentTranslateRef.current = 0;
    }
  };

  const handleRowClick = () => {
    if (translateX < 0) {
      setTranslateX(0);
      currentTranslateRef.current = 0;
      return;
    }
    onEdit?.();
  };

  // Period Summary View (Monthly / Yearly)
  if ((viewMode === 'monthly' || viewMode === 'yearly') && totals) {
    const isNetPositive = totals.net >= 0;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          p: 2,
          borderRadius: '16px',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.divider, 0.3),
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: 'text.primary',
            pb: 0.75,
            borderBottom: '1px solid',
            borderColor: (t) => alpha(t.palette.divider, 0.3),
            letterSpacing: '-0.01em',
          }}
        >
          {periodLabel || 'Period Summary'}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: '10px',
            bgcolor: alpha(IOS_COLORS.income, 0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={18} color={IOS_COLORS.income} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Income
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: IOS_COLORS.income,
              fontSize: '0.9375rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            + {format(Math.abs(totals.income))}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: '10px',
            bgcolor: alpha(IOS_COLORS.expense, 0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDown size={18} color={IOS_COLORS.expense} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Expense
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: IOS_COLORS.expense,
              fontSize: '0.9375rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            - {format(Math.abs(totals.expense))}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: '10px',
            bgcolor: alpha(isNetPositive ? IOS_COLORS.income : IOS_COLORS.expense, 0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Scale
              size={18}
              color={isNetPositive ? IOS_COLORS.income : IOS_COLORS.expense}
            />
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Net
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: isNetPositive ? IOS_COLORS.income : IOS_COLORS.expense,
              fontSize: '0.9375rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isNetPositive ? '+' : ''} {format(totals.net)}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!tx) return null;

  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
  const categoryName = getCategoryName ? getCategoryName(tx) : 'Uncategorized';

  const { parentCategory, childCategory } = parseCategories(tx, categoryName);
  const accountFormatted = formatAccountLabel(tx, account, toAccount);

  const amountColor =
    tx.type === 'income'
      ? IOS_COLORS.income
      : tx.type === 'expense'
      ? IOS_COLORS.expense
      : theme.palette.text.primary;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
      {/* Revealed Delete Action */}
      {onDelete && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setTranslateX(0);
            currentTranslateRef.current = 0;
          }}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: DELETE_ACTION_WIDTH,
            bgcolor: IOS_COLORS.expense,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1,
            userSelect: 'none',
            '&:active': { filter: 'brightness(0.9)' },
          }}
        >
          <Trash2 size={20} color="#ffffff" />
        </Box>
      )}

      {/* Row Foreground with Strict 3-Column Grid */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
        sx={{
          position: 'relative' as const,
          zIndex: 2,
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'grid',
          // Strictly locks Column 1 to 120px, Column 2 to remaining space, Column 3 to 90px
          gridTemplateColumns: '120px 1fr 90px',
          alignItems: 'center',
          columnGap: 1.5,
          px: 2,
          py: 1.25,
          minHeight: 52,
          bgcolor: 'background.paper',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          cursor: 'pointer',
          userSelect: 'none',

          // Inset Divider Line
          ...(!isLast && {
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 16,
              right: 0,
              height: '1px',
              backgroundColor: alpha(theme.palette.divider, 0.3),
            },
          }),
          '&:active': {
            bgcolor: (t) => alpha(t.palette.action.active, 0.05),
          },
        }}
      >
        {/* Column 1: Category (Fixed Width: 120px) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: '0.8125rem',
              lineHeight: 1.3,
              color: 'text.primary',
              letterSpacing: '-0.005em',
            }}
          >
            {parentCategory}
          </Typography>

          {childCategory ? (
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                fontSize: '0.75rem',
                lineHeight: 1.2,
                color: 'text.secondary',
                mt: 0.2,
              }}
            >
              {childCategory}
            </Typography>
          ) : null}
        </Box>

        {/* Column 2: Note & Account (Flexible Width) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {tx.note ? (
            <>
              <Typography
                noWrap
                sx={{
                  fontWeight: 400,
                  fontSize: '0.8125rem',
                  lineHeight: 1.3,
                  color: 'text.primary',
                  letterSpacing: '-0.01em',
                }}
              >
                {tx.note}
              </Typography>
              <Typography
                noWrap
                sx={{
                  fontWeight: 400,
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  color: 'text.secondary',
                  mt: 0.2,
                }}
              >
                {accountFormatted}
              </Typography>
            </>
          ) : (
            <Typography
              noWrap
              sx={{
                fontWeight: 400,
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                color: 'text.secondary',
                letterSpacing: '-0.01em',
              }}
            >
              {accountFormatted}
            </Typography>
          )}
        </Box>

        {/* Column 3: Amount (Fixed Width: 90px, Right Aligned) */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: amountColor,
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              letterSpacing: '-0.01em',
            }}
          >
            {format(tx.amount)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

TransactionRow.displayName = 'TransactionRow';

export default TransactionRow;