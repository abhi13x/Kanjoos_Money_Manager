import {
  calculateFD,
  calculateRD,
  calculateSIP,
  calculateLumpSum,
  calculatePPF,
  calculateEPFO,
  calculateNPS,
  calculateCAGR,
  buildProjection,
  type InvestmentResult,
  type InvestmentProjection,
} from '../../src/services/investmentFormulas';

describe('investmentFormulas', () => {
  describe('calculateFD', () => {
    it('should calculate maturity value for fixed deposit', () => {
      const result = calculateFD({
        principalCents: 100000, // 1000 INR
        annualRatePercent: 5,
        tenureMonths: 12,
        compoundingFrequency: 'quarterly',
      });

      // A = P * (1 + r/n)^(n*t)
      // P = 100000, r = 0.05, n = 4, t = 1
      // A = 100000 * (1 + 0.05/4)^(4*1) = 100000 * (1.0125)^4 ≈ 105094.53
      const expectedMaturity = Math.round(100000 * Math.pow(1 + 0.05/4, 4));
      expect(result.maturityValueCents).toBe(expectedMaturity);
      expect(result.totalInvestedCents).toBe(100000);
      expect(result.interestEarnedCents).toBe(expectedMaturity - 100000);
      expect(result.tenureMonths).toBe(12);
    });

    it('should handle zero principal', () => {
      const result = calculateFD({
        principalCents: 0,
        annualRatePercent: 5,
        tenureMonths: 12,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should handle zero tenure', () => {
      const result = calculateFD({
        principalCents: 100000,
        annualRatePercent: 5,
        tenureMonths: 0,
      });
      expect(result.maturityValueCents).toBe(100000);
      expect(result.totalInvestedCents).toBe(100000);
      expect(result.interestEarnedCents).toBe(0);
    });
  });

  describe('calculateRD', () => {
    it('should calculate maturity value for recurring deposit', () => {
      const result = calculateRD({
        monthlyDepositCents: 10000, // 100 INR per month
        annualRatePercent: 6,
        tenureMonths: 12,
      });

      // RBI standard RD formula: M = P * [((1 + R/400)^(n/3) - 1) / (1 - (1 + R/400)^(-1/3))]
      // where n/3 is the number of quarters in the tenure (n = tenure in months)
      // P = 10000, R = 6, n = 12 => 4 quarters
      const quarterlyBase = 1 + 6/400; // 1.015
      const numerator = Math.pow(quarterlyBase, 12/3) - 1; // (1.015^4 - 1)
      const denominator = 1 - Math.pow(quarterlyBase, -1/3);
      const expected = Math.round(10000 * numerator / denominator);
      expect(result.maturityValueCents).toBe(expected);
      expect(result.totalInvestedCents).toBe(10000 * 12);
      expect(result.interestEarnedCents).toBe(expected - 10000 * 12);
    });

    it('should return zero for zero monthly deposit', () => {
      const result = calculateRD({
        monthlyDepositCents: 0,
        annualRatePercent: 6,
        tenureMonths: 12,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should return zero for zero tenure', () => {
      const result = calculateRD({
        monthlyDepositCents: 10000,
        annualRatePercent: 6,
        tenureMonths: 0,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });
  });

  describe('calculateSIP', () => {
    it('should calculate maturity value for SIP', () => {
      const result = calculateSIP({
        monthlyInvestmentCents: 5000, // 50 INR per month
        annualReturnPercent: 12,
        tenureMonths: 24,
        depositAtBeginning: true,
      });

      // FV = P * [((1 + r_m)^n - 1) / r_m] * (1 + r_m)
      // P = 5000, r_m = 0.12/12/100 = 0.01, n = 24
      const r_m = 12/12/100; // 0.01
      // Actually, the code: r_m = annualReturnPercent / 12 / 100;
      // So for 12%: 12/12/100 = 0.01
      const annuityFactor = (Math.pow(1 + r_m, 24) - 1) / r_m;
      const sipValue = 5000 * annuityFactor * (1 + r_m);
      const expected = Math.round(sipValue);
      expect(result.maturityValueCents).toBe(expected);
      expect(result.totalInvestedCents).toBe(5000 * 24);
      expect(result.interestEarnedCents).toBe(expected - 5000 * 24);
    });

    it('should handle zero monthly investment', () => {
      const result = calculateSIP({
        monthlyInvestmentCents: 0,
        annualReturnPercent: 12,
        tenureMonths: 12,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should handle zero tenure', () => {
      const result = calculateSIP({
        monthlyInvestmentCents: 5000,
        annualReturnPercent: 12,
        tenureMonths: 0,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should handle existing balance', () => {
      const result = calculateSIP({
        monthlyInvestmentCents: 5000,
        annualReturnPercent: 12,
        tenureMonths: 12,
        existingBalanceCents: 100000,
      });
      // Existing balance grows at r_m per month
      const r_m = 12/12/100; // 0.01
      const existingGrowth = 100000 * Math.pow(1 + r_m, 12);
      const sipValue = 5000 * ((Math.pow(1 + r_m, 12) - 1) / r_m) * (1 + 0.01);
      const expectedMaturity = Math.round(sipValue + existingGrowth);
      const expectedInvested = 100000 + 5000 * 12;
      expect(result.maturityValueCents).toBe(expectedMaturity);
      expect(result.totalInvestedCents).toBe(expectedInvested);
      expect(result.interestEarnedCents).toBe(expectedMaturity - expectedInvested);
    });
  });

  describe('calculateLumpSum', () => {
    it('should calculate maturity value for lump sum', () => {
      const result = calculateLumpSum({
        principalCents: 200000, // 2000 INR
        annualReturnPercent: 8,
        tenureMonths: 36,
      });

      // FV = PV * (1 + r_m)^n
      // PV = 200000, r_m = 0.08/12/100 = 0.00006666...? Wait, same as above: annualReturnPercent / 12 / 100
      // Actually, the code: r_m = annualReturnPercent / 12 / 100;
      // So for 8%: 8/12/100 = 0.006666...
      const expected = Math.round(200000 * Math.pow(1 + 8/12/100, 36));
      expect(result.maturityValueCents).toBe(expected);
      expect(result.totalInvestedCents).toBe(200000);
      expect(result.interestEarnedCents).toBe(expected - 200000);
    });

    it('should handle zero principal', () => {
      const result = calculateLumpSum({
        principalCents: 0,
        annualReturnPercent: 8,
        tenureMonths: 12,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should handle zero tenure', () => {
      const result = calculateLumpSum({
        principalCents: 200000,
        annualReturnPercent: 8,
        tenureMonths: 0,
      });
      expect(result.maturityValueCents).toBe(200000);
      expect(result.totalInvestedCents).toBe(200000);
      expect(result.interestEarnedCents).toBe(0);
    });
  });

  describe('calculatePPF', () => {
    it('should calculate maturity value for PPF', () => {

      const smallResult = calculatePPF({
        monthlyDepositCents: 1000,
        annualRatePercent: 12,
        tenureMonths: 12,
      });
      // Interest accrues monthly on the running balance and is credited once a year.
      // monthlyRate = 12/12/100 = 0.01
      let balance = 0;
      let accrued = 0;
      const monthlyRate = 12 / 12 / 100;
      for (let m = 1; m <= 12; m++) {
        balance += 1000;
        accrued += balance * monthlyRate;
        if (m % 12 === 0) {
          balance += accrued;
          accrued = 0;
        }
      }
      balance += accrued;
      const expected = Math.round(balance);
      expect(smallResult.maturityValueCents).toBe(expected);
      expect(smallResult.totalInvestedCents).toBe(12000);
      expect(smallResult.interestEarnedCents).toBe(expected - 12000);
    });

    it('should handle zero monthly deposit', () => {
      const result = calculatePPF({
        monthlyDepositCents: 0,
        annualRatePercent: 7.1,
        tenureMonths: 12,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should handle zero tenure', () => {
      const result = calculatePPF({
        monthlyDepositCents: 1000,
        annualRatePercent: 7.1,
        tenureMonths: 0,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });
  });

  describe('calculateEPFO', () => {
    it('should calculate maturity value for EPFO', () => {
      const result = calculateEPFO({
        monthlyContributionCents: 2000,
        annualRatePercent: 8.5,
        tenureMonths: 24,
      });

      // Interest accrues monthly on the running balance and is credited once a year
      // (EPFO delegates to the same monthly-accrual formula as calculatePPF).
      let balance = 0;
      let accrued = 0;
      const monthlyRate = 8.5 / 12 / 100;
      for (let m = 1; m <= 24; m++) {
        balance += 2000;
        accrued += balance * monthlyRate;
        if (m % 12 === 0) {
          balance += accrued;
          accrued = 0;
        }
      }
      balance += accrued;
      const expected = Math.round(balance);
      expect(result.maturityValueCents).toBe(expected);
      expect(result.totalInvestedCents).toBe(2000 * 24);
      expect(result.interestEarnedCents).toBe(expected - 2000 * 24);
    });

    it('should handle zero monthly contribution', () => {
      const result = calculateEPFO({
        monthlyContributionCents: 0,
        annualRatePercent: 8.5,
        tenureMonths: 12,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });

    it('should handle zero tenure', () => {
      const result = calculateEPFO({
        monthlyContributionCents: 2000,
        annualRatePercent: 8.5,
        tenureMonths: 0,
      });
      expect(result.maturityValueCents).toBe(0);
      expect(result.totalInvestedCents).toBe(0);
      expect(result.interestEarnedCents).toBe(0);
    });
  });

  describe('calculateNPS', () => {
    it('should be identical to calculateSIP', () => {
      const params = {
        monthlyInvestmentCents: 3000,
        annualReturnPercent: 10,
        tenureMonths: 36,
        depositAtBeginning: true,
        existingBalanceCents: 50000,
      };
      const sipResult = calculateSIP(params);
      const npsResult = calculateNPS(params);
      expect(npsResult).toEqual(sipResult);
    });
  });

  describe('calculateCAGR', () => {
    it('should calculate CAGR correctly', () => {
      // Start 100000, end 200000 over 10 years (120 months)
      // CAGR = (200000/100000)^(1/10) - 1 = 2^(0.1) - 1 ≈ 0.07177 => 7.177%
      const cagr = calculateCAGR(100000, 200000, 120);
      expect(cagr).toBeCloseTo(7.177, 3);
    });

    it('should return 0 for zero start value', () => {
      const cagr = calculateCAGR(0, 100000, 12);
      expect(cagr).toBe(0);
    });

    it('should return 0 for zero months', () => {
      const cagr = calculateCAGR(100000, 200000, 0);
      expect(cagr).toBe(0);
    });

    it('should handle same start and end value', () => {
      const cagr = calculateCAGR(150000, 150000, 12);
      expect(cagr).toBe(0);
    });
  });

  describe('buildProjection', () => {
    it('should build projection from full result', () => {
      const fullResult: InvestmentResult = {
        maturityValueCents: 200000,
        totalInvestedCents: 100000,
        interestEarnedCents: 100000,
        tenureMonths: 24,
      };
      const projection: InvestmentProjection = buildProjection(fullResult, 12);
      // After half the time, investedSoFar = 50000
      // growthRatio = 200000/100000 = 2
      // projectedValue = 50000 * (2^(0.5)) = 50000 * sqrt(2) ≈ 70710
      const investedSoFar = 50000;
      const growthRatio = 2;
      const expected = Math.round(investedSoFar * Math.pow(growthRatio, 0.5));
      expect(projection.projectedValueCents).toBe(expected);
      expect(projection.remainingMonths).toBe(12);
      // annualizedReturnPercent should be CAGR from investedSoFar to projectedValue over 12 months
      const expectedCagr = calculateCAGR(investedSoFar, expected, 12);
      expect(projection.annualizedReturnPercent).toBeCloseTo(expectedCagr, 3);
    });

    it('should handle zero elapsed months', () => {
      const fullResult: InvestmentResult = {
        maturityValueCents: 200000,
        totalInvestedCents: 100000,
        interestEarnedCents: 100000,
        tenureMonths: 24,
      };
      const projection = buildProjection(fullResult, 0);
      expect(projection.projectedValueCents).toBe(fullResult.totalInvestedCents);
      expect(projection.remainingMonths).toBe(fullResult.tenureMonths);
      expect(projection.annualizedReturnPercent).toBe(0);
    });

    it('should handle elapsed months greater than tenure', () => {
      const fullResult: InvestmentResult = {
        maturityValueCents: 200000,
        totalInvestedCents: 100000,
        interestEarnedCents: 100000,
        tenureMonths: 24,
      };
      const projection = buildProjection(fullResult, 36); // more than tenure
      expect(projection.projectedValueCents).toBe(fullResult.maturityValueCents);
      expect(projection.remainingMonths).toBe(0);
      // annualizedReturnPercent should be CAGR from totalInvested to maturity over tenure
      const expectedCagr = calculateCAGR(fullResult.totalInvestedCents, fullResult.maturityValueCents, fullResult.tenureMonths);
      expect(projection.annualizedReturnPercent).toBeCloseTo(expectedCagr, 3);
    });
  });
});