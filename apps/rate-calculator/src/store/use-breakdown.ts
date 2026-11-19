import { convert, deriveBreakdown, hoursPerWeekFromMonthly, periodHours } from "@/lib/calculator";
import { useCalculatorStore } from "./calculator-store";

/** Pure derivation from store state — no effects, no duplicated source of truth. */
export function useBreakdown() {
  const controls = useCalculatorStore((state) => state.controls);
  const rates = useCalculatorStore((state) => state.ratesResult.rates);

  const hoursPerWeek = hoursPerWeekFromMonthly(controls.hoursPerMonth, controls.weeksPerMonth);
  const hoursInPeriod = periodHours(controls.period, hoursPerWeek, controls.weeksPerMonth);
  const amountUsd = convert(controls.amount, controls.inputCurrency, "USD", rates);
  const hourlyUsd = hoursInPeriod > 0 ? amountUsd / hoursInPeriod : 0;

  const breakdown = deriveBreakdown({
    hourlyUsd,
    hoursPerWeek,
    weeksPerMonth: controls.weeksPerMonth,
  });

  return { controls, amountUsd, hoursPerWeek, rates, breakdown };
}
