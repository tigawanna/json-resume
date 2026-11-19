import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CURRENCIES,
  convert,
  formatMoney,
  hoursPerWeekFromMonthly,
  SCENARIO_HOURS,
  type Period,
} from "@/lib/calculator";
import { useCalculatorStore } from "@/store";
import { NumberField, SelectField } from "./Field";

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.flag}  ${currency.code}  ·  ${currency.name}`,
}));

const PERIODS: readonly { value: Period; label: string }[] = [
  { value: "hour", label: "Per hour" },
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
];

const PERIOD_SUFFIX: Record<Period, string> = { hour: "/ hr", week: "/ wk", month: "/ mo" };

export function Controls() {
  const controls = useCalculatorStore((state) => state.controls);
  const setControls = useCalculatorStore((state) => state.setControls);
  const rates = useCalculatorStore((state) => state.ratesResult.rates);
  const pinned = useCalculatorStore((state) => state.pinned);
  const setDrawerOpen = useCalculatorStore((state) => state.setDrawerOpen);
  const hoursPerWeek = hoursPerWeekFromMonthly(controls.hoursPerMonth, controls.weeksPerMonth);
  const amountUsd = convert(controls.amount, controls.inputCurrency, "USD", rates);
  const localPins = pinned.filter((code) => code !== controls.inputCurrency);
  const selectedCurrency = CURRENCIES.find((currency) => currency.code === controls.inputCurrency);

  return (
    <section className="space-y-6 @container">
      <div>
        <h2 className="text-sm font-medium">Your rate</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Type an amount in any currency and say how often you earn it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 @md:grid-cols-[minmax(0,1fr)_110px_120px]">
        <div className="col-span-2 @md:col-span-1">
          <NumberField
            id="amount"
            label="Amount"
            step={0.5}
            value={Math.round(controls.amount * 100) / 100}
            onChange={(amount) => setControls({ amount })}
          />
        </div>
        <SelectField
          id="input-currency"
          label="Currency"
          value={controls.inputCurrency}
          onChange={(inputCurrency) => setControls({ inputCurrency })}
          options={CURRENCY_OPTIONS}
          renderValue={() => `${selectedCurrency?.flag ?? ""} ${controls.inputCurrency}`}
        />
        <SelectField
          id="period"
          label="Period"
          value={controls.period}
          onChange={(period) => setControls({ period })}
          options={PERIODS}
        />
      </div>

      <div className="rounded-md border border-border bg-muted/25 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">In your currency</span>
          {localPins.length > 0 ? (
            localPins.map((code) => (
              <span key={code} className="numeric text-xs">
                {formatMoney(convert(amountUsd, "USD", code, rates), code)}
                <span className="ml-1 text-[10px] text-muted-foreground">{PERIOD_SUFFIX[controls.period]}</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">None pinned</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setDrawerOpen(true)}
            aria-label="Pin another currency"
            className="ml-auto">
            <Plus />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          id="hours-week"
          label="Hours per week"
          suffix="hrs"
          step={0.25}
          value={hoursPerWeek}
          onChange={(value) => setControls({ hoursPerMonth: Math.round(value * controls.weeksPerMonth * 100) / 100 })}
        />
        <NumberField
          id="weeks-month"
          label="Weeks per month"
          suffix="wks"
          step={0.5}
          value={controls.weeksPerMonth}
          onChange={(weeksPerMonth) => setControls({ weeksPerMonth })}
        />
      </div>

      <div className="space-y-2">
        <NumberField
          id="hours-month"
          label="Hours per month"
          suffix="hrs"
          value={controls.hoursPerMonth}
          onChange={(hoursPerMonth) => setControls({ hoursPerMonth })}
        />
        <p className="pt-1 text-[11px] text-muted-foreground">Or pick a common month</p>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_HOURS.map((hours) => {
            const active = Math.abs(controls.hoursPerMonth - hours) < 0.01;
            return (
              <Button
                key={hours}
                type="button"
                size="sm"
                variant={active ? "selected" : "outline"}
                onClick={() => setControls({ hoursPerMonth: hours })}
                className="numeric h-7 text-xs font-normal">
                {hours} hrs
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
