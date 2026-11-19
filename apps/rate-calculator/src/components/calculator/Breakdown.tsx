import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { convert, formatMoney } from "@/lib/calculator";
import { useBreakdown, useCalculatorStore } from "@/store";

interface StatProps {
  label: string;
  usd: number;
  local: number;
  currency: string;
  highlight?: boolean;
}

function Stat({ label, usd, local, currency, highlight }: StatProps) {
  return (
    <div className="bg-background px-4 py-4">
      <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className={`numeric mt-2 text-xl font-medium ${highlight ? "text-primary" : ""}`}>
        {formatMoney(usd, "USD")}
      </p>
      <p className="numeric mt-1 text-[11px] text-muted-foreground">≈ {formatMoney(local, currency)}</p>
    </div>
  );
}

export function BreakdownView() {
  const { rates, breakdown } = useBreakdown();
  const pinned = useCalculatorStore((state) => state.pinned);
  const setControls = useCalculatorStore((state) => state.setControls);
  const setDrawerOpen = useCalculatorStore((state) => state.setDrawerOpen);
  const localCurrency = pinned[0] ?? "KES";
  const local = (usd: number, currency = localCurrency) => convert(usd, "USD", currency, rates);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 className="text-sm font-medium">Your rate, broken down</h2>
        <span className="numeric text-[11px] text-muted-foreground">
          {breakdown.hoursPerMonth} hrs / month · {formatMoney(breakdown.hourly, "USD")} / hr
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <Stat label="Hourly" usd={breakdown.hourly} local={local(breakdown.hourly)} currency={localCurrency} />
        <Stat label="Weekly" usd={breakdown.weekly} local={local(breakdown.weekly)} currency={localCurrency} />
        <Stat
          label="Monthly"
          usd={breakdown.monthly}
          local={local(breakdown.monthly)}
          currency={localCurrency}
          highlight
        />
        <Stat label="Annual" usd={breakdown.annual} local={local(breakdown.annual)} currency={localCurrency} />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">What if you worked more hours?</p>
        <div className="flex flex-wrap gap-2">
          {breakdown.scenarios.map((scenario) => {
            const active = Math.abs(breakdown.hoursPerMonth - scenario.hours) < 0.01;
            return (
              <Button
                key={scenario.hours}
                type="button"
                size="sm"
                variant={active ? "selected" : "ghost"}
                onClick={() => setControls({ hoursPerMonth: scenario.hours })}
                className={`numeric h-auto flex-col items-start gap-0 px-3 py-2 ${
                  active ? "" : "border border-border"
                }`}>
                <span
                  className={`text-[9px] tracking-wide uppercase ${
                    active ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                  {scenario.hours} hrs / mo
                </span>
                <span className={`text-xs font-normal ${active ? "text-primary-foreground" : ""}`}>
                  {formatMoney(scenario.monthly, "USD")}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Pinned currencies</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="h-auto p-0 text-[11px] font-normal">
            All 20 currencies <ArrowUpRight className="size-3" />
          </Button>
        </div>
        {pinned.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {pinned.map((code) => (
              <div key={code} className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1.5">
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">{code}</span>
                <span className="numeric text-xs">{formatMoney(local(breakdown.monthly, code), code)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Star a currency in the drawer to pin it here.</p>
        )}
      </div>
    </section>
  );
}
