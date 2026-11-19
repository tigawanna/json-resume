import { For, Show } from "solid-js";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useCalculator } from "@/state/calculator";
import { CURRENCIES, SCENARIO_HOURS, convert, type Period } from "@/lib/calculator";
import { NumberField, SelectField } from "./Field";

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.flag}  ${currency.code}  ·  ${currency.name}`,
  short: `${currency.flag} ${currency.code}`,
}));

const PERIODS: readonly { value: Period; label: string }[] = [
  { value: "hour", label: "Per hour" },
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
];

const PERIOD_SUFFIX: Record<Period, string> = { hour: "/ hr", week: "/ wk", month: "/ mo" };

export function Controls() {
  const calc = useCalculator();
  const controls = calc.controls;

  const hoursPerWeek = () => Math.round((controls.hoursPerMonth / controls.weeksPerMonth) * 100) / 100;
  const amountUsd = () => convert(controls.amount, controls.inputCurrency, "USD", calc.rates());
  const localPins = () => calc.pinned().filter((code) => code !== controls.inputCurrency);

  return (
    <section class="space-y-6 @container">
      <div>
        <h2 class="text-sm font-medium">Your rate</h2>
        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
          Type an amount in any currency and say how often you earn it.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 @md:grid-cols-[minmax(0,1fr)_110px_120px]">
        <div class="col-span-2 @md:col-span-1">
          <NumberField id="amount" label="Amount" step={0.5} value={() => controls.amount} onChange={calc.setAmount} />
        </div>
        <SelectField
          id="input-currency"
          label="Currency"
          value={controls.inputCurrency}
          onChange={calc.setInputCurrency}
          options={CURRENCY_OPTIONS}
        />
        <SelectField id="period" label="Period" value={controls.period} onChange={calc.setPeriod} options={PERIODS} />
      </div>

      <div class="rounded-md border border-border bg-muted/25 px-3 py-2.5">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">In your currency</span>
          <Show when={localPins().length > 0} fallback={<span class="text-xs text-muted-foreground">None pinned</span>}>
            <For each={localPins()}>
              {(code) => (
                <span class="numeric text-xs">
                  {calc.formatMoney(calc.local(amountUsd(), code), code)}
                  <span class="ml-1 text-[10px] text-muted-foreground">{PERIOD_SUFFIX[controls.period]}</span>
                </span>
              )}
            </For>
          </Show>
          <Button
            variant="ghost"
            size="icon"
            label="Pin another currency"
            onClick={() => calc.setDrawerOpen(true)}
            class="ml-auto">
            <Icon name="plus" />
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <NumberField
          id="hours-week"
          label="Hours per week"
          suffix="hrs"
          step={0.25}
          value={() => hoursPerWeek()}
          onChange={(value) => calc.setHoursPerMonth(Math.round(value * controls.weeksPerMonth * 100) / 100)}
        />
        <NumberField
          id="weeks-month"
          label="Weeks per month"
          suffix="wks"
          step={0.5}
          value={() => controls.weeksPerMonth}
          onChange={calc.setWeeksPerMonth}
        />
      </div>

      <div class="space-y-2">
        <NumberField
          id="hours-month"
          label="Hours per month"
          suffix="hrs"
          value={() => controls.hoursPerMonth}
          onChange={calc.setHoursPerMonth}
        />
        <p class="pt-1 text-[11px] text-muted-foreground">Or pick a common month</p>
        <div class="flex flex-wrap gap-2">
          <For each={SCENARIO_HOURS}>
            {(hours) => (
              <Button
                size="sm"
                variant={Math.abs(controls.hoursPerMonth - hours) < 0.01 ? "selected" : "outline"}
                onClick={() => calc.setHoursPerMonth(hours)}
                class="numeric text-xs">
                {hours} hrs
              </Button>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}
