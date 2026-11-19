import { For, Show } from "solid-js";
import { DeductionRow } from "./DeductionRow";
import { KRA_CONFIG, formatPercent } from "@/lib/calculator";
import { useCalculator } from "@/state/calculator";

const ROWS = [
  { key: "nssf", label: "NSSF" },
  { key: "shif", label: "SHIF (SHA)" },
  { key: "ahl", label: "Affordable Housing Levy" },
] as const;

const PAYE_RATES = KRA_CONFIG.paye.bands.map((band) => band.rate);
const PAYE_HINT = `${formatPercent(PAYE_RATES[0] ?? 0)}–${formatPercent(PAYE_RATES.at(-1) ?? 0)} on taxable pay, less the ${new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(KRA_CONFIG.paye.personalReliefAnnual / 12)} monthly personal relief.`;

const HINTS = {
  nssf: `${formatPercent(KRA_CONFIG.nssf.employeeRate)} of pensionable pay up to ${KRA_CONFIG.nssf.upperEarningsLimit.toLocaleString("en-US")} KES — Tier I ${KRA_CONFIG.nssf.lowerEarningsLimit.toLocaleString("en-US")}, Tier II above it.`,
  shif: `${formatPercent(KRA_CONFIG.shif.rate)} of gross pay, minimum ${KRA_CONFIG.shif.minimum} KES. Replaced NHIF.`,
  ahl: `${formatPercent(KRA_CONFIG.ahl.employeeRate)} of gross pay. Your employer adds another ${formatPercent(KRA_CONFIG.ahl.employerRate)}.`,
} as const;

export function Deductions() {
  const calc = useCalculator();
  const salaried = () => calc.controls.employment === "salaried";
  const statutory = calc.statutory;

  function amountFor(key: (typeof ROWS)[number]["key"]): number {
    return key === "nssf" ? statutory().nssf.total : statutory()[key];
  }

  function employerNote(): string {
    const nita = statutory().employer.nita > 0 ? `, plus ${statutory().employer.nita} KES NITA` : "";
    const matches = Math.round(statutory().employer.matches).toLocaleString("en-US");
    return `Employer adds ${matches} KES / month in NSSF and housing levy matches${nita}. None of that comes out of your pay.`;
  }

  return (
    <section class="mt-14 border-t border-border pt-8">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-sm font-medium">Statutory deductions</h2>
            <span class="text-[11px] text-muted-foreground">{KRA_CONFIG.taxYear} · resident</span>
          </div>
          <p class="mt-2 text-xs leading-relaxed text-muted-foreground">
            {salaried()
              ? "What a Kenyan employer should deduct from gross salary, plus what it pays on top."
              : "What you set aside and remit yourself. NSSF is optional for the self-employed; SHIF and the housing levy apply to income earned in Kenya."}
          </p>
          <div class="mt-5 border-l-2 border-primary py-1 pl-3">
            <p class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Taxable pay / month</p>
            <p class="numeric mt-1 text-lg">{calc.formatMoney(statutory().taxable, "KES")}</p>
            <p class="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Gross less the statutory contributions included here
            </p>
          </div>
          <Show when={salaried()}>
            <p class="mt-4 text-[10px] leading-relaxed text-muted-foreground">{employerNote()}</p>
          </Show>
        </div>

        <div>
          <div class="border-t border-border">
            <For each={ROWS}>
              {(row) => (
                <DeductionRow
                  label={row.label}
                  hint={HINTS[row.key]}
                  amount={amountFor(row.key)}
                  included={calc.controls.deductions[row.key]}
                  onToggle={() => calc.toggleDeduction(row.key)}
                />
              )}
            </For>
            <DeductionRow label="PAYE" hint={PAYE_HINT} amount={statutory().paye} included />
          </div>
          <p class="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            PAYE is always included. Toggle NSSF, SHIF or the housing levy to match your payslip; the tax and take-home
            figures update everywhere. Pension, insurance relief and other payroll items are not modelled.
          </p>
        </div>
      </div>
    </section>
  );
}
