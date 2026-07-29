// src/db/schema.ts
import Dexie, { type Table } from 'dexie';

// Define Account Types
export type AccountType = 
  | 'cash' 
  | 'savings' 
  | 'wallet' 
  | 'credit_card' 
  | 'debit_card' 
  | 'mutual_fund' 
  | 'stock' 
  | 'fd_rd' 
  | 'scheme'; // NPS, EPFO, PPF

export type InvestmentSubType = 'fd' | 'rd' | 'sip' | 'lumpsum' | 'ppf' | 'nps' | 'epfo';
export type CompoundingFrequency = 'monthly' | 'quarterly' | 'annually';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number; // stored in cents
  currentBalance: number; // stored in cents
  currency: string;
  repeatInvestmentDate?: number; // Day of the month (1-31)
  interestRate?: number; // e.g. 7.1 for PPF, FD, RD
  expectedReturnRate?: number; // e.g. 12 for MF/stock CAGR
  statementDate?: number; // Day of the month (1-31)
  dueDate?: number; // Day of the month (1-31)
  /** Monthly SIP/RD/PPF/EPFO contribution in cents */
  monthlyInvestment?: number;
  /** Investment start date (timestamp) for elapsed projections */
  startDate?: number;
  /** Total investment horizon in months */
  tenureMonths?: number;
  /** Override auto-detected formula type */
  investmentSubType?: InvestmentSubType;
  /** Compounding frequency for FD (default: quarterly) */
  compoundingFrequency?: CompoundingFrequency;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string; // If set, this is a sub-category
}

export interface Transaction {
  id: string;
  amount: number; // stored in cents
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  toAccountId?: string; // only for transfers
  categoryId?: string; // references category
  date: number; // timestamp
  note?: string;
  description?: string;
  isRecurring?: boolean;
  repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

class KanjoosDatabase extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;

  constructor() {
    super('KanjoosDatabase');
    this.version(1).stores({
      accounts: 'id, name, type',
      categories: 'id, name, type, parentId',
      transactions: 'id, amount, type, accountId, toAccountId, categoryId, date, isRecurring'
    });
  }

  /**
   * Seeds the database with a robust set of initial categories if empty.
   * Idempotent check ensures it runs safely on every application reload.
   */
  async seedDefaultCategories(): Promise<void> {
    const existingCount = await this.categories.count();
    
    // If categories already exist, don't write duplicates
    if (existingCount > 0) return;

    const defaultCategories: Category[] = [
      // Core Income Categories
      { id: 'cat-salary', name: 'Salary', type: 'income' },
      { id: 'cat-investments', name: 'Investment Returns', type: 'income' },
      { id: 'cat-freelance', name: 'Freelance & Side Hustles', type: 'income' },
      { id: 'cat-income-other', name: 'Other Income', type: 'income' },

      // Essential Expense Categories
      { id: 'cat-food', name: 'Food & Dining', type: 'expense' },
      { id: 'cat-groceries', name: 'Groceries', type: 'expense' },
      { id: 'cat-rent', name: 'Rent & Housing', type: 'expense' },
      { id: 'cat-utilities', name: 'Bills & Utilities', type: 'expense' },
      { id: 'cat-transport', name: 'Fuel & Transport', type: 'expense' },
      
      // Lifestyle & Discretionary Expenses
      { id: 'cat-shopping', name: 'Shopping', type: 'expense' },
      { id: 'cat-entertainment', name: 'Entertainment & OTT', type: 'expense' },
      { id: 'cat-medical', name: 'Medical & Healthcare', type: 'expense' },
      { id: 'cat-expense-other', name: 'Miscellaneous', type: 'expense' }
    ];

    await this.categories.bulkAdd(defaultCategories);
  }
}

export const db = new KanjoosDatabase();