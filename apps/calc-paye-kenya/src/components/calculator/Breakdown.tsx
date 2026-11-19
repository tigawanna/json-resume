import { For, Show } from "solid-js";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useCalculator } from "@/state/calculator";

interface StatProps {
  label: string;
  usd: number;
  local: number;
  currency: string;
  highlight?: boolean;
}

function Stat(props: StatProps) {
  return (
    <div class="bg-background px-4 py-4">
      <p class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{props.label}</p>
      <p class={`numeric mt-2 text-xl font-medium ${props.highlight ? "text-primary" : ""}`}>
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(props.usd)}
      </p>
      <p class="numeric mt-1 text-[11px] text-muted-foreground">
        ≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: props.currency, maximumFractionDigits: 0 }).format(props.local)}
      </p>
    </div>
  );
}

export function BreakdownView() {
  const calc = useCalculator();
  const breakdown = calc.breakdown;
  const primaryLocal = () => calc.pinned()[0] ?? "KES";
  const local = (usd: number) => calc.local(usd, primaryLocal());

  const stats = () => [
    { label: "Hourly", usd: breakdown().hourly, local: local(breakdown().hourly) },
    { label: "Weekly", usd: breakdown().weekly, local: local(breakdown().weekly) },
    { label: "Monthly", usd: breakdown().monthly, local: local(breakdown().monthly), highlight: true },
    { label: "Annual", usd: breakdown().annual, local: local(breakdown().annual) },
  ];

  return (
    <section class="space-y-5">
      <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 class="text-sm font-medium">Your rate, broken down</h2>
        <span class="numeric text-[11px] text-muted-foreground">
          {breakdown().hoursPerMonth} hrs / month ·{" "}
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(breakdown().hourly)} / hr
        </span>
      </div>

      <div class="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <For each={stats()} keyed={(stat) => stat.label}>
          {(stat) => (
            <Stat
              label={stat().label}
              usd={stat().usd}
              local={stat().local}
              currency={primaryLocal()}
              highlight={stat().highlight}
            />
          )}
        </For>
      </div>

      <div class="space-y-2">
        <p class="text-[11px] text-muted-foreground">What if you worked more hours?</p>
        <div class="flex flex-wrap gap-2">
          <For each={breakdown().scenarios} keyed={(scenario) => scenario.hours}>
            {(scenario) => (
              <Button
                size="sm"
                variant={Math.abs(breakdown().hoursPerMonth - scenario().hours) < 0.01 ? "selected" : "outline"}
                onClick={() => calc.setHoursPerMonth(scenario().hours)}
                class={`numeric h-auto flex-col items-start gap-0 px-3 py-2 ${
                  Math.abs(breakdown().hoursPerMonth - scenario().hours) < 0.01 ? "" : "border border-border"
                }`}>
                <span
                  class={`text-[9px] tracking-wide uppercase ${
                    Math.abs(breakdown().hoursPerMonth - scenario().hours) < 0.01
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}>
                  {scenario().hours} hrs / mo
                </span>
                <span class="text-xs font-normal">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(scenario().monthly)}
                </span>
              </Button>
            )}
          </For>
        </div>
      </div>

      <div class="space-y-2 border-t border-border pt-4">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Pinned currencies</p>
          <Button variant="link" size="sm" onClick={() => calc.setDrawerOpen(true)} class="h-auto p-0 text-[11px] font-normal">
            All 20 currencies <Icon name="arrow" size={12} />
          </Button>
        </div>
        <Show when={calc.pinned().length > 0} fallback={<p class="text-xs text-muted-foreground">Star a currency in the drawer to pin it here.</p>}>
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <For each={calc.pinned()} keyed={(code) => code}>
              {(code) => (
                <div class="flex items-baseline justify-between border-b border-border/60 py-1.5">
                  <span class="text-[10px] tracking-wide text-muted-foreground uppercase">{code()}</span>
                  <span class="numeric text-xs">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: code(), maximumFractionDigits: 0 }).format(calc.local(breakdown().monthly, code()))}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </section>
  );
}
