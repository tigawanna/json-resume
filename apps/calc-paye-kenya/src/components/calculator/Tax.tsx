import { Show } from "solid-js";
import { NumberField } from "./Field";
import { TaxBands } from "./TaxBands";
import { KRA_CONFIG } from "@/lib/calculator";
import { useCalculator } from "@/state/calculator";

const MODE_LABEL = { salaried: "Employer deductions", contractor: "Self-remitted" } as const;

export function Tax() {
  const calc = useCalculator();
  const salaried = () => calc.controls.employment === "salaried";
  const statutory = calc.statutory;
  const money = (value: number) => calc.formatMoney(value, "KES");

  return (
    <section class="space-y-6">
      <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 class="text-sm font-medium">KRA tax &amp; take-home</h2>
        <span class="text-[11px] text-muted-foreground">
          {MODE_LABEL[calc.controls.employment]} · {KRA_CONFIG.taxYear} rates
        </span>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-[180px] flex-1">
          <NumberField
            id="gross-kes"
            label={salaried() ? "Monthly gross salary (KES)" : "Monthly gross income (KES)"}
            prefix="KSh"
            step={1000}
            value={() => Math.round(statutory().gross)}
            onChange={calc.setMonthlyGrossKes}
          />
        </div>
        <div class="min-w-[180px] flex-1">
          <NumberField
            id="net-kes"
            label="Take-home target (KES)"
            prefix="KSh"
            step={1000}
            value={() => Math.round(statutory().net)}
            onChange={calc.setMonthlyNetKes}
          />
        </div>
      </div>

      <div class="grid gap-4 border-l-2 border-primary py-1 pl-4 sm:grid-cols-2">
        <div>
          <p class="text-[10px] tracking-[0.14em] text-primary uppercase">Take home / month</p>
          <p class="numeric mt-1 text-3xl font-medium">{money(statutory().net)}</p>
        </div>
        <div>
          <p class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            {salaried() ? "Withheld / month" : "Set aside / month"}
          </p>
          <p class="numeric mt-1 text-3xl font-medium">{money(statutory().totalDeductions)}</p>
        </div>
        <p class="numeric text-xs leading-relaxed text-muted-foreground sm:col-span-2">
          {(() => {
            const parts = [`PAYE ${money(statutory().paye)}`];
            if (calc.controls.deductions.nssf) parts.push(`NSSF ${money(statutory().nssf.total)}`);
            if (calc.controls.deductions.shif) parts.push(`SHIF ${money(statutory().shif)}`);
            if (calc.controls.deductions.ahl) parts.push(`AHL ${money(statutory().ahl)}`);
            return parts.join(" · ");
          })()}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
        <div class="bg-background px-3 py-2.5">
          <p class="text-[9px] tracking-wide text-muted-foreground uppercase">USD / hr · gross</p>
          <p class="numeric mt-1 text-sm">{calc.formatMoney(calc.breakdown().hourly, "USD")}</p>
        </div>
        <div class="bg-background px-3 py-2.5">
          <p class="text-[9px] tracking-wide text-muted-foreground uppercase">USD / wk · gross</p>
          <p class="numeric mt-1 text-sm">{calc.formatMoney(calc.breakdown().weekly, "USD")}</p>
        </div>
        <div class="bg-background px-3 py-2.5">
          <p class="text-[9px] tracking-wide text-muted-foreground uppercase">USD / mo · gross</p>
          <p class="numeric mt-1 text-sm">{calc.formatMoney(calc.breakdown().monthly, "USD")}</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 border-t border-border pt-3">
        <div>
          <p class="text-[9px] tracking-wide text-muted-foreground uppercase">Gross / yr</p>
          <p class="numeric mt-1 text-xs">{money(statutory().gross * 12)}</p>
        </div>
        <div>
          <p class="text-[9px] tracking-wide text-muted-foreground uppercase">Deductions / yr</p>
          <p class="numeric mt-1 text-xs">{money(statutory().totalDeductions * 12)}</p>
        </div>
        <div>
          <p class="text-[9px] tracking-wide text-muted-foreground uppercase">Net / yr</p>
          <p class="numeric mt-1 text-xs">{money(statutory().net * 12)}</p>
        </div>
      </div>

      <p class="numeric text-[10px] text-muted-foreground">
        Total deductions are {(statutory().effectiveRate * 100).toFixed(1)}% of gross · taxable pay {money(statutory().taxable)} / month
      </p>

      <Show
        when={!salaried()}
        fallback={
          <p class="border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
            Your employer withholds PAYE monthly using KRA&apos;s pay-band tables. The band-by-band breakdown is shown
            for contractors.
          </p>
        }>
        <TaxBands bands={statutory().payeResult.bands} taxableAnnual={statutory().taxable * 12} />
      </Show>
    </section>
  );
}
