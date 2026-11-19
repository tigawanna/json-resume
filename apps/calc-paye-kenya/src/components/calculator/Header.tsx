import { Show } from "solid-js";
import { Tooltip, TooltipPanel, TooltipTrigger } from "terracotta/tooltip";
import { Icon } from "@/components/icons";
import { useCalculator } from "@/state/calculator";

const STATUS_VIEW = {
  loading: "Updating rates",
  error: "Bundled rates",
  idle: "Live rates",
} as const;

export function Header() {
  const calc = useCalculator();
  const time = () =>
    calc.updatedAt() > 0
      ? new Date(calc.updatedAt()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "";

  return (
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <div class="flex items-baseline gap-3">
          <h1 class="text-lg font-medium tracking-tight">
            calc paye kenya<span class="text-primary">.</span>
          </h1>
          <span class="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">rate · currency · tax</span>
        </div>
        <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          What your hourly rate actually means — per week, per month, in your currency and after Kenyan statutory
          deductions.
        </p>
      </div>

      <div class="flex items-center gap-1.5 pt-0.5">
        <Show when={calc.disclaimerDismissed()}>
          <Tooltip defaultOpen={false}>
            <TooltipTrigger
              class="tc-btn tc-btn-ghost tc-btn-icon tc-btn-danger"
              aria-label="Show disclaimer"
              onClick={calc.showDisclaimer}>
              <Icon name="info" />
            </TooltipTrigger>
            <TooltipPanel>Show disclaimer</TooltipPanel>
          </Tooltip>
        </Show>
        <span class="numeric text-[11px] text-muted-foreground">
          {STATUS_VIEW[calc.rateStatus()]}
          {time() ? ` · ${time()}` : ""}
        </span>
        <Tooltip defaultOpen={false}>
          <TooltipTrigger
            class="tc-btn tc-btn-ghost tc-btn-icon"
            aria-label="Refresh exchange rates"
            disabled={calc.rateStatus() === "loading"}
            onClick={() => void calc.refreshRates()}>
            <Icon name="refresh" class={calc.rateStatus() === "loading" ? "animate-spin" : ""} />
          </TooltipTrigger>
          <TooltipPanel>Refresh exchange rates</TooltipPanel>
        </Tooltip>
        <Tooltip defaultOpen={false}>
          <TooltipTrigger
            class="tc-btn tc-btn-ghost tc-btn-icon"
            aria-label={`Switch to ${calc.theme() === "dark" ? "light" : "dark"} mode`}
            onClick={calc.toggleTheme}>
            <Icon name={calc.theme() === "dark" ? "sun" : "moon"} />
          </TooltipTrigger>
          <TooltipPanel>{calc.theme() === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipPanel>
        </Tooltip>
      </div>
    </header>
  );
}
