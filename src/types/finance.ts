// types/finance.ts

import type { CompoundingFrequency, InvestmentSubType } from '../services/investmentFormulas';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit'
  | 'cash'
  | 'investment'
  | 'retirement'
  | 'wallet'
  | 'mutual_fund'
  | 'stock'
  | 'fd_rd'
  | 'scheme';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';
export type BudgetPeriod = 'monthly' | 'yearly';

export interface Account {
  id: string; // UUID
  name: string;
  type: AccountType;
  currency: string; // e.g., 'INR', 'USD', 'EUR'
  initialBalance: number; // In cents/paise
  currentBalance: number; // Tracked balance for performance
  createdAt: number; // Timestamp

  // Investment metadata fields
  investmentSubType?: InvestmentSubType;
  monthlyInvestment?: number;
  interestRate?: number;
  expectedReturnRate?: number;
  tenureMonths?: number;
  startDate?: number;
  compoundingFrequency?: CompoundingFrequency;
}

export interface Transaction {
  id: string; // UUID
  accountId: string; // UUID
  amount: number; // In cents/paise
  type: TransactionType;
  category: string;
  note?: string;
  date: number; // Timestamp
  toAccountId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string; // Lucide icon name
  color: string; // Hex or Tailwind color class
  parentId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amountLimit: number; // In cents/paise
  period: BudgetPeriod;
}

/** ISO currency codes that do not use fractional sub-units */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'CLP', 'PYG']);

/** Converts floating point input (e.g., 12.50) to integer cents (1250) */
export const toCents = (amount: number, currency = 'INR'): number => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
};

/** Converts integer cents (1250) back to floating point (12.50) */
export const fromCents = (cents: number, currency = 'INR'): number => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return cents;
  }
  return cents / 100;
};

const getFallbackLocale = (currency: string): string => {
  const code = currency.toUpperCase();
  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
  };
  return localeMap[code] || 'en-US';
};

/** Singleton instance cache to avoid heavy re-instantiation of Intl.NumberFormat */
const formatterCache = new Map<string, Intl.NumberFormat>();

/** Formats a cents/paise value dynamically based on currency code */
export const formatCurrency = (cents: number, currency = 'INR', locale?: string): string => {
  const upperCurrency = currency.toUpperCase();
  const targetLocale = locale || getFallbackLocale(upperCurrency);
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(upperCurrency);
  const cacheKey = `${targetLocale}:${upperCurrency}`;

  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: upperCurrency,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    });
    formatterCache.set(cacheKey, formatter);
  }

  return formatter.format(fromCents(cents, upperCurrency));
};