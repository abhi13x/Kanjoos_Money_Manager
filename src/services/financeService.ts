import { db, type Transaction } from '@/db/schema';
import { fromCents } from '@/types/finance';
import { GDriveSyncService } from '@/services/gdriveSync';

const LIABILITY_TYPES = new Set(['credit_card', 'loan', 'mortgage', 'liability']);

/**
 * Safely updates an account balance within an active Dexie transaction context.
 */
const updateAccountBalance = async (accountId: string | undefined, delta: number): Promise<void> => {
  if (!accountId) return;
  const acc = await db.accounts.get(accountId);
  if (acc) {
    const currentVal = acc.currentBalance ?? acc.initialBalance ?? 0;
    // Guard against floating-point drift by rounding to nearest integer representation
    const updatedVal = Math.round(currentVal + delta);
    await db.accounts.update(accountId, { currentBalance: updatedVal });
  }
};

/**
 * Applies or reverts transaction balance impacts across affected accounts.
 */
const adjustTransactionBalances = async (
  tx: Partial<Transaction>,
  direction: 1 | -1
): Promise<void> => {
  const amount = (tx.amount ?? 0) * direction;

  if (tx.type === 'income' && tx.accountId) {
    await updateAccountBalance(tx.accountId, amount);
  } else if (tx.type === 'expense' && tx.accountId) {
    await updateAccountBalance(tx.accountId, -amount);
  } else if (tx.type === 'transfer' && tx.accountId) {
    const updates: Promise<void>[] = [updateAccountBalance(tx.accountId, -amount)];
    if (tx.toAccountId) {
      updates.push(updateAccountBalance(tx.toAccountId, amount));
    }
    await Promise.all(updates);
  }
};

export const addTransaction = async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
  return await db.transaction('rw', [db.transactions, db.accounts], async () => {
    const id = crypto.randomUUID();
    const transaction = { ...transactionData, id } as Transaction;
    
    await db.transactions.add(transaction);
    await adjustTransactionBalances(transaction, 1);
    
    return transaction;
  });
};

/**
 * Triggers an outbound sync push after local mutations to prevent remote pulls
 * from overwriting newly deleted/updated data.
 */
const triggerOutboundSync = async (): Promise<void> => {
  try {
    const syncService = GDriveSyncService.getInstance();
    if (syncService.hasCachedSession()) {
      // Export local state directly to prevent stale remote state from being pulled
      if ('exportToGDrive' in syncService && typeof syncService.exportToGDrive === 'function') {
        await (syncService as any).exportToGDrive();
      } else {
        await syncService.sync();
      }
    }
  } catch (e) {
    console.warn('Background sync failed:', e);
  }
};

export const addTransactionWithSync = async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const tx = await addTransaction(transactionData);
  triggerOutboundSync();
  return tx;
};

export const updateTransaction = async (id: string, updateData: Partial<Transaction>): Promise<Transaction> => {
  return await db.transaction('rw', [db.transactions, db.accounts], async () => {
    const oldTx = await db.transactions.get(id);
    if (!oldTx) throw new Error('Transaction not found');

    // 1. Revert balance changes from the original state
    await adjustTransactionBalances(oldTx, -1);

    // 2. Persist updated transaction object
    const newTx: Transaction = { ...oldTx, ...updateData, id };
    await db.transactions.update(id, newTx);

    // 3. Apply balance changes from the new state
    await adjustTransactionBalances(newTx, 1);

    return newTx;
  });
};

export const updateTransactionWithSync = async (id: string, transactionData: Partial<Transaction>): Promise<Transaction> => {
  const updatedTx = await updateTransaction(id, transactionData);
  triggerOutboundSync();
  return updatedTx;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  return await db.transaction('rw', [db.transactions, db.accounts], async () => {
    const transaction = await db.transactions.get(id);
    if (!transaction) throw new Error('Transaction not found');

    await adjustTransactionBalances(transaction, -1);
    await db.transactions.delete(id);
  });
};

export const deleteTransactionWithSync = async (id: string): Promise<void> => {
  // 1. Await database deletion and account balance adjustment
  await deleteTransaction(id);

  // 2. Push updated state immediately
  await triggerOutboundSync();
};

export const getAccountBalances = async () => {
  const accounts = await db.accounts.toArray();

  let assets = 0;
  let liabilities = 0;
  let retirementAssets = 0;

  for (const account of accounts) {
    const balance = account.currentBalance ?? account.initialBalance ?? 0;
    const type = account.type ?? '';

    if (LIABILITY_TYPES.has(type)) {
      liabilities += Math.abs(balance);
    } else {
      assets += balance;
      if (type === 'scheme') {
        retirementAssets += balance;
      }
    }
  }

  return {
    assets,
    liabilities,
    retirementAssets,
    netWorth: assets - liabilities,
  };
};

/**
 * Calculates monthly expense totals per category (month index is 0-based: 0 = Jan, 11 = Dec).
 */
export const getMonthlyCategoryBreakdown = async (year: number, month: number) => {
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  const transactions = await db.transactions
    .where('date')
    .between(startOfMonth, endOfMonth, true, true)
    .filter(t => t.type === 'expense')
    .toArray();

  const breakdown: Record<string, number> = {};

  transactions.forEach(t => {
    const targetKey = t.categoryId || 'uncategorized';
    breakdown[targetKey] = Math.round((breakdown[targetKey] || 0) + (t.amount || 0));
  });

  return Object.entries(breakdown).map(([categoryId, total]) => ({
    categoryId,
    total,
  }));
};

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(fromCents(cents));
};
