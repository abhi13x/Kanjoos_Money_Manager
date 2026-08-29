import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

export interface UserSummary {
  /** Total global net worth across all accounts */
  netWorth: number;
  /** Total income recorded in the target month */
  monthlyIncome: number;
  /** Total expenses recorded in the target month */
  monthlyExpense: number;
  /** Net monthly savings (Income - Expenses) */
  monthlySavings: number;
  /** Savings rate percentage */
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
 * Custom hook to calculate global net worth and target month financial summaries from Dexie.
 *
 * @param targetDate Optional reference date (defaults to current date)
 */
export const useUserSummary = (targetDate: Date = new Date()): UserSummary => {
  // Compute exact start and end boundaries for the target month
  const startOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1,
    0, 0, 0, 0
  ).getTime();

  const endOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0,
    23, 59, 59, 999
  ).getTime();

  const summary = useLiveQuery(
    async (): Promise<Omit<UserSummary, 'isLoading'>> => {
      // 1. Fetch scoped monthly transactions and account snapshots concurrently
      const [monthlyTx, accounts] = await Promise.all([
        db.transactions
          .where('date')
          .between(startOfMonth, endOfMonth, true, true)
          .toArray(),
        db.accounts.toArray(),
      ]);

      // 2. Compute monthly income and expenses
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

      // 3. Compute Net Worth from account snapshots (subtracting liabilities)
      const netWorth = accounts.reduce((sum, acc) => {
        const balance = Number(acc.currentBalance) || 0;
        return acc.type === 'credit_card' ? sum - balance : sum + balance;
      }, 0);

      // 4. Calculate savings and savings rate
      const monthlySavings = monthlyIncome - monthlyExpense;
      const rawSavingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
      
      // Upper clamp to 100%, but allow negative savings rate to represent deficits
      const savingsRate = Math.min(100, rawSavingsRate);

      return {
        netWorth,
        monthlyIncome,
        monthlyExpense,
        monthlySavings,
        savingsRate,
      };
    },
    [startOfMonth, endOfMonth]
  );

  if (summary === undefined) {
    return DEFAULT_SUMMARY;
  }

  return {
    ...summary,
    isLoading: false,
  };
};