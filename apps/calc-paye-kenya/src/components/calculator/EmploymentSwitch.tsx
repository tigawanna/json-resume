import { For } from "solid-js";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useCalculator } from "@/state/calculator";
import type { EmploymentMode } from "@/lib/calculator";

const MODES: readonly { value: EmploymentMode; label: string; icon: "briefcase" | "laptop" }[] = [
  { value: "salaried", label: "Salaried", icon: "briefcase" },
  { value: "contractor", label: "Contractor", icon: "laptop" },
];

const MODE_COPY: Record<EmploymentMode, string> = {
  salaried: "Your employer withholds PAYE, NSSF, SHIF and the housing levy.",
  contractor: "You invoice gross — set aside tax and statutory contributions yourself.",
};

export function EmploymentSwitch() {
  const calc = useCalculator();
  const employment = () => calc.controls.employment;

  return (
    <section
      aria-labelledby="employment-label"
      class="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
      <div class="flex items-center gap-3">
        <span id="employment-label" class="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          I am
        </span>
        <div role="group" aria-labelledby="employment-label" class="tc-segment">
          <For each={MODES}>
            {(mode) => (
              <Button
                size="sm"
                variant={employment() === mode.value ? "selected" : "ghost"}
                pressed={employment() === mode.value}
                onClick={() => calc.setEmployment(mode.value)}>
                <Icon name={mode.icon} size={12} />
                {mode.label}
              </Button>
            )}
          </For>
        </div>
      </div>
      <p class="max-w-md text-[11px] leading-relaxed text-muted-foreground">{MODE_COPY[employment()]}</p>
    </section>
  );
}
