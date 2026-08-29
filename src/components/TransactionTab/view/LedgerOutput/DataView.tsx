import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Transaction, Account } from '@/db/schema';
import DayGroupCard from './DayGroupCard';

export interface CategoryItem {
  id: string;
  name: string;
  parentId?: string | null;
  [key: string]: any;
}

/**
 * Helper: Resolves category names into "Parent / Child" format so TransactionRow
 * can display Parent Category on top and Child Category underneath.
 */
export const getCategoryName = (
  tx: any,
  categories: CategoryItem[] = []
): string => {
  if (!tx) return 'Uncategorized';

  // 1. Direct object hierarchy check on transaction
  if (tx.category?.parent?.name) {
    return `${tx.category.parent.name} / ${tx.category.name}`;
  }
  if (tx.parentCategoryName && tx.categoryName) {
    return `${tx.parentCategoryName} / ${tx.categoryName}`;
  }

  // 2. Lookup via categoryId in categories list
  const catId = tx.categoryId || tx.category_id;
  if (!catId || !categories.length) {
    return tx.categoryName || tx.category?.name || 'Uncategorized';
  }

  const currentCategory = categories.find((c) => c.id === catId);
  if (!currentCategory) return 'Uncategorized';

  // Check if currentCategory is a subcategory with a parentId
  if (currentCategory.parentId) {
    const parentCategory = categories.find((c) => c.id === currentCategory.parentId);
    if (parentCategory) {
      return `${parentCategory.name} / ${currentCategory.name}`;
    }
  }

  return currentCategory.name;
};

export interface DayGroupData {
  groupTitle: string;
  totalIncome: number;
  totalExpense: number;
  netCents: number;
  transactions: Transaction[];
}

export interface DataViewProps {
  groupedTransactions: DayGroupData[];
  accounts?: Account[];
  categories?: CategoryItem[];
  format?: (cents: number) => string;
  onDeleteTx?: (id: string) => void;
  onEditTx?: (tx: Transaction) => void;
}

export const DataView: React.FC<DataViewProps> = memo(({
  groupedTransactions = [],
  accounts = [],
  categories = [],
  format,
  onDeleteTx,
  onEditTx,
}) => {
  if (!groupedTransactions || groupedTransactions.length === 0) {
    return (
      <Box
        sx={{
          py: 6,
          px: 2,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          No transactions to display.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {groupedTransactions.map((group) => (
        <DayGroupCard
          key={group.groupTitle}
          groupTitle={group.groupTitle}
          totalIncome={group.totalIncome}
          totalExpense={group.totalExpense}
          netCents={group.netCents}
          transactions={group.transactions}
          accounts={accounts}
          categories={categories}
          format={format}
          getCategoryName={(tx) => getCategoryName(tx, categories)}
          onDeleteTx={onDeleteTx}
          onEditTx={onEditTx}
        />
      ))}
    </Box>
  );
});

DataView.displayName = 'DataView';

export default DataView;