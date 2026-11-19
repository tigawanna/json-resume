import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatMoney, type KraBand } from "@/lib/calculator";

export function TaxBands({
  bands,
  taxableAnnual,
  personalReliefAnnual,
}: {
  bands: readonly KraBand[];
  taxableAnnual: number;
  personalReliefAnnual: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border pt-3">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground">
          <ChevronRight className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} />
          How the PAYE was calculated
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <table className="w-full text-left text-[11px] tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-2 font-normal">Band</th>
              <th className="pb-2 font-normal">Rate</th>
              <th className="pb-2 text-right font-normal">Taxable</th>
              <th className="pb-2 text-right font-normal">Tax</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band) => (
              <tr key={band.label} className="border-t border-border/60">
                <td className="py-1.5">{band.label}</td>
                <td className="py-1.5 text-muted-foreground">{(band.rate * 100).toFixed(1)}%</td>
                <td className="py-1.5 text-right">{formatMoney(band.taxable, "KES")}</td>
                <td className="py-1.5 text-right">{formatMoney(band.tax, "KES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Taxable pay {formatMoney(taxableAnnual, "KES")} / year, after the statutory contributions included here.
          Personal relief of {formatMoney(personalReliefAnnual, "KES")}/year is deducted from the tax due, floored at
          zero.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
