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

const roundCents = (amount: number): number => Math.round(amount);

const periodsPerYear = (freq: CompoundingFrequency): number => {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'annually': return 1;
  }
};

/** Months elapsed between two timestamps (partial months count as full for projection). */
export const getElapsedMonths = (startDate: number, asOf: number = Date.now()): number => {
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
  const n = periodsPerYear(params.compoundingFrequency ?? 'quarterly');
  const r = annualRatePercent / 100;
  const t = tenureMonths / 12;

  const maturityValueCents = roundCents(principalCents * Math.pow(1 + r / n, n * t));

  return {
    maturityValueCents,
    totalInvestedCents: principalCents,
    interestEarnedCents: maturityValueCents - principalCents,
    tenureMonths,
  };
};

/**
 * Recurring Deposit — RBI standard quarterly-compounding formula.
 * M = P × [((1 + R/400)^(4n) − 1) / (1 − (1 + R/400)^(−1/3))]
 * where P = monthly deposit, R = annual rate %, n = months.
 */
export const calculateRD = (params: {
  monthlyDepositCents: number;
  annualRatePercent: number;
  tenureMonths: number;
}): InvestmentResult => {
  const { monthlyDepositCents, annualRatePercent, tenureMonths } = params;
  const P = monthlyDepositCents;
  const n = tenureMonths;
  const R = annualRatePercent;

  if (n <= 0 || P <= 0) {
    return { maturityValueCents: 0, totalInvestedCents: 0, interestEarnedCents: 0, tenureMonths: n };
  }

  const quarterlyBase = 1 + R / 400;
  const maturityValueCents = roundCents(
    P * (Math.pow(quarterlyBase, 4 * n) - 1) / (1 - Math.pow(quarterlyBase, -1 / 3))
  );

  const totalInvestedCents = P * n;

  return {
    maturityValueCents,
    totalInvestedCents,
    interestEarnedCents: maturityValueCents - totalInvestedCents,
    tenureMonths: n,
  };
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
    return {
      maturityValueCents: existingBalanceCents,
      totalInvestedCents: existingBalanceCents,
      interestEarnedCents: 0,
      tenureMonths: 0,
    };
  }

  const r_m = annualReturnPercent / 12 / 100;
  let sipValue: number;

  if (r_m === 0) {
    sipValue = P * n;
  } else {
    const annuityFactor = (Math.pow(1 + r_m, n) - 1) / r_m;
    sipValue = P * annuityFactor * (depositAtBeginning ? 1 + r_m : 1);
  }

  const existingGrowth = existingBalanceCents > 0 && r_m !== 0
    ? existingBalanceCents * Math.pow(1 + r_m, n)
    : existingBalanceCents;

  const maturityValueCents = roundCents(sipValue + existingGrowth);
  const totalInvestedCents = existingBalanceCents + P * n;

  return {
    maturityValueCents,
    totalInvestedCents,
    interestEarnedCents: maturityValueCents - totalInvestedCents,
    tenureMonths: n,
  };
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
  const r_m = annualReturnPercent / 12 / 100;
  const maturityValueCents = roundCents(principalCents * Math.pow(1 + r_m, tenureMonths));

  return {
    maturityValueCents,
    totalInvestedCents: principalCents,
    interestEarnedCents: maturityValueCents - principalCents,
    tenureMonths,
  };
};

/**
 * PPF — monthly deposits with annual compounding (simulated month-by-month).
 * Interest is credited once per year on the accumulated balance.
 */
export const calculatePPF = (params: {
  monthlyDepositCents: number;
  annualRatePercent: number;
  tenureMonths: number;
  existingBalanceCents?: number;
}): InvestmentResult => {
  const { monthlyDepositCents, annualRatePercent, tenureMonths, existingBalanceCents = 0 } = params;
  let balance = existingBalanceCents;

  for (let month = 1; month <= tenureMonths; month++) {
    balance += monthlyDepositCents;
    if (month % 12 === 0) {
      balance += balance * (annualRatePercent / 100);
    }
  }

  // Pro-rate partial final year (PPF credits at year-end; approximate for remaining months)
  const remainderMonths = tenureMonths % 12;
  if (remainderMonths > 0) {
    balance += balance * (annualRatePercent / 100) * (remainderMonths / 12);
  }

  const maturityValueCents = roundCents(balance);
  const totalInvestedCents = existingBalanceCents + monthlyDepositCents * tenureMonths;

  return {
    maturityValueCents,
    totalInvestedCents,
    interestEarnedCents: maturityValueCents - totalInvestedCents,
    tenureMonths,
  };
};

/**
 * EPFO — monthly employee contribution with annual interest credit.
 * Same simulation model as PPF but typically no partial-year pro-rating.
 */
export const calculateEPFO = (params: {
  monthlyContributionCents: number;
  annualRatePercent: number;
  tenureMonths: number;
  existingBalanceCents?: number;
}): InvestmentResult => {
  const { monthlyContributionCents, annualRatePercent, tenureMonths, existingBalanceCents = 0 } = params;
  let balance = existingBalanceCents;

  for (let month = 1; month <= tenureMonths; month++) {
    balance += monthlyContributionCents;
    if (month % 12 === 0) {
      balance += balance * (annualRatePercent / 100);
    }
  }

  const maturityValueCents = roundCents(balance);
  const totalInvestedCents = existingBalanceCents + monthlyContributionCents * tenureMonths;

  return {
    maturityValueCents,
    totalInvestedCents,
    interestEarnedCents: maturityValueCents - totalInvestedCents,
    tenureMonths,
  };
};

/** NPS — market-linked; modeled as SIP with expected return. */
export const calculateNPS = calculateSIP;

/** CAGR from start value to end value over a period in months. */
export const calculateCAGR = (
  startValueCents: number,
  endValueCents: number,
  months: number
): number => {
  if (startValueCents <= 0 || months <= 0) return 0;
  const years = months / 12;
  return (Math.pow(endValueCents / startValueCents, 1 / years) - 1) * 100;
};

/** Build a partial-tenure projection from a full maturity calculation. */
export const buildProjection = (
  fullResult: InvestmentResult,
  elapsedMonths: number
): InvestmentProjection => {
  const elapsed = Math.min(elapsedMonths, fullResult.tenureMonths);
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
  // Interpolate invested amount linearly; growth follows compound curve via power scaling
  const investedSoFar = roundCents(fullResult.totalInvestedCents * progressRatio);
  const growthRatio = fullResult.totalInvestedCents > 0
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
