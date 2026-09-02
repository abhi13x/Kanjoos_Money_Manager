import React, { useState, useMemo, useCallback } from 'react';
import { ViewToggles } from './views/ViewToggles';
import { filterAndSortTransactions } from './features/filterTransaction';
import { Box } from '@mui/material';
import type { Transaction, Account, Category } from '@/db/schema';
import { deleteTransactionWithSync } from '@/services/financeService';
import { NoDataView } from './views/LedgerOutput/NoDataView';
import DayGroupCard from './views/LedgerOutput/DayGroupCard';
import { GroupData } from './features/GroupData';
import { DeleteDialog } from './views/DeleteDialog';
import { TransactionRow, type ViewMode } from './views/LedgerOutput/TransactionRow';
import { MonthYearSelector } from './views/MonthSelector';

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

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  accounts,
  categories,
  format,
}) => {
  const [value, setValue] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Track IDs pending or completed local deletion to ensure local UI updates immediately
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const viewMode = VIEW_MODE_MAP[value] || 'daily';

  // Compute boundaries for active month to avoid memory lag on large datasets
  const { monthStartMs, monthEndMs } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    return { monthStartMs: start, monthEndMs: end };
  }, [selectedYear, selectedMonth]);

  // Filter out locally deleted IDs to prevent UI flashes during async deletion/sync
  const activeTransactions = useMemo(() => {
    if (deletedIds.size === 0) return transactions;
    return transactions.filter((tx) => !deletedIds.has(String(tx.id)));
  }, [transactions, deletedIds]);

  // Store full Category objects in Map to resolve parentId and subcategory relationships
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const getCategoryName = useCallback(
    (tx: Transaction) => {
      if (tx.type === 'transfer') return 'Transfer';

      const catId = tx.categoryId;
      const subCatId = tx.subCategoryId;

      // 1. Handles separate categoryId (Parent) and subCategoryId (Child)
      if (catId && subCatId) {
        const parentCat = categoryMap.get(catId);
        const subCat = categoryMap.get(subCatId);
        if (parentCat && subCat) {
          return `${parentCat.name} / ${subCat.name}`;
        }
      }

      // 2. Handles categoryId pointing to a subcategory with a parentId reference
      if (catId) {
        const cat = categoryMap.get(catId);
        if (cat) {
          if (cat.parentId) {
            const parentCat = categoryMap.get(cat.parentId);
            if (parentCat) {
              return `${parentCat.name} / ${cat.name}`;
            }
          }
          return cat.name;
        }
      }

      return 'Uncategorized';
    },
    [categoryMap]
  );

  const filteredTx = useMemo(() => {
    return filterAndSortTransactions(activeTransactions, {
      startDate: value === 0 ? monthStartMs : null,
      endDate: value === 0 ? monthEndMs : null,
    });
  }, [activeTransactions, value, monthStartMs, monthEndMs]);

  const groupedData = useMemo(() => {
    return GroupData({ value, filteredTx });
  }, [filteredTx, value]);

  const handleDelete = async () => {
    if (!deleteId) return;

    const targetId = deleteId;
    
    // 1. Optimistically hide from local list
    setDeletedIds((prev) => new Set(prev).add(targetId));
    setDeleteId(null);

    try {
      // 2. Execute atomic deletion + outbound sync push
      await deleteTransactionWithSync(targetId);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      // Rollback optimistic state if backend delete fails
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      alert('Error deleting transaction. Please try again.');
    }
  };

  const handleEditTx = useCallback((tx: Transaction) => {
    window.dispatchEvent(
      new CustomEvent('open-edit-modal', { detail: tx })
    );
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ViewToggles value={value} onChange={setValue} />

      {value === 0 && (
        <MonthYearSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onChange={(y, m) => {
            setSelectedYear(y);
            setSelectedMonth(m);
          }}
        />
      )}

      {Object.keys(groupedData).length === 0 ? (
        <NoDataView />
      ) : (
        Object.entries(groupedData).map(
          ([groupTitle, { items, netCents, totalIncome, totalExpense }]) => (
            <Box key={groupTitle} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {value === 0 ? (
                <DayGroupCard
                  groupTitle={groupTitle}
                  totalIncome={totalIncome}
                  totalExpense={totalExpense}
                  netCents={netCents}
                  transactions={items}
                  accounts={accounts}
                  categories={categories}
                  getCategoryName={getCategoryName}
                  format={format}
                  onDeleteTx={(id) => setDeleteId(id)}
                  onEditTx={handleEditTx}
                />
              ) : (
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

      <DeleteDialog
        deleteId={deleteId}
        setDeleteId={setDeleteId}
        handleDelete={handleDelete}
      />
    </Box>
  );
};
