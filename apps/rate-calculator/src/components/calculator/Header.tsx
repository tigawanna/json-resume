import { Info, Moon, RefreshCw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCalculatorStore } from "@/store";

const STATUS_VIEW = {
  loading: "Updating rates",
  error: "Bundled rates",
  idle: "Live rates",
} as const;

export function Header() {
  const status = useCalculatorStore((state) => state.rateStatus);
  const updatedAt = useCalculatorStore((state) => state.ratesResult.updatedAt);
  const refreshRates = useCalculatorStore((state) => state.refreshRates);
  const disclaimerDismissed = useCalculatorStore((state) => state.disclaimerDismissed);
  const showDisclaimer = useCalculatorStore((state) => state.showDisclaimer);
  const theme = useCalculatorStore((state) => state.theme);
  const toggleTheme = useCalculatorStore((state) => state.toggleTheme);
  const time = updatedAt > 0 ? new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-medium tracking-tight">
            calc paye kenya<span className="text-primary">.</span>
          </h1>
          <span className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">rate · currency · tax</span>
        </div>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          What your hourly rate actually means — per week, per month, in your currency and after Kenyan statutory
          deductions.
        </p>
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        {disclaimerDismissed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={showDisclaimer}
                aria-label="Show disclaimer"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Info />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show disclaimer</TooltipContent>
          </Tooltip>
        ) : null}
        <span className="numeric text-[11px] text-muted-foreground">
          {STATUS_VIEW[status]}
          {time ? ` · ${time}` : ""}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void refreshRates()}
              disabled={status === "loading"}
              aria-label="Refresh exchange rates">
              <RefreshCw className={status === "loading" ? "animate-spin" : ""} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh exchange rates</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
