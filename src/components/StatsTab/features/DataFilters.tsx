import { useMemo } from 'react';
import type { Transaction } from '@/db/schema';

/**
 * Filters transactions based on the selected statType (income or expense).
 */
export const useBaseTransactions = (transactions: Transaction[], statType: 'expense' | 'income') => {
  return useMemo(() => {
    return transactions.filter((tx) => tx.type === statType);
  }, [transactions, statType]);
};

/**
 * Generates available time periods based on the selected grouping (month or year).
 */
export const useAvailablePeriods = (baseTx: Transaction[], groupBy: 'month' | 'year') => {
  return useMemo(() => {
    const periodSet = new Set<string>();
    baseTx.forEach((tx) => {
      const dateObj = new Date(tx.date);
      if (isNaN(dateObj.getTime())) return;
      if (groupBy === 'month') {
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        periodSet.add(key);
      } else {
        periodSet.add(`${dateObj.getFullYear()}`);
      }
    });

    return Array.from(periodSet).sort().reverse();
  }, [baseTx, groupBy]);
};

/**
 * Validates and returns the current active period, defaulting to 'all' if invalid.
 */
export const useEffectivePeriod = (selectedPeriod: string, availablePeriods: string[]) => {
  return useMemo(() => {
    if (selectedPeriod === 'all') return 'all';
    return availablePeriods.includes(selectedPeriod) ? selectedPeriod : 'all';
  }, [selectedPeriod, availablePeriods]);
};

/**
 * Calculates a sorted list of all years present in the transaction data, including current year.
 */
export const useAvailableYears = (transactions: Transaction[]) => {
  const currentDate = new Date();
  return useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentDate.getFullYear());
    transactions.forEach((tx) => {
      if (tx.date) {
        yearsSet.add(new Date(tx.date).getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);
};

/**
 * Filters transactions specifically for the category breakdown section based on selected month/year.
 */
export const useBreakdownFilteredTransactions = (
  transactions: Transaction[],
  statType: 'expense' | 'income',
  breakdownMonth: number,
  breakdownYear: number
) => {
  return useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type !== statType) return false;
      const d = new Date(tx.date);
      return d.getMonth() === breakdownMonth && d.getFullYear() === breakdownYear;
    });
  }, [transactions, statType, breakdownMonth, breakdownYear]);
};

/**
 * Calculates the total amount for all items in the category breakdown.
 */
export const useTotalBreakdownAmount = (categoryBreakdown: { amount: number }[]) => {
  return useMemo(() => {
    return categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);
  }, [categoryBreakdown]);
};