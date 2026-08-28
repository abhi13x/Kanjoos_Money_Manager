import type { Transaction } from '@/db/schema';

export interface TransactionFilters {
  search?: string;
  type?: 'all' | 'income' | 'expense' | 'transfer';
  accountId?: string;
  categoryId?: string;
  startDate?: number | Date | string | null;
  endDate?: number | Date | string | null;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

/** Helper to convert Date objects, strings, or numbers into numeric timestamps */
const toTimestamp = (val?: number | Date | string | null): number | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? null : parsed;
};

export const filterAndSortTransactions = (
  transactions: Transaction[] = [],
  filters: TransactionFilters = {}
): Transaction[] => {
  if (!Array.isArray(transactions)) return [];

  const startMs = toTimestamp(filters.startDate);
  const endMs = toTimestamp(filters.endDate);
  const searchLower = filters.search?.trim().toLowerCase();

  return transactions
    .filter((tx) => {
      const txDateMs = toTimestamp(tx.date) ?? 0;

      // 1. Date Range Filtering
      if (startMs !== null && txDateMs < startMs) return false;
      if (endMs !== null && txDateMs > endMs) return false;

      // 2. Transaction Type Filtering
      if (filters.type && filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }

      // 3. Account Filtering
      if (filters.accountId) {
        const matchesAccount =
          tx.accountId === filters.accountId || tx.toAccountId === filters.accountId;
        if (!matchesAccount) return false;
      }

      // 4. Category Filtering
      if (filters.categoryId && tx.categoryId !== filters.categoryId) {
        return false;
      }

      // 5. Amount Range Filtering
      if (filters.minAmount !== undefined && tx.amount < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) return false;

      // 6. Search Filtering
      if (searchLower) {
        const noteMatch = tx.note?.toLowerCase().includes(searchLower);
        const payeeMatch = (tx as Record<string, any>).payee?.toLowerCase().includes(searchLower);
        const descriptionMatch = (tx as Record<string, any>).description
          ?.toLowerCase()
          .includes(searchLower);

        if (!noteMatch && !payeeMatch && !descriptionMatch) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      const sortBy = filters.sortBy || 'date';

      if (sortBy === 'amount') {
        return (a.amount - b.amount) * order;
      }

      const aDate = toTimestamp(a.date) ?? 0;
      const bDate = toTimestamp(b.date) ?? 0;
      return (aDate - bDate) * order;
    });
};