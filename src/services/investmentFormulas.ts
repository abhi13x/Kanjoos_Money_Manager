/**
 * Investment formula library for Indian financial instruments.
 * All monetary inputs/outputs are in cents (paise) unless noted.
 */

export type CompoundingFrequency = 'monthly' | 'quarterly' | 'annually';
export type InvestmentSubType = 'fd' | 'rd' | 'sip' | 'lumpsum' | 'ppf' | 'nps' | 'epfo';

export interface InvestmentResult {
  maturityValueCents: number;
  totalInvestedCents: number;
  interestEarnedCents: number;
  tenureMonths: number;
}

export interface InvestmentProjection extends InvestmentResult {
  /** Value projected as of the evaluation date (partial tenure). */
  projectedValueCents: number;
  remainingMonths: number;
  /** Effective annual return implied by the projection. */
  annualizedReturnPercent: number;
}

const roundCents = (amount: number): number => (Number.isFinite(amount) ? Math.round(amount) : 0);

const PERIODS_PER_YEAR: Readonly<Record<CompoundingFrequency, number>> = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

/** Unified result constructor for clean math rounding and consistency. */
const createResult = (
  maturityValueCents: number,
  totalInvestedCents: number,
  tenureMonths: number
): InvestmentResult => {
  const roundedMaturity = roundCents(maturityValueCents);
  const roundedInvested = roundCents(totalInvestedCents);
  return {
    maturityValueCents: roundedMaturity,
    totalInvestedCents: roundedInvested,
    interestEarnedCents: roundedMaturity - roundedInvested,
    tenureMonths: Math.max(0, tenureMonths),
  };
};

/** Months elapsed between two timestamps (partial months count as full for projection). */
export const getElapsedMonths = (startDate: number, asOf: number = Date.now()): number => {
  if (!startDate || isNaN(startDate)) return 0;
  const start = new Date(startDate);
  const end = new Date(asOf);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
};

/**
 * Fixed Deposit — compound interest.
 * A = P × (1 + r/n)^(n×t)
 */
export const calculateFD = (params: {
  principalCents: number;
  annualRatePercent: number;
  tenureMonths: number;
  compoundingFrequency?: CompoundingFrequency;
}): InvestmentResult => {
  const { principalCents, annualRatePercent, tenureMonths } = params;
  if (tenureMonths <= 0 || principalCents <= 0) {
    return createResult(principalCents, principalCents, tenureMonths);
  }

  const n = PERIODS_PER_YEAR[params.compoundingFrequency ?? 'quarterly'];
  const r = annualRatePercent / 100;
  const t = tenureMonths / 12;

  const maturityValueCents = principalCents * Math.pow(1 + r / n, n * t);
  return createResult(maturityValueCents, principalCents, tenureMonths);
};

/**
 * Recurring Deposit — RBI standard quarterly-compounding formula.
 * M = P × [((1 + R/400)^(4n) − 1) / (1 − (1 + R/400)^(−1/3))]
 */
export const calculateRD = (params: {
  monthlyDepositCents: number;
  annualRatePercent: number;
  tenureMonths: number;
}): InvestmentResult => {
  const { monthlyDepositCents: P, annualRatePercent: R, tenureMonths: n } = params;

  if (n <= 0 || P <= 0) {
    return createResult(0, 0, n);
  }

  const quarterlyBase = 1 + R / 400;
  const maturityValueCents =
    P * (Math.pow(quarterlyBase, 4 * n) - 1) / (1 - Math.pow(quarterlyBase, -1 / 3));
  const totalInvestedCents = P * n;

  return createResult(maturityValueCents, totalInvestedCents, n);
};

/**
 * SIP / mutual fund — future value of annuity (deposit at start of each month).
 * FV = P × [((1 + r_m)^n − 1) / r_m] × (1 + r_m)
 */
export const calculateSIP = (params: {
  monthlyInvestmentCents: number;
  annualReturnPercent: number;
  tenureMonths: number;
  depositAtBeginning?: boolean;
  existingBalanceCents?: number;
}): InvestmentResult => {
  const {
    monthlyInvestmentCents: P,
    annualReturnPercent,
    tenureMonths: n,
    depositAtBeginning = true,
    existingBalanceCents = 0,
  } = params;

  if (n <= 0) {
    return createResult(existingBalanceCents, existingBalanceCents, 0);
  }

  const r_m = annualReturnPercent / 12 / 100;
  let sipValue: number;

  if (r_m === 0) {
    sipValue = P * n;
  } else {
    const annuityFactor = (Math.pow(1 + r_m, n) - 1) / r_m;
    sipValue = P * annuityFactor * (depositAtBeginning ? 1 + r_m : 1);
  }

  const existingGrowth =
    existingBalanceCents > 0 && r_m !== 0
      ? existingBalanceCents * Math.pow(1 + r_m, n)
      : existingBalanceCents;

  const totalInvestedCents = existingBalanceCents + P * n;
  return createResult(sipValue + existingGrowth, totalInvestedCents, n);
};

/**
 * Lump-sum equity investment — compound growth.
 * FV = PV × (1 + r_m)^n
 */
export const calculateLumpSum = (params: {
  principalCents: number;
  annualReturnPercent: number;
  tenureMonths: number;
}): InvestmentResult => {
  const { principalCents, annualReturnPercent, tenureMonths } = params;
  if (tenureMonths <= 0 || principalCents <= 0) {
    return createResult(principalCents, principalCents, tenureMonths);
  }

  const r_m = annualReturnPercent / 12 / 100;
  const maturityValueCents = principalCents * Math.pow(1 + r_m, tenureMonths);

  return createResult(maturityValueCents, principalCents, tenureMonths);
};

/**
 * PPF — monthly deposits with annual compounding (simulated month-by-month).
 */
export const calculatePPF = (params: {
  monthlyDepositCents: number;
  annualRatePercent: number;
  tenureMonths: number;
  existingBalanceCents?: number;
}): InvestmentResult => {
  const { monthlyDepositCents, annualRatePercent, tenureMonths, existingBalanceCents = 0 } = params;
  if (tenureMonths <= 0) {
    return createResult(existingBalanceCents, existingBalanceCents, 0);
  }

  let balance = existingBalanceCents;
  const rateFraction = annualRatePercent / 100;

  for (let month = 1; month <= tenureMonths; month++) {
    balance += monthlyDepositCents;
    if (month % 12 === 0) {
      balance += balance * rateFraction;
    }
  }

  const remainderMonths = tenureMonths % 12;
  if (remainderMonths > 0) {
    balance += balance * rateFraction * (remainderMonths / 12);
  }

  const totalInvestedCents = existingBalanceCents + monthlyDepositCents * tenureMonths;
  return createResult(balance, totalInvestedCents, tenureMonths);
};

/**
 * EPFO — monthly employee contribution with annual interest credit.
 */
export const calculateEPFO = (params: {
  monthlyContributionCents: number;
  annualRatePercent: number;
  tenureMonths: number;
  existingBalanceCents?: number;
}): InvestmentResult => {
  const { monthlyContributionCents, annualRatePercent, tenureMonths, existingBalanceCents = 0 } = params;
  if (tenureMonths <= 0) {
    return createResult(existingBalanceCents, existingBalanceCents, 0);
  }

  let balance = existingBalanceCents;
  const rateFraction = annualRatePercent / 100;

  for (let month = 1; month <= tenureMonths; month++) {
    balance += monthlyContributionCents;
    if (month % 12 === 0) {
      balance += balance * rateFraction;
    }
  }

  const totalInvestedCents = existingBalanceCents + monthlyContributionCents * tenureMonths;
  return createResult(balance, totalInvestedCents, tenureMonths);
};

/** NPS — market-linked; modeled as SIP with expected return. */
export const calculateNPS = calculateSIP;

/** CAGR from start value to end value over a period in months. */
export const calculateCAGR = (
  startValueCents: number,
  endValueCents: number,
  months: number
): number => {
  if (startValueCents <= 0 || endValueCents <= 0 || months <= 0) return 0;
  const years = months / 12;
  const cagr = (Math.pow(endValueCents / startValueCents, 1 / years) - 1) * 100;
  return Number.isFinite(cagr) ? cagr : 0;
};

/** Build a partial-tenure projection from a full maturity calculation. */
export const buildProjection = (
  fullResult: InvestmentResult,
  elapsedMonths: number
): InvestmentProjection => {
  const elapsed = Math.min(Math.max(0, elapsedMonths), fullResult.tenureMonths);
  const remainingMonths = fullResult.tenureMonths - elapsed;

  if (elapsed <= 0 || fullResult.tenureMonths <= 0) {
    return {
      ...fullResult,
      projectedValueCents: fullResult.totalInvestedCents,
      remainingMonths: fullResult.tenureMonths,
      annualizedReturnPercent: 0,
    };
  }

  const progressRatio = elapsed / fullResult.tenureMonths;
  const investedSoFar = roundCents(fullResult.totalInvestedCents * progressRatio);
  const growthRatio =
    fullResult.totalInvestedCents > 0
      ? fullResult.maturityValueCents / fullResult.totalInvestedCents
      : 1;

  const projectedValueCents = roundCents(investedSoFar * Math.pow(growthRatio, progressRatio));

  return {
    ...fullResult,
    projectedValueCents,
    remainingMonths,
    annualizedReturnPercent: calculateCAGR(investedSoFar, projectedValueCents, elapsed),
  };
};