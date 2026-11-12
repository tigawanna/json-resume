import { ArrowRight } from "lucide-react";

import { Drawer } from "@/components/ui/hairline";

import { PROBLEM_PAIRS } from "./content";
import { FigureSplit, SectionIntro } from "./primitives";

export function LandingProblem() {
  return (
    <FigureSplit
      id="problem"
      tone="primary"
      reverse
      figure={Drawer}
      label="A filing cabinet of three drawers; the pointer pulls one out"
      captionLabel="fig. 02 — drawer"
      intensity={0.65}
    >
      <SectionIntro
        title={
          <>
            Résumé editing is fragmented. <span className="text-primary">Bring it together.</span>
          </>
        }
      >
        <p>
          Where most job seekers start → where a structured library takes them. The work stops
          living in six documents and starts living in one set of parts you can aim at any posting.
        </p>
      </SectionIntro>

      <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
        {PROBLEM_PAIRS.map((pair) => (
          <li
            key={pair.before}
            className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-b-0 sm:nth-last-2:border-b-0"
          >
            <span className="text-sm text-muted-foreground line-through decoration-border">
              {pair.before}
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="text-right text-sm font-medium text-base-content">{pair.after}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 pl-4 font-mono text-xs leading-relaxed text-muted-foreground shadow-[inset_2px_0_0_0_var(--color-primary)]">
        One collection. One source of truth. One résumé per role.
      </p>
    </FigureSplit>
  );
}
