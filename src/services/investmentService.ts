import type { Account, AccountType } from '@/db/schema';
import {
  type InvestmentProjection,
  type InvestmentResult,
  type InvestmentSubType,
  buildProjection,
  calculateEPFO,
  calculateFD,
  calculateLumpSum,
  calculateNPS,
  calculatePPF,
  calculateRD,
  calculateSIP,
  getElapsedMonths,
} from './investmentFormulas';

const INVESTMENT_ACCOUNT_TYPES: AccountType[] = ['mutual_fund', 'stock', 'fd_rd', 'scheme'];

export const isInvestmentAccount = (type: AccountType): boolean =>
  INVESTMENT_ACCOUNT_TYPES.includes(type);

/** Resolve the formula sub-type from account metadata. */
export const resolveInvestmentSubType = (account: Account): InvestmentSubType | null => {
  if (account.investmentSubType) return account.investmentSubType;

  switch (account.type) {
    case 'fd_rd':
      return account.monthlyInvestment && account.monthlyInvestment > 0 ? 'rd' : 'fd';
    case 'mutual_fund':
      return 'sip';
    case 'stock':
      return 'lumpsum';
    case 'scheme':
      return 'ppf';
    default:
      return null;
  }
};

export const getRatePercent = (account: Account): number | undefined =>
  account.interestRate ?? account.expectedReturnRate;

const computeFullMaturity = (account: Account, subType: InvestmentSubType): InvestmentResult | null => {
  const rate = getRatePercent(account);
  const tenureMonths = account.tenureMonths;
  if (!rate || !tenureMonths || tenureMonths <= 0) return null;

  switch (subType) {
    case 'fd':
      return calculateFD({
        principalCents: account.currentBalance,
        annualRatePercent: rate,
        tenureMonths,
        compoundingFrequency: account.compoundingFrequency,
      });

    case 'rd':
      if (!account.monthlyInvestment) return null;
      return calculateRD({
        monthlyDepositCents: account.monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths,
      });

    case 'sip':
      if (!account.monthlyInvestment) return null;
      return calculateSIP({
        monthlyInvestmentCents: account.monthlyInvestment,
        annualReturnPercent: rate,
        tenureMonths,
        existingBalanceCents: account.initialBalance,
      });

    case 'lumpsum':
      return calculateLumpSum({
        principalCents: account.currentBalance,
        annualReturnPercent: rate,
        tenureMonths,
      });

    case 'ppf':
      if (!account.monthlyInvestment) return null;
      return calculatePPF({
        monthlyDepositCents: account.monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths,
        existingBalanceCents: account.initialBalance,
      });

    case 'nps':
      if (!account.monthlyInvestment) return null;
      return calculateNPS({
        monthlyInvestmentCents: account.monthlyInvestment,
        annualReturnPercent: rate,
        tenureMonths,
        existingBalanceCents: account.initialBalance,
      });

    case 'epfo':
      if (!account.monthlyInvestment) return null;
      return calculateEPFO({
        monthlyContributionCents: account.monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths,
        existingBalanceCents: account.initialBalance,
      });

    default:
      return null;
  }
};

const computeAtMonth = (account: Account, subType: InvestmentSubType, months: number): number | null => {
  const rate = getRatePercent(account);
  if (!rate || months <= 0) return null;

  switch (subType) {
    case 'fd':
      return calculateFD({
        principalCents: account.currentBalance,
        annualRatePercent: rate,
        tenureMonths: months,
        compoundingFrequency: account.compoundingFrequency,
      }).maturityValueCents;

    case 'rd':
      if (!account.monthlyInvestment) return null;
      return calculateRD({
        monthlyDepositCents: account.monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths: months,
      }).maturityValueCents;

    case 'sip':
      if (!account.monthlyInvestment) return null;
      return calculateSIP({
        monthlyInvestmentCents: account.monthlyInvestment,
        annualReturnPercent: rate,
        tenureMonths: months,
        existingBalanceCents: account.initialBalance,
      }).maturityValueCents;

    case 'lumpsum':
      return calculateLumpSum({
        principalCents: account.currentBalance,
        annualReturnPercent: rate,
        tenureMonths: months,
      }).maturityValueCents;

    case 'ppf':
      if (!account.monthlyInvestment) return null;
      return calculatePPF({
        monthlyDepositCents: account.monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths: months,
        existingBalanceCents: account.initialBalance,
      }).maturityValueCents;

    case 'nps':
      if (!account.monthlyInvestment) return null;
      return calculateNPS({
        monthlyInvestmentCents: account.monthlyInvestment,
        annualReturnPercent: rate,
        tenureMonths: months,
        existingBalanceCents: account.initialBalance,
      }).maturityValueCents;

    case 'epfo':
      if (!account.monthlyInvestment) return null;
      return calculateEPFO({
        monthlyContributionCents: account.monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths: months,
        existingBalanceCents: account.initialBalance,
      }).maturityValueCents;

    default:
      return null;
  }
};

/** Project maturity and current value for an investment account. */
export const projectInvestment = (account: Account, asOf: number = Date.now()): InvestmentProjection | null => {
  if (!isInvestmentAccount(account.type)) return null;

  const subType = resolveInvestmentSubType(account);
  if (!subType) return null;

  const fullResult = computeFullMaturity(account, subType);
  if (!fullResult) return null;

  const elapsedMonths = account.startDate
    ? Math.min(getElapsedMonths(account.startDate, asOf), fullResult.tenureMonths)
    : 0;

  if (elapsedMonths <= 0) {
    return buildProjection(fullResult, 0);
  }

  const projectedValueCents = computeAtMonth(account, subType, elapsedMonths);
  if (projectedValueCents === null) return buildProjection(fullResult, 0);

  const investedSoFar = subType === 'fd' || subType === 'lumpsum'
    ? account.currentBalance
    : (account.initialBalance ?? 0) + (account.monthlyInvestment ?? 0) * elapsedMonths;

  return {
    ...fullResult,
    projectedValueCents,
    remainingMonths: fullResult.tenureMonths - elapsedMonths,
    annualizedReturnPercent: investedSoFar > 0
      ? ((projectedValueCents / investedSoFar) ** (12 / elapsedMonths) - 1) * 100
      : 0,
  };
};

export interface InvestmentSummary {
  account: Account;
  subType: InvestmentSubType;
  projection: InvestmentProjection;
}

/** Aggregate projections for all investment accounts that have sufficient metadata. */
export const getInvestmentSummaries = (accounts: Account[]): InvestmentSummary[] =>
  accounts
    .filter((a) => isInvestmentAccount(a.type))
    .map((account) => {
      const subType = resolveInvestmentSubType(account);
      const projection = projectInvestment(account);
      if (!subType || !projection) return null;
      return { account, subType, projection };
    })
    .filter((s): s is InvestmentSummary => s !== null);

export const getTotalProjectedMaturity = (accounts: Account[]): number =>
  getInvestmentSummaries(accounts).reduce((sum, s) => sum + s.projection.maturityValueCents, 0);

export const getTotalProjectedInterest = (accounts: Account[]): number =>
  getInvestmentSummaries(accounts).reduce((sum, s) => sum + s.projection.interestEarnedCents, 0);

// Re-export formulas for direct use
export * from './investmentFormulas';
