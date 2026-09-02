import type { Transaction } from '@/db/schema';

export interface TransactionFilters {
  search?: string;
  type?: 'all' | 'income' | 'expense' | 'transfer';
  accountId?: string;
  categoryId?: string;
  subCategoryId?: string;
  isRecurring?: boolean;
  startDate?: number | Date | string | null;
  endDate?: number | Date | string | null;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

const toTimestamp = (val?: number | Date | string | null): number | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }

  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [year, month, day] = val.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? null : parsed;
};

export const filterAndSortTransactions = (
  transactions: Transaction[] = [],
  filters: TransactionFilters = {}
): Transaction[] => {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const startMs = toTimestamp(filters.startDate);
  const endMs = toTimestamp(filters.endDate);
  const searchLower = filters.search?.trim().toLowerCase();
  const { sortBy = 'date', sortOrder = 'desc' } = filters;

  const decorated: Array<{ tx: Transaction; timestamp: number }> = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const txDateMs = typeof tx.date === 'number' ? tx.date : (toTimestamp(tx.date) ?? 0);

    if (startMs !== null && txDateMs < startMs) continue;
    if (endMs !== null && txDateMs > endMs) continue;

    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) continue;

    if (filters.accountId) {
      const matchesAccount =
        tx.accountId === filters.accountId || tx.toAccountId === filters.accountId;
      if (!matchesAccount) continue;
    }

    if (filters.categoryId) {
      const matchesCategory =
        tx.categoryId === filters.categoryId || tx.subCategoryId === filters.categoryId;
      if (!matchesCategory) continue;
    }

    if (filters.subCategoryId && tx.subCategoryId !== filters.subCategoryId) continue;

    if (filters.isRecurring !== undefined && tx.isRecurring !== filters.isRecurring) continue;

    if (filters.minAmount !== undefined && tx.amount < filters.minAmount) continue;
    if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) continue;

    if (searchLower) {
      const noteMatch = tx.note?.toLowerCase().includes(searchLower);
      const descriptionMatch = tx.description?.toLowerCase().includes(searchLower);

      if (!noteMatch && !descriptionMatch) continue;
    }

    decorated.push({ tx, timestamp: txDateMs });
  }

  const orderMultiplier = sortOrder === 'asc' ? 1 : -1;

  decorated.sort((a, b) => {
    if (sortBy === 'amount') {
      return (a.tx.amount - b.tx.amount) * orderMultiplier;
    }
    return (a.timestamp - b.timestamp) * orderMultiplier;
  });

  return decorated.map((item) => item.tx);
};