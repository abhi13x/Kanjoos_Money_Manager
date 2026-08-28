import { db, type Transaction } from '@/db/schema';
import { fromCents } from '@/types/finance';
import { GDriveSyncService } from '@/services/gdriveSync';

/**
 * Safely updates an account balance while guarding against undefined account IDs.
 */
const updateAccountBalance = async (accountId: string | undefined, delta: number): Promise<void> => {
  if (!accountId) return;
  const acc = await db.accounts.get(accountId);
  if (acc && acc.id) {
    const currentVal = acc.currentBalance ?? acc.initialBalance ?? 0;
    await db.accounts.update(acc.id, { currentBalance: currentVal + delta });
  }
};

/**
 * Applies or reverts transaction balance impacts across affected accounts with full type safety.
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
    await updateAccountBalance(tx.accountId, -amount);
    if (tx.toAccountId) {
      await updateAccountBalance(tx.toAccountId, amount);
    }
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

const triggerBackgroundSync = async (): Promise<void> => {
  try {
    const syncService = GDriveSyncService.getInstance();
    if (syncService.hasValidAccessToken()) {
      syncService.sync().catch(err => console.warn('Background sync failed:', err));
    }
  } catch (e) {
    console.error('Error triggering background sync:', e);
  }
};

export const addTransactionWithSync = async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const tx = await addTransaction(transactionData);
  triggerBackgroundSync();
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
  triggerBackgroundSync();
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
  await deleteTransaction(id);
  triggerBackgroundSync();
};

export const getAccountBalances = async () => {
  const accounts = await db.accounts.toArray();

  const balances = accounts.map(account => ({
    account,
    balance: account.currentBalance ?? account.initialBalance ?? 0
  }));

  const assets = balances
    .filter(b => ['cash', 'savings', 'wallet', 'debit_card', 'mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(b.account.type ?? ''))
    .reduce((sum, b) => sum + b.balance, 0);

  const liabilities = balances
    .filter(b => b.account.type === 'credit_card')
    .reduce((sum, b) => sum + b.balance, 0);

  const retirementAssets = balances
    .filter(b => b.account.type === 'scheme')
    .reduce((sum, b) => sum + b.balance, 0);

  const absoluteLiabilities = Math.abs(liabilities);

  return {
    assets,
    liabilities: absoluteLiabilities,
    retirementAssets,
    netWorth: assets - absoluteLiabilities,
  };
};

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
    breakdown[targetKey] = (breakdown[targetKey] || 0) + t.amount;
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
  }).format(fromCents(cents));
};