import { Briefcase, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmploymentMode } from "@/lib/calculator";
import { useCalculatorStore } from "@/store";

const MODES: readonly { value: EmploymentMode; label: string; icon: typeof Briefcase }[] = [
  { value: "salaried", label: "Salaried", icon: Briefcase },
  { value: "contractor", label: "Contractor", icon: Laptop },
];

const MODE_COPY: Record<EmploymentMode, string> = {
  salaried: "Your employer withholds PAYE, NSSF, SHIF and the housing levy.",
  contractor: "You invoice gross — set aside tax and statutory contributions yourself.",
};

export function EmploymentSwitch() {
  const employment = useCalculatorStore((state) => state.controls.employment);
  const setEmployment = useCalculatorStore((state) => state.setEmployment);

  return (
    <section
      aria-labelledby="employment-label"
      className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
      <div className="flex items-center gap-3">
        <span id="employment-label" className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          I am
        </span>
        <div role="group" aria-labelledby="employment-label" className="inline-flex rounded-md border border-border p-0.5">
          {MODES.map((mode) => {
            const active = employment === mode.value;
            const Icon = mode.icon;
            return (
              <Button
                key={mode.value}
                type="button"
                size="sm"
                variant={active ? "selected" : "ghost"}
                aria-pressed={active}
                onClick={() => setEmployment(mode.value)}
                className="h-7 rounded-sm px-2.5 text-xs font-normal">
                <Icon className="size-3" />
                {mode.label}
              </Button>
            );
          })}
        </div>
      </div>
      <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">{MODE_COPY[employment]}</p>
    </section>
  );
}
