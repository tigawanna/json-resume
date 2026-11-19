import shipped from "./kra-rates.json";
import { activeKraOverride } from "./kra-env";
import { resolveKraConfig } from "./kra-overrides";

export interface PayeBandConfig {
  label: string;
  /** Annual taxable income ceiling in KES; null marks the open-ended top band. */
  upTo: number | null;
  rate: number;
}

export interface PayeConfig {
  personalReliefAnnual: number;
  bands: PayeBandConfig[];
}

export interface NssfConfig {
  employeeRate: number;
  employerRate: number;
  lowerEarningsLimit: number;
  upperEarningsLimit: number;
}

export interface ShifConfig {
  rate: number;
  minimum: number;
}

export interface AhlConfig {
  employeeRate: number;
  employerRate: number;
}

export interface NitaConfig {
  monthly: number;
}

export interface KraConfig {
  taxYear: string;
  reviewed: string;
  paye: PayeConfig;
  nssf: NssfConfig;
  shif: ShifConfig;
  ahl: AhlConfig;
  nita: NitaConfig;
}

/** Edit kra-rates.json to change the values shipped with the app. */
export const SHIPPED_KRA_CONFIG: KraConfig = shipped;

/** Shipped JSON, with any VITE_KRA_* environment variables applied on top. */
export const KRA_CONFIG: KraConfig = resolveKraConfig({
  base: SHIPPED_KRA_CONFIG,
  override: activeKraOverride(),
});
