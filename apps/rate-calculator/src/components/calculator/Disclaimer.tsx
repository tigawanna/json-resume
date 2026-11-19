import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { KRA_CONFIG, formatPercent } from "@/lib/calculator";

const AHL_DETAIL = `${formatPercent(KRA_CONFIG.ahl.employeeRate)} employee and ${formatPercent(KRA_CONFIG.ahl.employerRate)} employer`;

const OFFICIAL_LINKS = [
  {
    label: "KRA individual income tax",
    detail: "Bands, personal relief and filing obligations",
    href: "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/individual-income-tax",
  },
  {
    label: "KRA PAYE guidance",
    detail: "Allowable deductions and employer obligations",
    href: "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/paye",
  },
  {
    label: "Affordable Housing Levy notice",
    detail: AHL_DETAIL,
    href: "https://www.kra.go.ke/news-center/public-notices/2099-collection-of-the-affordable-housing-levy-by-kenya-revenue-authority-2",
  },
  {
    label: "KRA official tax calculators",
    detail: "Use KRA's own calculator before filing or remitting",
    href: "https://ecitizen.kra.go.ke/calculators/tax-calculators",
  },
] as const;

export function Disclaimer() {
  return (
    <section id="disclaimer" className="mt-10 scroll-mt-8 border-t border-border pt-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-3.5 text-primary" />
            <h2 className="text-sm font-medium">Not an official tool</h2>
          </div>
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Calc Paye Kenya is an independent estimate. It is not affiliated with, endorsed by or connected to KRA, NSSF or
            SHA, and it is not meant for official use, filing or remittance.
          </p>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Statutory rates, reliefs and exchange rates change, and your payslip may include pension, insurance relief
            or other items this tool does not model. The bundled rates may already have drifted and may not apply
            strictly to your case, so treat every figure as indicative.
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Modelled from published {KRA_CONFIG.taxYear} rates · last reviewed {KRA_CONFIG.reviewed}.
          </p>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Read the official guidance</p>
          <ul className="mt-3 border-t border-border/60">
            {OFFICIAL_LINKS.map((link) => (
              <li key={link.href} className="border-b border-border/60">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-4 py-3 transition-colors hover:text-primary">
                  <span>
                    <span className="block text-xs">{link.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                      {link.detail}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            For PAYE, use KRA's own calculator and guidance. For NSSF and SHIF, confirm with NSSF and the Social
            Health Authority.
          </p>
        </div>
      </div>
    </section>
  );
}
