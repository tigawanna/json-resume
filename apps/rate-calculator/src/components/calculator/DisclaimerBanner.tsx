import { ArrowUpRight, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalculatorStore } from "@/store";

export function DisclaimerBanner() {
  const dismissed = useCalculatorStore((state) => state.disclaimerDismissed);
  const dismissDisclaimer = useCalculatorStore((state) => state.dismissDisclaimer);

  if (dismissed) return null;

  return (
    <aside
      aria-label="Disclaimer"
      className="mb-6 flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/[0.06] px-3.5 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Independent estimate — not an official KRA tool.</span> Not for
          filing, remittance or official use. Rates may have drifted and may not match your payslip.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="#disclaimer" className="text-[10px] font-medium text-primary underline-offset-2 hover:underline">
            Read the full disclaimer
          </a>
          <a
            href="https://ecitizen.kra.go.ke/calculators/tax-calculators"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
            KRA official calculators <ArrowUpRight className="size-3" />
          </a>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismissDisclaimer}
        aria-label="Dismiss disclaimer"
        className="-mt-1 -mr-1 shrink-0 text-muted-foreground hover:text-foreground">
        <X />
      </Button>
    </aside>
  );
}
