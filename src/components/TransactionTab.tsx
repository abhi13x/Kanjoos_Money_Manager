import React, { useState, useMemo } from 'react';
import { 
  Box, Button, ToggleButtonGroup, ToggleButton, TextField, Typography, 
  Card, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, Chip, Avatar, Tooltip, InputAdornment 
} from '@mui/material';
import { 
  Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, 
  Repeat, FilterX, Calendar, ReceiptText, Edit2 
} from 'lucide-react';
import type { Transaction, Account, Category } from '@/db/schema';
import { deleteTransactionWithSync } from '@/services/financeService';

interface TransactionsTabProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  format: (cents: number) => string;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  accounts,
  categories,
  format,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 1. Filtered and Sorted Transactions (Latest First)
  const filteredTx = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (startDate && tx.date < new Date(startDate).getTime()) return false;
        if (endDate && tx.date > new Date(endDate).getTime() + 86400000) return false;
        return true;
      })
      .sort((a, b) => b.date - a.date); // Sort descending by timestamp
  }, [transactions, startDate, endDate]);

  // 2. Grouped Engine with Group Totals
  const groupedData = useMemo(() => {
    const groups: Record<string, { 
      items: Transaction[]; 
      netCents: number; 
      totalIncome: number; 
      totalExpense: number; 
    }> = {};

    filteredTx.forEach((tx) => {
      const dateObj = new Date(tx.date);
      let key = '';

      if (viewMode === 'daily') {
        key = dateObj.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } else if (viewMode === 'monthly') {
        key = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      } else {
        key = dateObj.getFullYear().toString();
      }

      if (!groups[key]) {
        groups[key] = { items: [], netCents: 0, totalIncome: 0, totalExpense: 0 };
      }

      groups[key].items.push(tx);

      // Compute group net impact and absolute totals
      const multiplier = tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 0;
      groups[key].netCents += tx.amount * multiplier;
      
      if (tx.type === 'income') groups[key].totalIncome += tx.amount;
      if (tx.type === 'expense') groups[key].totalExpense += tx.amount;
    });

    return groups;
  }, [filteredTx, viewMode]);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteTransactionWithSync(deleteId);
      } catch (err) {
        console.error('Failed to delete transaction:', err);
        alert('Error deleting transaction. Please try again.');
      }
      setDeleteId(null);
    }
  };

  const getCategoryName = (tx: Transaction) => {
    if (tx.type === 'transfer') return 'Transfer';
    const cat = categories.find((c) => c.id === tx.categoryId);
    return cat ? cat.name : 'Uncategorized';
  };

  // Shared sx style to fix native date-picker visibility in light/dark modes
  const dateInputSx = {
    borderRadius: '12px',
    fontSize: '0.875rem',
    colorScheme: (theme: any) => theme.palette.mode,
    '& ::-webkit-calendar-picker-indicator': {
      cursor: 'pointer',
      filter: (theme: any) => (theme.palette.mode === 'dark' ? 'invert(1)' : 'none'),
      opacity: 0.7,
      '&:hover': { opacity: 1 },
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* Date Range Picker & View Toggles */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: '20px',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_e, newMode) => newMode && setViewMode(newMode)}
          size="small"
          sx={{
            bgcolor: 'action.hover',
            p: 0.5,
            borderRadius: '12px',
            border: 'none',
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              borderRadius: '8px !important',
              textTransform: 'capitalize',
              fontWeight: 700,
              px: 2,
              '&.Mui-selected': { bgcolor: 'background.paper', boxShadow: 1, color: 'primary.main' }
            }
          }}
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="yearly">Yearly</ToggleButton>
        </ToggleButtonGroup>

        {/* Filter Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            type="date"
            label="From"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (<InputAdornment position="start"><Calendar size={16} /></InputAdornment>),
                sx: dateInputSx
              }
            }}
            sx={{ width: '160px' }}
          />
          <TextField
            type="date"
            label="To"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (<InputAdornment position="start"><Calendar size={16} /></InputAdornment>),
                sx: dateInputSx
              }
            }}
            sx={{ width: '160px' }}
          />
          {(startDate || endDate) && (
            <Tooltip title="Reset date filters">
              <Button 
                color="error" 
                size="small"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                startIcon={<FilterX size={16} />}
                sx={{ fontWeight: 700, borderRadius: '10px' }}
              >
                Clear
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Ledger Output */}
      {Object.keys(groupedData).length === 0 ? (
        <Card 
          sx={{ 
            p: 8, 
            textAlign: 'center', 
            border: '1px solid', 
            borderColor: 'divider', 
            boxShadow: 'none', 
            borderRadius: '24px',
            bgcolor: 'background.paper'
          }}
        >
          <ReceiptText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No Transactions Found
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Try adjusting your date filters or add a new transaction entry.
          </Typography>
        </Card>
      ) : (
        Object.entries(groupedData).map(([groupTitle, { items, netCents, totalIncome, totalExpense }]) => (
          <Box key={groupTitle}>
            {/* Group Title Header + Totals */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 1, mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.2px' }}>
                {groupTitle}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {viewMode !== 'daily' && (
                  <Chip 
                    label={`Income: ${format(totalIncome)}`}
                    size="small"
                    sx={{ 
                      fontWeight: 800, 
                      fontSize: '0.72rem',
                      bgcolor: 'success.50',
                      color: 'success.main',
                      border: '1px solid',
                      borderColor: 'success.200'
                    }}
                  />
                )}
                {viewMode !== 'daily' && (
                  <Chip 
                    label={`Expense: ${format(totalExpense)}`}
                    size="small"
                    sx={{ 
                      fontWeight: 800, 
                      fontSize: '0.72rem',
                      bgcolor: 'error.50',
                      color: 'error.main',
                      border: '1px solid',
                      borderColor: 'error.200'
                    }}
                  />
                )}
                {netCents !== 0 && (
                  <Chip 
                    label={`Net: ${netCents > 0 ? '+' : ''}${format(netCents)}`}
                    size="small"
                    sx={{ 
                      fontWeight: 800, 
                      fontSize: '0.72rem',
                      bgcolor: netCents > 0 ? 'success.50' : 'error.50',
                      color: netCents > 0 ? 'success.main' : 'error.main',
                      border: '1px solid',
                      borderColor: netCents > 0 ? 'success.200' : 'error.200'
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* Only show transactions list if viewMode is daily */}
            {viewMode === 'daily' && (
              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '20px', overflow: 'hidden' }}>
                {items.map((tx, idx) => (
                  <Box 
                    key={tx.id} 
                    sx={{ 
                      borderBottom: idx !== items.length - 1 ? '1px solid' : 'none', 
                      borderColor: 'divider' 
                    }}
                  >
                    <TransactionRow 
                      tx={tx} 
                      accounts={accounts} 
                      getCategoryName={getCategoryName} 
                      format={format} 
                      onDelete={() => setDeleteId(tx.id)} 
                      onEdit={() => {
                        window.dispatchEvent(new CustomEvent('open-edit-modal', { detail: tx }));
                      }} 
                    />
                  </Box>
                ))}
              </Card>
            )}
          </Box>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)}
        slotProps={{
          paper: { sx: { borderRadius: '24px', p: 1 } }
        }}
      >
        <DialogTitle component="span" sx={{ fontWeight: 800, pt: 2, pb: 1, display: 'block' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this transaction? This action will permanently remove it from Dexie storage.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit" sx={{ borderRadius: '10px', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ borderRadius: '10px', fontWeight: 700 }}>
            Delete Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Reusable Stylish Row Component
const TransactionRow: React.FC<{
  tx: Transaction;
  accounts: Account[];
  getCategoryName: (tx: Transaction) => string;
  format: (v: number) => string;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ tx, accounts, getCategoryName, format, onDelete, onEdit }) => {
  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;

  // Visual type styling configurations
  const typeConfig = {
    income: {
      color: 'success.main',
      bg: 'success.50',
      icon: <ArrowDownLeft size={20} style={{ color: 'var(--mui-palette-success-main)' }} />,
      sign: '+'
    },
    expense: {
      color: 'text.primary',
      bg: 'action.hover',
      icon: <ArrowUpRight size={20} style={{ color: 'var(--mui-palette-error-main)' }} />,
      sign: '-'
    },
    transfer: {
      color: 'info.main',
      bg: 'info.50',
      icon: <ArrowRightLeft size={18} style={{ color: 'var(--mui-palette-info-main)' }} />,
      sign: ''
    }
  }[tx.type];

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2, 
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'action.hover' } 
      }}
    >
      {/* Left: Avatar + Details */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar 
          sx={{ 
            bgcolor: typeConfig.bg, 
            width: 44, 
            height: 44, 
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {typeConfig.icon}
        </Avatar>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
          {tx.note && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>
                {tx.note}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {tx.type === 'transfer' && account && toAccount 
                ? `${account.name} ➔ ${toAccount.name}` 
                : account?.name || 'Unknown Account'}
              <Box component="span" sx={{ color: 'text.disabled', mx: 0.5 }}>|</Box>
              <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {getCategoryName(tx)}
              </Typography>
            </Typography>

            {tx.isRecurring && (
              <Chip 
                icon={<Repeat size={10} />}
                label={tx.repeatInterval} 
                size="small" 
                variant="outlined" 
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, textTransform: 'capitalize' }} 
              />
            )}
          </Box>

          {tx.description && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
              {tx.description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right: Amount + Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 800, 
            color: typeConfig.color,
            fontSize: '1rem'
          }}
        >
          {typeConfig.sign} {format(tx.amount)}
        </Typography>

        <IconButton 
          size="small" 
          onClick={onEdit}
          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
        >
          <Edit2 size={16} />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={onDelete}
          sx={{ 
            color: 'text.disabled',
            '&:hover': { color: 'error.main', bgcolor: 'error.50' }
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </Box>
    </Box>
  );
};