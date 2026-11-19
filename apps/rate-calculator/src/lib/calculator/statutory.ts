import { KRA_CONFIG, type KraConfig, type NssfConfig, type ShifConfig } from "./kra";
import { calculatePaye, type KraResult } from "./paye";
import type { DeductionFlags } from "./types";

export interface NssfResult {
  tierOne: number;
  tierTwo: number;
  total: number;
  /** Pensionable pay used to calculate the contribution. */
  pensionable: number;
}

export interface EmployerContributions {
  nssf: number;
  ahl: number;
  nita: number;
  /** NSSF and housing levy matches only. */
  matches: number;
  total: number;
}

export interface StatutoryBreakdown {
  gross: number;
  nssf: NssfResult;
  shif: number;
  ahl: number;
  taxable: number;
  paye: number;
  totalDeductions: number;
  net: number;
  effectiveRate: number;
  payeResult: KraResult;
  employer: EmployerContributions;
}

function safeMoney(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function nssfBase({
  gross,
  nssf,
}: {
  gross: number;
  nssf: NssfConfig;
}): { tierOne: number; tierTwo: number; pensionable: number } {
  const tierOne = Math.min(gross, nssf.lowerEarningsLimit);
  const tierTwo = Math.max(0, Math.min(gross, nssf.upperEarningsLimit) - nssf.lowerEarningsLimit);
  return { tierOne, tierTwo, pensionable: tierOne + tierTwo };
}

export function calculateNssf({
  grossMonthly,
  nssf = KRA_CONFIG.nssf,
}: {
  grossMonthly: number;
  nssf?: NssfConfig;
}): NssfResult {
  const gross = safeMoney(grossMonthly);
  const base = nssfBase({ gross, nssf });

  return {
    tierOne: base.tierOne * nssf.employeeRate,
    tierTwo: base.tierTwo * nssf.employeeRate,
    total: base.pensionable * nssf.employeeRate,
    pensionable: base.pensionable,
  };
}

export function calculateShif({
  grossMonthly,
  shif = KRA_CONFIG.shif,
}: {
  grossMonthly: number;
  shif?: ShifConfig;
}): number {
  const gross = safeMoney(grossMonthly);
  if (gross <= 0) return 0;
  return Math.max(shif.minimum, gross * shif.rate);
}

export function calculateStatutory({
  grossMonthly,
  deductions,
  kra = KRA_CONFIG,
}: {
  grossMonthly: number;
  deductions: DeductionFlags;
  kra?: KraConfig;
}): StatutoryBreakdown {
  const gross = safeMoney(grossMonthly);
  const nssfBasis = nssfBase({ gross, nssf: kra.nssf });
  const nssf = deductions.nssf
    ? calculateNssf({ grossMonthly: gross, nssf: kra.nssf })
    : { tierOne: 0, tierTwo: 0, total: 0, pensionable: 0 };
  const shif = deductions.shif ? calculateShif({ grossMonthly: gross, shif: kra.shif }) : 0;
  const ahl = deductions.ahl ? gross * kra.ahl.employeeRate : 0;
  const taxable = Math.max(0, gross - nssf.total - shif - ahl);
  const payeResult = calculatePaye({ annualGross: taxable * 12, paye: kra.paye });
  const paye = payeResult.tax / 12;
  const totalDeductions = nssf.total + shif + ahl + paye;
  const net = Math.max(0, gross - totalDeductions);

  const employerNssf = deductions.nssf ? nssfBasis.pensionable * kra.nssf.employerRate : 0;
  const employerAhl = deductions.ahl ? gross * kra.ahl.employerRate : 0;
  const employerNita = gross > 0 ? kra.nita.monthly : 0;
  const matches = employerNssf + employerAhl;

  return {
    gross,
    nssf,
    shif,
    ahl,
    taxable,
    paye,
    totalDeductions,
    net,
    effectiveRate: gross > 0 ? totalDeductions / gross : 0,
    payeResult,
    employer: {
      nssf: employerNssf,
      ahl: employerAhl,
      nita: employerNita,
      matches,
      total: matches + employerNita,
    },
  };
}

/** Invert the full statutory calculation: gross needed to leave a monthly net target. */
export function grossForNetSalary({
  netMonthly,
  deductions,
  kra = KRA_CONFIG,
}: {
  netMonthly: number;
  deductions: DeductionFlags;
  kra?: KraConfig;
}): number {
  const target = safeMoney(netMonthly);
  if (target === 0) return 0;

  let low = target;
  let high = target * 3 + 100_000;

  for (let step = 0; step < 80; step += 1) {
    const middle = (low + high) / 2;
    const result = calculateStatutory({ grossMonthly: middle, deductions, kra });
    if (result.net < target) low = middle;
    else high = middle;
  }

  return (low + high) / 2;
}
