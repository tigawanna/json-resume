import { For } from "solid-js";
import { Icon } from "@/components/icons";
import { KRA_CONFIG, formatPercent } from "@/lib/calculator";

export function Disclaimer() {
  const links = [
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
      detail: `${formatPercent(KRA_CONFIG.ahl.employeeRate)} employee and ${formatPercent(KRA_CONFIG.ahl.employerRate)} employer`,
      href: "https://www.kra.go.ke/news-center/public-notices/2099-collection-of-the-affordable-housing-levy-by-kenya-revenue-authority-2",
    },
    {
      label: "KRA official tax calculators",
      detail: "Use KRA's own calculator before filing or remitting",
      href: "https://ecitizen.kra.go.ke/calculators/tax-calculators",
    },
  ];

  return (
    <section id="disclaimer" class="mt-10 scroll-mt-8 border-t border-border pt-6">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <div class="flex items-center gap-2">
            <Icon name="shield" size={14} class="text-primary" />
            <h2 class="text-sm font-medium">Not an official tool</h2>
          </div>
          <p class="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Calc Paye Kenya is an independent estimate. It is not affiliated with, endorsed by or connected to KRA, NSSF
            or SHA, and it is not meant for official use, filing or remittance.
          </p>
          <p class="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Statutory rates, reliefs and exchange rates change, and your payslip may include pension, insurance relief
            or other items this tool does not model. The bundled rates may already have drifted and may not apply
            strictly to your case, so treat every figure as indicative.
          </p>
          <p class="mt-2 text-[10px] text-muted-foreground">
            Modelled from published {KRA_CONFIG.taxYear} rates · last reviewed {KRA_CONFIG.reviewed}.
          </p>
        </div>

        <div>
          <p class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Official sources</p>
          <div class="mt-2 border-t border-border">
            <For each={links}>
              {(link) => (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  class="group flex items-start justify-between gap-4 py-3 transition-colors hover:text-primary">
                  <span>
                    <span class="block text-xs">{link.label}</span>
                    <span class="mt-0.5 block text-[10px] text-muted-foreground">{link.detail}</span>
                  </span>
                  <Icon name="arrow" size={12} class="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </a>
              )}
            </For>
          </div>
        </div>
      </div>
    </section>
  );
}
