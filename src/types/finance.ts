// types/finance.ts
// Note: the canonical domain types (Account, Transaction, Category) live in src/db/schema.ts.
// This module only owns currency/money formatting utilities.

/** ISO currency codes that do not use fractional sub‑units */
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

const formatterCache = new Map<string, Intl.NumberFormat>();

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