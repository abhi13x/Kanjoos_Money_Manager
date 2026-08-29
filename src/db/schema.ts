import Dexie, { type Table } from 'dexie';

export type AccountType = 
  | 'cash' 
  | 'savings' 
  | 'wallet' 
  | 'credit_card' 
  | 'debit_card' 
  | 'mutual_fund' 
  | 'stock' 
  | 'fd_rd' 
  | 'scheme';

export type InvestmentSubType = 'fd' | 'rd' | 'sip' | 'lumpsum' | 'ppf' | 'nps' | 'epfo';
export type CompoundingFrequency = 'monthly' | 'quarterly' | 'annually';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  updatedAt: number;               // ✅ added
  repeatInvestmentDate?: number;
  interestRate?: number;
  expectedReturnRate?: number;
  statementDate?: number;
  dueDate?: number;
  monthlyInvestment?: number;
  startDate?: number;
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
  parentCategoryId?: string | null;
  color?: string;
  icon?: string;
  updatedAt: number;               // ✅ added
}

export interface Transaction {
  id: string;
  amount: number;
  date: number;
  type: 'expense' | 'income' | 'transfer';
  categoryId?: string;
  subCategoryId?: string | null;
  accountId?: string;
  toAccountId?: string;
  note?: string;
  description?: string;
  isRecurring?: boolean;
  repeatInterval?: string;
  updatedAt: number;               // ✅ made required
}

class KanjoosDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super('KanjoosDatabase');

    this.version(1).stores({
      accounts: 'id, type',
      categories: 'id, type, parentId, parentCategoryId',
      transactions: 'id, date, accountId, toAccountId, categoryId, isRecurring, [type+date], [categoryId+date], [accountId+date], [toAccountId+date]'
    });
  }

  async seedDefaultCategories(): Promise<void> {
    const existingCount = await this.categories.count();
    if (existingCount > 0) return;

    const now = Date.now();
    const defaultCategories: Category[] = [
      { id: 'cat-salary', name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981', updatedAt: now },
      { id: 'cat-investments', name: 'Investment Returns', type: 'income', icon: 'trending-up', color: '#3B82F6', updatedAt: now },
      { id: 'cat-freelance', name: 'Freelance & Side Hustles', type: 'income', icon: 'laptop', color: '#8B5CF6', updatedAt: now },
      { id: 'cat-income-other', name: 'Other Income', type: 'income', icon: 'dollar-sign', color: '#6B7280', updatedAt: now },
      { id: 'cat-food', name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#F59E0B', updatedAt: now },
      { id: 'cat-groceries', name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#10B981', updatedAt: now },
      { id: 'cat-rent', name: 'Rent & Housing', type: 'expense', icon: 'home', color: '#EF4444', updatedAt: now },
      { id: 'cat-utilities', name: 'Bills & Utilities', type: 'expense', icon: 'zap', color: '#6366F1', updatedAt: now },
      { id: 'cat-transport', name: 'Fuel & Transport', type: 'expense', icon: 'navigation', color: '#EC4899', updatedAt: now },
      { id: 'cat-shopping', name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#8B5CF6', updatedAt: now },
      { id: 'cat-entertainment', name: 'Entertainment & OTT', type: 'expense', icon: 'film', color: '#A855F7', updatedAt: now },
      { id: 'cat-netflix', name: 'Netflix', type: 'expense', parentId: 'cat-entertainment', parentCategoryId: 'cat-entertainment', color: '#E50914', icon: 'tv', updatedAt: now },
      { id: 'cat-medical', name: 'Medical & Healthcare', type: 'expense', icon: 'activity', color: '#06B6D4', updatedAt: now },
      { id: 'cat-expense-other', name: 'Miscellaneous', type: 'expense', icon: 'more-horizontal', color: '#9CA3AF', updatedAt: now }
    ];

    await this.categories.bulkPut(defaultCategories);
  }
}

export const db = new KanjoosDatabase();