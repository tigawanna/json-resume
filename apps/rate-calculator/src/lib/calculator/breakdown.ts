export type Period = "hour" | "week" | "month";

export interface BreakdownInput {
  hourlyUsd: number;
  hoursPerWeek: number;
  weeksPerMonth: number;
}

export interface Breakdown {
  hoursPerMonth: number;
  hourly: number;
  weekly: number;
  monthly: number;
  annual: number;
  scenarios: { hours: number; monthly: number }[];
}

export const SCENARIO_HOURS = [160, 170, 180] as const;

export function periodHours(period: Period, hoursPerWeek: number, weeksPerMonth: number): number {
  if (period === "hour") return 1;
  if (period === "week") return hoursPerWeek;
  return hoursPerWeek * weeksPerMonth;
}

export function deriveBreakdown({ hourlyUsd, hoursPerWeek, weeksPerMonth }: BreakdownInput): Breakdown {
  const rate = Number.isFinite(hourlyUsd) ? Math.max(0, hourlyUsd) : 0;
  const weeklyHours = Number.isFinite(hoursPerWeek) ? Math.max(0, hoursPerWeek) : 0;
  const weeks = Number.isFinite(weeksPerMonth) && weeksPerMonth > 0 ? weeksPerMonth : 4;
  const hoursPerMonth = weeklyHours * weeks;

  return {
    hoursPerMonth,
    hourly: rate,
    weekly: rate * weeklyHours,
    monthly: rate * hoursPerMonth,
    annual: rate * hoursPerMonth * 12,
    scenarios: SCENARIO_HOURS.map((hours) => ({ hours, monthly: rate * hours })),
  };
}

export function hoursPerWeekFromMonthly(monthlyHours: number, weeksPerMonth: number): number {
  const weeks = weeksPerMonth > 0 ? weeksPerMonth : 4;
  return Number((monthlyHours / weeks).toFixed(2));
}
