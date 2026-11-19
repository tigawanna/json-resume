import type { Period } from "./breakdown";

export type EmploymentMode = "contractor" | "salaried";

export interface DeductionFlags {
  nssf: boolean;
  shif: boolean;
  ahl: boolean;
}

export type DeductionKey = keyof DeductionFlags;

export const DEDUCTIONS_BY_EMPLOYMENT: Record<EmploymentMode, DeductionFlags> = {
  salaried: { nssf: true, shif: true, ahl: true },
  /** NSSF is optional for the self-employed; SHIF and the housing levy still apply to income. */
  contractor: { nssf: false, shif: true, ahl: true },
};

export interface ControlsState {
  /** The amount as the user typed it, in `inputCurrency`. */
  amount: number;
  inputCurrency: string;
  period: Period;
  /** Canonical hours figure — hours per week is derived from this and weeks per month. */
  hoursPerMonth: number;
  weeksPerMonth: number;
  employment: EmploymentMode;
  deductions: DeductionFlags;
}

export const DEFAULT_CONTROLS: ControlsState = {
  amount: 10,
  inputCurrency: "USD",
  period: "hour",
  hoursPerMonth: 160,
  weeksPerMonth: 4,
  employment: "salaried",
  deductions: DEDUCTIONS_BY_EMPLOYMENT.salaried,
};
