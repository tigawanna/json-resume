import { Plot } from "@/components/ui/hairline";

import { METRICS } from "../-utils/content";
import { FigureSplit, SectionIntro } from "./primitives";

export function ExpIntelligence() {
  return (
    <FigureSplit
      id="insight"
      tone="primary"
      reverse
      figure={Plot}
      label="A bar chart with seven flat tabs; the pointer brushes them and each lifts"
      captionLabel="fig. 08 — plot"
      intensity={0.7}
    >
      <SectionIntro
        eyebrow="Insight"
        title={
          <>
            See what your résumé <span className="text-primary">actually says.</span>
          </>
        }
      >
        <p>
          Every bullet is a claim. The library shows what you repeat, what you dropped, and what the
          last agent changed — without opening a second document.
        </p>
      </SectionIntro>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-border/50 bg-border/50 md:grid-cols-4">
        {METRICS.map((metric) => (
          <div key={metric.label} className="bg-base-100 px-4 py-5">
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <span className="block font-serif text-3xl leading-none tracking-tight text-base-content">
                {metric.value}
              </span>
              <span className="mt-2 block text-[11px] leading-snug text-muted-foreground">
                {metric.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </FigureSplit>
  );
}
