export const filterAndSortTransactions = (
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] => {
  return transactions
    .filter((tx) => {
      if (filters.startDate && tx.date < filters.startDate) return false;
      if (filters.endDate && tx.date > filters.endDate) return false;
      return true;
    })
    .sort((a, b) => b.date - a.date); // Sort descending by timestamp
};