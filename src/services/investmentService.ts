import type { Account, AccountType } from '@/db/schema';
import {
  type InvestmentProjection,
  type InvestmentResult,
  type InvestmentSubType,
  buildProjection,
  calculateCAGR,
  calculateEPFO,
  calculateFD,
  calculateLumpSum,
  calculateNPS,
  calculatePPF,
  calculateRD,
  calculateSIP,
  getElapsedMonths,
} from './investmentFormulas';

const INVESTMENT_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set([
  'mutual_fund',
  'stock',
  'fd_rd',
  'scheme',
]);

export const isInvestmentAccount = (type: AccountType): boolean =>
  INVESTMENT_ACCOUNT_TYPES.has(type);

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

/** Unified calculation dispatcher for any duration/tenure. */
export const calculateInvestmentForDuration = (
  account: Account,
  subType: InvestmentSubType,
  tenureMonths: number
): InvestmentResult | null => {
  const rate = getRatePercent(account);
  if (rate === undefined || tenureMonths <= 0) return null;

  const monthlyInvestment = account.monthlyInvestment ?? 0;
  const initialBalance = account.initialBalance ?? 0;
  const currentBalance = account.currentBalance ?? initialBalance;
  const { compoundingFrequency } = account;

  switch (subType) {
    case 'fd':
      return calculateFD({
        principalCents: currentBalance,
        annualRatePercent: rate,
        tenureMonths,
        compoundingFrequency,
      });

    case 'rd':
      if (monthlyInvestment <= 0) return null;
      return calculateRD({
        monthlyDepositCents: monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths,
      });

    case 'sip':
      if (monthlyInvestment <= 0 && initialBalance <= 0) return null;
      return calculateSIP({
        monthlyInvestmentCents: monthlyInvestment,
        annualReturnPercent: rate,
        tenureMonths,
        existingBalanceCents: initialBalance,
      });

    case 'lumpsum':
      return calculateLumpSum({
        principalCents: currentBalance,
        annualReturnPercent: rate,
        tenureMonths,
      });

    case 'ppf':
      if (monthlyInvestment <= 0 && initialBalance <= 0) return null;
      return calculatePPF({
        monthlyDepositCents: monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths,
        existingBalanceCents: initialBalance,
      });

    case 'nps':
      if (monthlyInvestment <= 0 && initialBalance <= 0) return null;
      return calculateNPS({
        monthlyInvestmentCents: monthlyInvestment,
        annualReturnPercent: rate,
        tenureMonths,
        existingBalanceCents: initialBalance,
      });

    case 'epfo':
      if (monthlyInvestment <= 0 && initialBalance <= 0) return null;
      return calculateEPFO({
        monthlyContributionCents: monthlyInvestment,
        annualRatePercent: rate,
        tenureMonths,
        existingBalanceCents: initialBalance,
      });

    default:
      return null;
  }
};

/** Project maturity and current value for an investment account. */
export const projectInvestment = (
  account: Account,
  asOf: number = Date.now()
): InvestmentProjection | null => {
  if (!isInvestmentAccount(account.type)) return null;

  const subType = resolveInvestmentSubType(account);
  if (!subType || !account.tenureMonths) return null;

  const fullResult = calculateInvestmentForDuration(account, subType, account.tenureMonths);
  if (!fullResult) return null;

  const elapsedMonths = account.startDate
    ? Math.min(getElapsedMonths(account.startDate, asOf), fullResult.tenureMonths)
    : 0;

  if (elapsedMonths <= 0) {
    return buildProjection(fullResult, 0);
  }

  const intermediateResult = calculateInvestmentForDuration(account, subType, elapsedMonths);
  if (!intermediateResult) return buildProjection(fullResult, 0);

  const projectedValueCents = intermediateResult.maturityValueCents;
  const isLumpSumType = subType === 'fd' || subType === 'lumpsum';
  
  const investedSoFar = isLumpSumType
    ? (account.initialBalance ?? account.currentBalance ?? 0)
    : (account.initialBalance ?? 0) + (account.monthlyInvestment ?? 0) * elapsedMonths;

  const annualizedReturnPercent = calculateCAGR(investedSoFar, projectedValueCents, elapsedMonths);

  return {
    ...fullResult,
    projectedValueCents,
    remainingMonths: fullResult.tenureMonths - elapsedMonths,
    annualizedReturnPercent,
  };
};

export interface InvestmentSummary {
  account: Account;
  subType: InvestmentSubType;
  projection: InvestmentProjection;
}

/** Aggregate projections for all investment accounts with sufficient metadata. */
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

export * from './investmentFormulas';