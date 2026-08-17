import { db, type Transaction } from '@/db/schema';
import { fromCents } from '@/types/finance';
import { GDriveSyncService } from '@/services/gdriveSync';

/**
 * Service layer for financial operations.
 * Handles atomic updates to balances and complex aggregations.
 */

export const addTransaction = async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
  return await db.transaction('rw', [db.transactions, db.accounts], async () => {
    const id = crypto.randomUUID();
    const transaction = { ...transactionData, id } as Transaction;
    
    await db.transactions.add(transaction);

    // Update account balances atomically
    if (transactionData.type === 'income') {
      const acc = await db.accounts.get(transactionData.accountId);
      if (acc) {
        await db.accounts.update(acc.id, { 
          currentBalance: (acc.currentBalance ?? acc.initialBalance) + transactionData.amount 
        });
      }
    } else if (transactionData.type === 'expense') {
      const acc = await db.accounts.get(transactionData.accountId);
      if (acc) {
        await db.accounts.update(acc.id, { 
          currentBalance: (acc.currentBalance ?? acc.initialBalance) - transactionData.amount 
        });
      }
    } else if (transactionData.type === 'transfer' && transactionData.toAccountId) {
      // Source Account (Decrease)
      const sourceAcc = await db.accounts.get(transactionData.accountId);
      if (sourceAcc) {
        await db.accounts.update(sourceAcc.id, { 
          currentBalance: (sourceAcc.currentBalance ?? sourceAcc.initialBalance) - transactionData.amount 
        });
      }
      // Target Account (Increase)
      const targetAcc = await db.accounts.get(transactionData.toAccountId);
      if (targetAcc) {
        await db.accounts.update(targetAcc.id, { 
          currentBalance: (targetAcc.currentBalance ?? targetAcc.initialBalance) + transactionData.amount 
        });
      }
    }
    
    return transaction;
  });
};

const triggerBackgroundSync = async () => {
  try {
    const syncService = GDriveSyncService.getInstance();
    if (syncService.hasValidAccessToken()) {
      syncService.sync().catch(err => console.warn('Background sync triggered by data change failed:', err));
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

export const updateTransactionWithSync = async (id: string, transactionData: Partial<Transaction>): Promise<Transaction> => {
  const updatedTx = await updateTransaction(id, transactionData);
  triggerBackgroundSync();
  return updatedTx;
};

export const updateTransaction = async (id: string, updateData: Partial<Transaction>): Promise<Transaction> => {
  return await db.transaction('rw', [db.transactions, db.accounts], async () => {
    const oldTx = await db.transactions.get(id);
    if (!oldTx) throw new Error('Transaction not found');

    // 1. Revert balances of the old transaction
    if (oldTx.type === 'income') {
      const acc = await db.accounts.get(oldTx.accountId);
      if (acc) {
        const currentVal = acc.currentBalance ?? acc.initialBalance;
        await db.accounts.update(acc.id, { currentBalance: currentVal - oldTx.amount });
      }
    } else if (oldTx.type === 'expense') {
      const acc = await db.accounts.get(oldTx.accountId);
      if (acc) {
        const currentVal = acc.currentBalance ?? acc.initialBalance;
        await db.accounts.update(acc.id, { currentBalance: currentVal + oldTx.amount });
      }
    } else if (oldTx.type === 'transfer' && oldTx.toAccountId) {
      const sourceAcc = await db.accounts.get(oldTx.accountId);
      if (sourceAcc) {
        const currentVal = sourceAcc.currentBalance ?? sourceAcc.initialBalance;
        await db.accounts.update(sourceAcc.id, { currentBalance: currentVal + oldTx.amount });
      }
      const targetAcc = await db.accounts.get(oldTx.toAccountId);
      if (targetAcc) {
        const currentVal = targetAcc.currentBalance ?? targetAcc.initialBalance;
        await db.accounts.update(targetAcc.id, { currentBalance: currentVal - oldTx.amount });
      }
    }

    // 2. Update the transaction
    const newTx = { ...oldTx, ...updateData };
    await db.transactions.update(id, newTx);

    // 3. Apply balances for the new transaction
    if (newTx.type === 'income') {
      const acc = await db.accounts.get(newTx.accountId);
      if (acc) {
        const currentVal = acc.currentBalance ?? acc.initialBalance;
        await db.accounts.update(acc.id, { currentBalance: currentVal + newTx.amount });
      }
    } else if (newTx.type === 'expense') {
      const acc = await db.accounts.get(newTx.accountId);
      if (acc) {
        const currentVal = acc.currentBalance ?? acc.initialBalance;
        await db.accounts.update(acc.id, { currentBalance: currentVal - newTx.amount });
      }
    } else if (newTx.type === 'transfer' && newTx.toAccountId) {
      const sourceAcc = await db.accounts.get(newTx.accountId);
      if (sourceAcc) {
        const currentVal = sourceAcc.currentBalance ?? sourceAcc.initialBalance;
        await db.accounts.update(sourceAcc.id, { currentBalance: currentVal - newTx.amount });
      }
      const targetAcc = await db.accounts.get(newTx.toAccountId);
      if (targetAcc) {
        const currentVal = targetAcc.currentBalance ?? targetAcc.initialBalance;
        await db.accounts.update(targetAcc.id, { currentBalance: currentVal + newTx.amount });
      }
    }

    return newTx;
  });
};

export const deleteTransactionWithSync = async (id: string): Promise<void> => {
  await deleteTransaction(id);
  triggerBackgroundSync();
};

export const deleteTransaction = async (id: string): Promise<void> => {
  return await db.transaction('rw', [db.transactions, db.accounts], async () => {
    const transaction = await db.transactions.get(id);
    if (!transaction) throw new Error('Transaction not found');

    // Revert balance changes before deleting
    if (transaction.type === 'income') {
      const acc = await db.accounts.get(transaction.accountId);
      if (acc) {
        const currentVal = acc.currentBalance ?? acc.initialBalance;
        await db.accounts.update(acc.id, { currentBalance: currentVal - transaction.amount });
      }
    } else if (transaction.type === 'expense') {
      const acc = await db.accounts.get(transaction.accountId);
      if (acc) {
        const currentVal = acc.currentBalance ?? acc.initialBalance;
        await db.accounts.update(acc.id, { currentBalance: currentVal + transaction.amount });
      }
    } else if (transaction.type === 'transfer' && transaction.toAccountId) {
      const sourceAcc = await db.accounts.get(transaction.accountId);
      if (sourceAcc) {
        const currentVal = sourceAcc.currentBalance ?? sourceAcc.initialBalance;
        await db.accounts.update(sourceAcc.id, { currentBalance: currentVal + transaction.amount });
      }
      
      const targetAcc = await db.accounts.get(transaction.toAccountId);
      if (targetAcc) {
        const currentVal = targetAcc.currentBalance ?? targetAcc.initialBalance;
        await db.accounts.update(targetAcc.id, { currentBalance: currentVal - transaction.amount });
      }
    }

    await db.transactions.delete(id);
  });
};

export const getAccountBalances = async () => {
  const accounts = await db.accounts.toArray();

  const balances = accounts.map(account => ({
    account,
    balance: account.currentBalance ?? account.initialBalance
  }));

  // Aligned to exact database schema types to prevent ts(2367) non-overlapping comparison errors
  const assets = balances
    .filter(b => ['cash', 'savings', 'wallet', 'debit_card', 'mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(b.account.type))
    .reduce((sum, b) => sum + b.balance, 0);

  const liabilities = balances
    .filter(b => b.account.type === 'credit_card')
    .reduce((sum, b) => sum + b.balance, 0);

  const retirementAssets = balances
    .filter(b => b.account.type === 'scheme')
    .reduce((sum, b) => sum + b.balance, 0);

  return {
    assets,
    liabilities: Math.abs(liabilities),
    retirementAssets,
    netWorth: assets + liabilities, 
  };
};

export const getMonthlyCategoryBreakdown = async (year: number, month: number) => {
  // Sets dynamic boundaries down to the millisecond to catch all end-of-month logs
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  const transactions = await db.transactions
    .where('date')
    .between(startOfMonth, endOfMonth, true, true)
    .filter(t => t.type === 'expense')
    .toArray();

  const breakdown: Record<string, number> = {};

  transactions.forEach(t => {
    // FIX: Swapped out missing '.category' property for schema-compliant '.categoryId'
    const targetKey = t.categoryId || 'uncategorized';
    breakdown[targetKey] = (breakdown[targetKey] || 0) + t.amount;
  });

  return Object.entries(breakdown).map(([categoryId, total]) => ({
    categoryId,
    total,
  }));
};

export const formatCurrency = (cents: number): string => {
  // Native Indian Rupee localization supporting clean Lakh/Crore structural grouping formatting
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(fromCents(cents));
};