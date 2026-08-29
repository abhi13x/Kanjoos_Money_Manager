import Dexie, { type Table } from 'dexie';

// Define Account & Investment Types
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
  initialBalance: number; // Stored in smallest currency unit (e.g. cents/paise)
  currentBalance: number; // Stored in smallest currency unit
  currency: string;
  repeatInvestmentDate?: number; // Day of the month (1-31)
  interestRate?: number; // e.g. 7.1 for PPF, FD, RD
  expectedReturnRate?: number; // e.g. 12 for MF/stock CAGR
  statementDate?: number; // Day of the month (1-31)
  dueDate?: number; // Day of the month (1-31)
  monthlyInvestment?: number;
  startDate?: number; // Timestamp in ms
  tenureMonths?: number;
  investmentSubType?: InvestmentSubType;
  compoundingFrequency?: CompoundingFrequency;
  color?: string;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  parentId?: string | null;
  parentCategoryId?: string | null; // Compatibility key
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  amount: number; // Stored in smallest currency unit
  date: number; // Unix timestamp in ms
  type: 'expense' | 'income' | 'transfer';
  categoryId?: string;
  subCategoryId?: string | null;
  accountId?: string;
  toAccountId?: string;
  note?: string;
  description?: string;
  isRecurring?: boolean;
  repeatInterval?: string;
  updatedAt?: number;
}

class KanjoosDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super('KanjoosDatabase');

    // Dexie index rules:
    // 1. Only index fields queried via .where() or sorted via .orderBy()
    // 2. Added compound indexes [accountId+date] & [toAccountId+date] for fast ledger queries
    this.version(1).stores({
      accounts: 'id, type',
      categories: 'id, type, parentId, parentCategoryId',
      transactions: 'id, date, accountId, toAccountId, categoryId, isRecurring, [type+date], [categoryId+date], [accountId+date], [toAccountId+date]'
    });
  }

  /**
   * Seeds default parent and sub-categories idempotently.
   */
  async seedDefaultCategories(): Promise<void> {
    const existingCount = await this.categories.count();
    if (existingCount > 0) return;

    const defaultCategories: Category[] = [
      // Income Categories
      { id: 'cat-salary', name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981' },
      { id: 'cat-investments', name: 'Investment Returns', type: 'income', icon: 'trending-up', color: '#3B82F6' },
      { id: 'cat-freelance', name: 'Freelance & Side Hustles', type: 'income', icon: 'laptop', color: '#8B5CF6' },
      { id: 'cat-income-other', name: 'Other Income', type: 'income', icon: 'dollar-sign', color: '#6B7280' },

      // Essential Expense Categories
      { id: 'cat-food', name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#F59E0B' },
      { id: 'cat-groceries', name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#10B981' },
      { id: 'cat-rent', name: 'Rent & Housing', type: 'expense', icon: 'home', color: '#EF4444' },
      { id: 'cat-utilities', name: 'Bills & Utilities', type: 'expense', icon: 'zap', color: '#6366F1' },
      { id: 'cat-transport', name: 'Fuel & Transport', type: 'expense', icon: 'navigation', color: '#EC4899' },
      
      // Lifestyle & Discretionary Expenses
      { id: 'cat-shopping', name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#8B5CF6' },
      { id: 'cat-entertainment', name: 'Entertainment & OTT', type: 'expense', icon: 'film', color: '#A855F7' },
      { id: 'cat-netflix', name: 'Netflix', type: 'expense', parentId: 'cat-entertainment', parentCategoryId: 'cat-entertainment', color: '#E50914', icon: 'tv' },
      { id: 'cat-medical', name: 'Medical & Healthcare', type: 'expense', icon: 'activity', color: '#06B6D4' },
      { id: 'cat-expense-other', name: 'Miscellaneous', type: 'expense', icon: 'more-horizontal', color: '#9CA3AF' }
    ];

    // bulkPut safely handles existing keys without throwing BulkError
    await this.categories.bulkPut(defaultCategories);
  }
}

export const db = new KanjoosDatabase();