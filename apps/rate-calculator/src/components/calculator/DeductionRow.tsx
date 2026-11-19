import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/calculator";

interface DeductionRowProps {
  label: string;
  hint: string;
  amount: number;
  included: boolean;
  onToggle?: () => void;
}

export function DeductionRow({ label, hint, amount, included, onToggle }: DeductionRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3">
      <div className="min-w-0">
        <p className="text-xs text-foreground">{label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        {included ? (
          <span className="numeric text-xs">{formatMoney(amount, "KES")}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Excluded</span>
        )}
        {onToggle ? (
          <Switch
            size="sm"
            checked={included}
            onCheckedChange={onToggle}
            aria-label={`Include ${label}`}
          />
        ) : (
          <span className="text-[9px] tracking-wide text-primary uppercase">Always on</span>
        )}
      </div>
    </div>
  );
}
