import {
  KRA_CONFIG,
  formatMoney,
  formatPercent,
  type StatutoryBreakdown,
} from "@/lib/calculator";
import { useCalculatorStore, useTax } from "@/store";
import { DeductionRow } from "./DeductionRow";

const ROWS = [
  { key: "nssf", label: "NSSF" },
  { key: "shif", label: "SHIF (SHA)" },
  { key: "ahl", label: "Affordable Housing Levy" },
] as const;

const PAYE_RATES = KRA_CONFIG.paye.bands.map((band) => band.rate);
const PAYE_HINT = `${formatPercent(PAYE_RATES[0] ?? 0)}–${formatPercent(PAYE_RATES.at(-1) ?? 0)} on taxable pay, less the ${formatMoney(KRA_CONFIG.paye.personalReliefAnnual / 12, "KES")} monthly personal relief.`;

const HINTS = {
  nssf: `${formatPercent(KRA_CONFIG.nssf.employeeRate)} of pensionable pay up to ${formatMoney(KRA_CONFIG.nssf.upperEarningsLimit, "KES")} — Tier I ${formatMoney(KRA_CONFIG.nssf.lowerEarningsLimit, "KES")}, Tier II above it.`,
  shif: `${formatPercent(KRA_CONFIG.shif.rate)} of gross pay, minimum ${formatMoney(KRA_CONFIG.shif.minimum, "KES")}. Replaced NHIF.`,
  ahl: `${formatPercent(KRA_CONFIG.ahl.employeeRate)} of gross pay. Your employer adds another ${formatPercent(KRA_CONFIG.ahl.employerRate)}.`,
} as const;

function deductionAmount({
  key,
  statutory,
}: {
  key: (typeof ROWS)[number]["key"];
  statutory: StatutoryBreakdown;
}): number {
  if (key === "nssf") return statutory.nssf.total;
  return statutory[key];
}

function employerNote(statutory: StatutoryBreakdown): string {
  const nita =
    statutory.employer.nita > 0 ? `, plus ${formatMoney(statutory.employer.nita, "KES", 0)} NITA` : "";
  return `Employer adds ${formatMoney(statutory.employer.matches, "KES")} / month in NSSF and housing levy matches${nita}. None of that comes out of your pay.`;
}

export function Deductions() {
  const { controls, statutory } = useTax();
  const toggleDeduction = useCalculatorStore((state) => state.toggleDeduction);
  const salaried = controls.employment === "salaried";

  return (
    <section className="mt-14 border-t border-border pt-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Statutory deductions</h2>
            <span className="text-[11px] text-muted-foreground">{KRA_CONFIG.taxYear} · resident</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {salaried
              ? "What a Kenyan employer should deduct from gross salary, plus what it pays on top."
              : "What you set aside and remit yourself. NSSF is optional for the self-employed; SHIF and the housing levy apply to income earned in Kenya."}
          </p>
          <div className="mt-5 border-l-2 border-primary py-1 pl-3">
            <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Taxable pay / month</p>
            <p className="numeric mt-1 text-lg">{formatMoney(statutory.taxable, "KES")}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Gross less the statutory contributions included here
            </p>
          </div>
          {salaried ? (
            <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">{employerNote(statutory)}</p>
          ) : null}
        </div>

        <div>
          <div className="border-t border-border">
            {ROWS.map((row) => (
              <DeductionRow
                key={row.key}
                label={row.label}
                hint={HINTS[row.key]}
                amount={deductionAmount({ key: row.key, statutory })}
                included={controls.deductions[row.key]}
                onToggle={() => toggleDeduction(row.key)}
              />
            ))}
            <DeductionRow label="PAYE" hint={PAYE_HINT} amount={statutory.paye} included />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            PAYE is always included. Toggle NSSF, SHIF or the housing levy to match your payslip; the tax and
            take-home figures update everywhere. Pension, insurance relief and other payroll items are not modelled.
          </p>
        </div>
      </div>
    </section>
  );
}
