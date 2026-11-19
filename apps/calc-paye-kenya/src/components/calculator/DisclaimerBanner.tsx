import { Show } from "solid-js";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useCalculator } from "@/state/calculator";

export function DisclaimerBanner() {
  const calc = useCalculator();

  return (
    <Show when={!calc.disclaimerDismissed()}>
      <aside
        aria-label="Disclaimer"
        class="mb-6 flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/[0.06] px-3.5 py-3">
        <Icon name="info" size={16} class="mt-0.5 shrink-0 text-destructive" />
        <div class="min-w-0 flex-1">
          <p class="text-[11px] leading-relaxed text-muted-foreground">
            <span class="font-medium text-foreground">Independent estimate — not an official KRA tool.</span> Not for
            filing, remittance or official use. Rates may have drifted and may not match your payslip.
          </p>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="#disclaimer" class="text-[10px] font-medium text-primary underline-offset-2 hover:underline">
              Read the full disclaimer
            </a>
            <a
              href="https://ecitizen.kra.go.ke/calculators/tax-calculators"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1 text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
              KRA official calculators <Icon name="arrow" size={12} />
            </a>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          label="Dismiss disclaimer"
          onClick={calc.dismissDisclaimer}
          class="-mt-1 -mr-1 shrink-0 text-muted-foreground hover:text-foreground">
          <Icon name="x" />
        </Button>
      </aside>
    </Show>
  );
}
