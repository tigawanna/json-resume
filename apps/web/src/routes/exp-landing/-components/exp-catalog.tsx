import { Hub } from "@/components/ui/hairline";

import { CATALOG_GROUPS } from "../-utils/content";
import { FigureSplit, SectionIntro } from "./primitives";

export function ExpCatalog() {
  return (
    <FigureSplit
      id="library"
      figure={Hub}
      label="A hub with eight tiles on a grid; the tile under the pointer rises"
      captionLabel="fig. 07 — hub"
      intensity={0.65}
    >
      <SectionIntro
        eyebrow="The library"
        title={
          <>
            One library. <span className="text-primary">Every part of your career.</span>
          </>
        }
      >
        <p>
          Experiences, bullets, skills, projects, talks and summaries live side by side. Each one is
          a record you can reuse, reorder and attach to a prompt.
        </p>
      </SectionIntro>

      <div className="mt-8 grid grid-cols-1 gap-px border border-border/50 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG_GROUPS.map((group) => (
          <div
            key={group.label}
            className="group flex flex-col justify-between gap-6 bg-base-100 p-5 transition-colors hover:bg-primary/5"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs text-base-content">{group.label}</span>
              <span className="font-mono text-lg tracking-tight text-primary">{group.count}</span>
            </div>
            <span className="text-xs text-muted-foreground">{group.note}</span>
          </div>
        ))}
      </div>
    </FigureSplit>
  );
}
