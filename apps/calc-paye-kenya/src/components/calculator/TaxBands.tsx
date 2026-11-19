import { For } from "solid-js";
import { Disclosure, DisclosureButton, DisclosurePanel } from "terracotta/disclosure";
import { Icon } from "@/components/icons";
import { KRA_CONFIG, type KraBand } from "@/lib/calculator";

export function TaxBands(props: { bands: readonly KraBand[]; taxableAnnual: number }) {
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);

  return (
    <Disclosure defaultOpen={false} class="border-t border-border pt-3">
      <DisclosureButton class="disclosure-button">
        <Icon name="chevron" size={12} class="disclosure-chevron" />
        How the PAYE was calculated
      </DisclosureButton>
      <DisclosurePanel class="pt-3">
        <table class="w-full text-left text-[11px] tabular-nums">
          <thead class="text-muted-foreground">
            <tr>
              <th class="pb-2 font-normal">Band</th>
              <th class="pb-2 font-normal">Rate</th>
              <th class="pb-2 text-right font-normal">Taxable</th>
              <th class="pb-2 text-right font-normal">Tax</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.bands} keyed={(band) => band.label}>
              {(band) => (
                <tr class="border-t border-border/60">
                  <td class="py-1.5">{band().label}</td>
                  <td class="py-1.5 text-muted-foreground">{(band().rate * 100).toFixed(1)}%</td>
                  <td class="py-1.5 text-right">{money(band().taxable)}</td>
                  <td class="py-1.5 text-right">{money(band().tax)}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <p class="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Taxable pay {money(props.taxableAnnual)} / year, after the statutory contributions included here.
          Personal relief of {money(KRA_CONFIG.paye.personalReliefAnnual)}/year is deducted from the tax due, floored at
          zero.
        </p>
      </DisclosurePanel>
    </Disclosure>
  );
}
