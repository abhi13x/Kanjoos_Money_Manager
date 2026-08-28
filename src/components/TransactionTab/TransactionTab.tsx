import React, { useState, useMemo } from 'react';
import { ViewToggles } from './view/ViewToggles';
import { filterAndSortTransactions } from './feature/filterTransaction';
import { Box, Card } from '@mui/material';
import type { Transaction, Account, Category } from '@/db/schema';
import { deleteTransactionWithSync } from '@/services/financeService';
import { NoDataView } from './view/LedgerOutput/NoDataView';
import { GroupTotalAndTitle } from './view/LedgerOutput/DataView';
import { GroupData } from './feature/GroupData';
import { DeleteDialog } from './view/DeleteDialog';
import { TransactionRow, type ViewMode } from './view/LedgerOutput/TransactionRow';
import { DateRangePicker } from './view/DateRangePicker';

export interface TransactionsTabProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  format: (cents: number) => string;
}

const VIEW_MODE_MAP: Record<number, ViewMode> = {
  0: 'daily',
  1: 'monthly',
  2: 'yearly',
};

/*
 * Main Transactions Tab Component
 * Displays transaction history with filtering, grouping, and actions
 */
export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  accounts,
  categories,
  format,
}) => {
  // View mode state: 0=daily, 1=monthly, 2=yearly
  const [value, setValue] = useState<number>(0);
  // Date range filter states for daily view
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  // ID of transaction pending deletion confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const viewMode = VIEW_MODE_MAP[value] || 'daily';

  // 1. Filtered and Sorted Transactions (Latest First)
  const filteredTx = useMemo(
    () => filterAndSortTransactions(transactions, { startDate, endDate }),
    [transactions, startDate, endDate]
  );

  // 2. Grouped Engine with Group Totals
  const groupedData = useMemo(() => {
    return GroupData({ value, filteredTx });
  }, [filteredTx, value]);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* View Toggles - controls transaction view mode (Daily/Monthly/Yearly) */}
      <ViewToggles value={value} onChange={setValue} />

      {/* Date Range Picker - only shown when Daily is selected (value === 0) */}
      {value === 0 && (
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      )}

      {/* Ledger Output */}
      {Object.keys(groupedData).length === 0 ? (
        <NoDataView />
      ) : (
        Object.entries(groupedData).map(
          ([groupTitle, { items, netCents, totalIncome, totalExpense }]) => (
            <Box key={groupTitle}>
              {value === 0 ? (
                /* Daily View: Group Header + Transaction Cards */
                <>
                  <GroupTotalAndTitle
                    groupTitle={groupTitle}
                    totalIncome={totalIncome}
                    totalExpense={totalExpense}
                    netCents={netCents}
                  />
                  <Card
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 'none',
                      borderRadius: '20px',
                      overflow: 'hidden',
                    }}
                  >
                    {items.map((tx, idx) => (
                      <Box
                        key={tx.id}
                        sx={{
                          borderBottom:
                            idx !== items.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <TransactionRow
                          tx={tx}
                          accounts={accounts}
                          getCategoryName={getCategoryName}
                          format={format}
                          onDelete={() => setDeleteId(tx.id)}
                          onEdit={() => {
                            window.dispatchEvent(
                              new CustomEvent('open-edit-modal', { detail: tx })
                            );
                          }}
                          viewMode="daily"
                        />
                      </Box>
                    ))}
                  </Card>
                </>
              ) : (
                /* Monthly / Yearly View: Stacked Month/Year Summary Row */
                <TransactionRow
                  viewMode={viewMode}
                  periodLabel={groupTitle}
                  totals={{
                    income: totalIncome,
                    expense: totalExpense,
                    net: netCents,
                  }}
                  format={format}
                />
              )}
            </Box>
          )
        )
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        deleteId={deleteId}
        setDeleteId={setDeleteId}
        handleDelete={handleDelete}
      />
    </Box>
  );
};