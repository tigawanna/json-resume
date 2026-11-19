import { describe, expect, it } from "vitest";
import { deriveBreakdown, hoursPerWeekFromMonthly, periodHours } from "./breakdown";
import { FALLBACK_RATES, convert } from "./currencies";
import { KRA_CONFIG, SHIPPED_KRA_CONFIG } from "./kra";
import { resolveKraConfig } from "./kra-overrides";
import { calculatePaye, grossForNet } from "./paye";
import { calculateNssf, calculateShif, calculateStatutory, grossForNetSalary } from "./statutory";

describe("deriveBreakdown", () => {
  it("turns an hourly rate into week, month and year figures", () => {
    const result = deriveBreakdown({ hourlyUsd: 10, hoursPerWeek: 40, weeksPerMonth: 4 });
    expect(result.hoursPerMonth).toBe(160);
    expect(result.weekly).toBe(400);
    expect(result.monthly).toBe(1600);
    expect(result.annual).toBe(19_200);
    expect(result.scenarios.map((item) => item.monthly)).toEqual([1600, 1700, 1800]);
  });

  it("guards against zero or invalid inputs", () => {
    const result = deriveBreakdown({ hourlyUsd: Number.NaN, hoursPerWeek: -5, weeksPerMonth: 0 });
    expect(result.monthly).toBe(0);
    expect(result.hoursPerMonth).toBe(0);
  });

  it("maps each period to its hours", () => {
    expect(periodHours("hour", 40, 4)).toBe(1);
    expect(periodHours("week", 40, 4)).toBe(40);
    expect(periodHours("month", 40, 4)).toBe(160);
  });

  it("derives hours per week from monthly hours", () => {
    expect(hoursPerWeekFromMonthly(175, 4)).toBe(43.75);
    expect(hoursPerWeekFromMonthly(180, 4.5)).toBe(40);
  });
});

describe("currency conversion", () => {
  it("round-trips through the fallback table", () => {
    expect(convert(100, "USD", "KES", FALLBACK_RATES)).toBe(12_900);
    expect(convert(12_900, "KES", "USD", FALLBACK_RATES)).toBeCloseTo(100, 6);
  });

  it("falls back to the bundled rate for an unknown code", () => {
    expect(convert(1, "USD", "KES", {})).toBe(129);
  });
});

describe("KRA PAYE", () => {
  it("applies personal relief at the first band boundary", () => {
    const result = calculatePaye({ annualGross: 288_000 });
    expect(result.taxBeforeRelief).toBe(KRA_CONFIG.paye.personalReliefAnnual);
    expect(result.tax).toBe(0);
    expect(result.net).toBe(288_000);
  });

  it("spills into the next band correctly", () => {
    const result = calculatePaye({ annualGross: 388_000 });
    expect(result.tax).toBe(25_000);
    expect(result.net).toBe(363_000);
    expect(result.bands).toHaveLength(2);
  });

  it("calculates the top bands", () => {
    const result = calculatePaye({ annualGross: 6_000_000 });
    expect(result.taxBeforeRelief).toBe(1_737_400);
    expect(result.tax).toBe(1_708_600);
  });

  it("inverts net pay back into the required gross", () => {
    const targetNet = 3_600_000;
    expect(calculatePaye({ annualGross: grossForNet({ annualNet: targetNet }) }).net).toBeCloseTo(targetNet, 2);
  });

  it("never produces a negative tax", () => {
    expect(calculatePaye({ annualGross: 0 }).tax).toBe(0);
    expect(calculatePaye({ annualGross: 100_000 }).tax).toBe(0);
  });
});

describe("statutory deductions", () => {
  const salaried = { nssf: true, shif: true, ahl: true };

  it("splits NSSF into Year 4 tiers and caps at KES 108,000", () => {
    expect(calculateNssf({ grossMonthly: 8_000 })).toEqual({
      tierOne: 480,
      tierTwo: 0,
      total: 480,
      pensionable: 8_000,
    });
    expect(calculateNssf({ grossMonthly: 100_000 }).total).toBe(6_000);
    expect(calculateNssf({ grossMonthly: 200_000 }).total).toBe(6_480);
  });

  it("applies the SHIF minimum and rate", () => {
    expect(calculateShif({ grossMonthly: 0 })).toBe(0);
    expect(calculateShif({ grossMonthly: 5_000 })).toBe(300);
    expect(calculateShif({ grossMonthly: 100_000 })).toBe(2_750);
  });

  it("computes PAYE on gross less NSSF, SHIF and housing levy", () => {
    const result = calculateStatutory({ grossMonthly: 100_000, deductions: salaried });
    expect(result.nssf.total).toBe(6_000);
    expect(result.shif).toBe(2_750);
    expect(result.ahl).toBe(1_500);
    expect(result.taxable).toBe(89_750);
    expect(result.paye).toBeCloseTo(19_308.33, 2);
    expect(result.totalDeductions).toBeCloseTo(29_558.33, 2);
    expect(result.net).toBeCloseTo(70_441.67, 2);
  });

  it("can exclude every statutory contribution", () => {
    const result = calculateStatutory({
      grossMonthly: 100_000,
      deductions: { nssf: false, shif: false, ahl: false },
    });
    expect(result.taxable).toBe(100_000);
    expect(result.paye).toBeCloseTo(calculatePaye({ annualGross: 1_200_000 }).tax / 12, 6);
  });

  it("inverts the full salary calculation for a net target", () => {
    const targetNet = 300_000;
    const gross = grossForNetSalary({ netMonthly: targetNet, deductions: salaried });
    const result = calculateStatutory({ grossMonthly: gross, deductions: salaried });
    expect(result.net).toBeCloseTo(targetNet, 0);
  });

  it("solves contractor net without an NSSF deduction", () => {
    const deductions = { nssf: false, shif: true, ahl: true };
    const targetNet = 200_000;
    const gross = grossForNetSalary({ netMonthly: targetNet, deductions });
    const result = calculateStatutory({ grossMonthly: gross, deductions });
    expect(result.net).toBeCloseTo(targetNet, 0);
    expect(result.nssf.total).toBe(0);
  });
});

describe("configurable KRA values", () => {
  const salaried = { nssf: true, shif: true, ahl: true };

  it("uses overridden NSSF limits, rates and PAYE relief", () => {
    const kra = resolveKraConfig({
      base: SHIPPED_KRA_CONFIG,
      override: {
        nssf: { upperEarningsLimit: 120_000 },
        paye: { personalReliefAnnual: 36_000 },
      },
    });

    expect(calculateNssf({ grossMonthly: 200_000, nssf: kra.nssf }).total).toBe(7_200);
    const standard = calculateStatutory({ grossMonthly: 100_000, deductions: salaried });
    const custom = calculateStatutory({ grossMonthly: 100_000, deductions: salaried, kra });
    expect(custom.paye).toBeCloseTo(standard.paye - 600, 2);
  });

  it("reports employer NSSF, housing levy and NITA separately", () => {
    const result = calculateStatutory({ grossMonthly: 100_000, deductions: salaried });
    expect(result.employer.nssf).toBe(6_000);
    expect(result.employer.ahl).toBe(1_500);
    expect(result.employer.nita).toBe(50);
    expect(result.employer.matches).toBe(7_500);
    expect(result.employer.total).toBe(7_550);
  });

  it("falls back to the shipped config when the override is invalid", () => {
    const warn = console.warn;
    console.warn = () => {};
    const kra = resolveKraConfig({
      base: SHIPPED_KRA_CONFIG,
      override: { nssf: { upperEarningsLimit: 5_000 } },
    });
    console.warn = warn;
    expect(kra).toEqual(SHIPPED_KRA_CONFIG);
  });
});
