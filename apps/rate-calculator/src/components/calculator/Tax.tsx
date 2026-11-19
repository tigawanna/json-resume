import { KRA_CONFIG, formatMoney, type DeductionFlags, type StatutoryBreakdown } from "@/lib/calculator";
import { useCalculatorStore, useTax } from "@/store";
import { NumberField } from "./Field";
import { TaxBands } from "./TaxBands";

const MODE_LABEL = {
  salaried: "Employer deductions",
  contractor: "Self-remitted",
} as const;

function deductionSummary({
  statutory,
  deductions,
}: {
  statutory: StatutoryBreakdown;
  deductions: DeductionFlags;
}): string {
  const parts = [`PAYE ${formatMoney(statutory.paye, "KES")}`];
  if (deductions.nssf) parts.push(`NSSF ${formatMoney(statutory.nssf.total, "KES")}`);
  if (deductions.shif) parts.push(`SHIF ${formatMoney(statutory.shif, "KES")}`);
  if (deductions.ahl) parts.push(`AHL ${formatMoney(statutory.ahl, "KES")}`);
  return parts.join(" · ");
}

export function Tax() {
  const { controls, breakdown, statutory } = useTax();
  const setMonthlyGrossKes = useCalculatorStore((state) => state.setMonthlyGrossKes);
  const setMonthlyNetKes = useCalculatorStore((state) => state.setMonthlyNetKes);
  const salaried = controls.employment === "salaried";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h2 className="text-sm font-medium">KRA tax & take-home</h2>
        <span className="text-[11px] text-muted-foreground">
          {MODE_LABEL[controls.employment]} · {KRA_CONFIG.taxYear} rates
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <NumberField
            id="gross-kes"
            label={salaried ? "Monthly gross salary (KES)" : "Monthly gross income (KES)"}
            prefix="KSh"
            step={1000}
            value={Math.round(statutory.gross)}
            onChange={setMonthlyGrossKes}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <NumberField
            id="net-kes"
            label="Take-home target (KES)"
            prefix="KSh"
            step={1000}
            value={Math.round(statutory.net)}
            onChange={setMonthlyNetKes}
          />
        </div>
      </div>

      <div className="grid gap-4 border-l-2 border-primary py-1 pl-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] tracking-[0.14em] text-primary uppercase">Take home / month</p>
          <p className="numeric mt-1 text-3xl font-medium">{formatMoney(statutory.net, "KES")}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            {salaried ? "Withheld / month" : "Set aside / month"}
          </p>
          <p className="numeric mt-1 text-3xl font-medium">{formatMoney(statutory.totalDeductions, "KES")}</p>
        </div>
        <p className="numeric text-xs leading-relaxed text-muted-foreground sm:col-span-2">
          {deductionSummary({ statutory, deductions: controls.deductions })}
        </p>
        <p className="text-[10px] leading-relaxed text-muted-foreground sm:col-span-2">
          {salaried
            ? "Your employer deducts and remits these before paying you."
            : "Keep this aside and remit it yourself; NSSF is optional unless you are also an employee."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
        {[
          { label: "USD / hr · gross", value: breakdown.hourly },
          { label: "USD / wk · gross", value: breakdown.weekly },
          { label: "USD / mo · gross", value: breakdown.monthly },
        ].map((item) => (
          <div key={item.label} className="bg-background px-3 py-2.5">
            <p className="text-[9px] tracking-wide text-muted-foreground uppercase">{item.label}</p>
            <p className="numeric mt-1 text-sm">{formatMoney(item.value, "USD")}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
        {[
          { label: "Gross / yr", value: statutory.gross * 12 },
          { label: "Deductions / yr", value: statutory.totalDeductions * 12 },
          { label: "Net / yr", value: statutory.net * 12 },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[9px] tracking-wide text-muted-foreground uppercase">{item.label}</p>
            <p className="numeric mt-1 text-xs">{formatMoney(item.value, "KES")}</p>
          </div>
        ))}
      </div>

      <p className="numeric text-[10px] text-muted-foreground">
        Total deductions are {(statutory.effectiveRate * 100).toFixed(1)}% of gross · taxable pay{" "}
        {formatMoney(statutory.taxable, "KES")} / month
      </p>

      {salaried ? (
        <p className="border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Your employer withholds PAYE monthly using KRA&apos;s pay-band tables. The band-by-band breakdown is shown for
          contractors.
        </p>
      ) : (
        <TaxBands
          bands={statutory.payeResult.bands}
          taxableAnnual={statutory.taxable * 12}
          personalReliefAnnual={KRA_CONFIG.paye.personalReliefAnnual}
        />
      )}
    </section>
  );
}
