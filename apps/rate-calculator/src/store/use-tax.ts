import { calculateStatutory, convert } from "@/lib/calculator";
import { useBreakdown } from "./use-breakdown";

/** Gross pay in KES plus the full statutory position, derived from the same controls. */
export function useTax() {
  const { controls, breakdown, rates } = useBreakdown();
  const grossMonthlyKes = convert(breakdown.monthly, "USD", "KES", rates);
  const statutory = calculateStatutory({
    grossMonthly: grossMonthlyKes,
    deductions: controls.deductions,
  });

  return { controls, breakdown, rates, grossMonthlyKes, statutory };
}
