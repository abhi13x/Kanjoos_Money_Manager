import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

export interface UserSummary {
  /** Total global net worth across all accounts and transaction history */
  netWorth: number;
  /** Total income recorded in the current month */
  monthlyIncome: number;
  /** Total expenses recorded in the current month */
  monthlyExpense: number;
  /** Net monthly savings (Income - Expenses) */
  monthlySavings: number;
  /** Savings rate percentage (0 - 100) */
  savingsRate: number;
  /** True while the initial Dexie query is resolving */
  isLoading: boolean;
}

const DEFAULT_SUMMARY: UserSummary = {
  netWorth: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  monthlySavings: 0,
  savingsRate: 0,
  isLoading: true,
};

/**
 * Custom hook to calculate global net worth and current month financial summaries from Dexie.
 *
 * @param targetDate Optional reference date (defaults to current date)
 * @returns UserSummary object with net worth, monthly breakdown, savings rate, and loading status.
 */
export const useUserSummary = (targetDate: Date = new Date()): UserSummary => {
  // Compute start-of-month timestamp boundary
  const startOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  ).getTime();

  const summary = useLiveQuery(
    async (): Promise<Omit<UserSummary, 'isLoading'>> => {
      // 1. Concurrently fetch monthly transactions and full system state
      const [monthlyTx, allAccounts, allTx] = await Promise.all([
        db.transactions.where('date').aboveOrEqual(startOfMonth).toArray(),
        db.accounts.toArray(),
        db.transactions.toArray(),
      ]);

      // 2. Compute monthly income and expenses in a single pass
      let monthlyIncome = 0;
      let monthlyExpense = 0;

      for (let i = 0; i < monthlyTx.length; i++) {
        const t = monthlyTx[i];
        const amount = Number(t.amount) || 0;
        if (t.type === 'income') {
          monthlyIncome += amount;
        } else if (t.type === 'expense') {
          monthlyExpense += amount;
        }
      }

      // 3. Compute Net Worth (Initial Balances + Total Historical Income/Expense Deltas)
      const initialTotal = allAccounts.reduce(
        (sum, a) => sum + (Number(a.initialBalance) || 0),
        0
      );

      const txTotal = allTx.reduce((sum, t) => {
        const amount = Number(t.amount) || 0;
        if (t.type === 'income') return sum + amount;
        if (t.type === 'expense') return sum - amount;
        return sum; // Internal transfers do not alter global net worth
      }, 0);

      const netWorth = initialTotal + txTotal;
      const monthlySavings = monthlyIncome - monthlyExpense;
      const rawSavingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
      const savingsRate = Math.max(0, Math.min(100, rawSavingsRate));

      return {
        netWorth,
        monthlyIncome,
        monthlyExpense,
        monthlySavings,
        savingsRate,
      };
    },
    [startOfMonth] // Re-run query whenever the month boundary changes
  );

  if (summary === undefined) {
    return DEFAULT_SUMMARY;
  }

  return {
    ...summary,
    isLoading: false,
  };
};