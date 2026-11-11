import { Exploded } from "@/components/ui/hairline";

import { PLATFORM_POINTS } from "../-utils/content";
import { FigureSplit, SectionIntro } from "./primitives";

export function ExpPlatform() {
  return (
    <FigureSplit
      id="product"
      figure={Exploded}
      label="An app window broken into four layers; the pointer opens the gap"
      captionLabel="fig. 03 — exploded"
      intensity={0.65}
    >
      <SectionIntro eyebrow="The platform" title="What is an agentic résumé?">
        <p>
          It is the same résumé you already write, stored as a typed graph instead of a page. Agents
          read the graph, propose changes, and the editor shows the diff before anything is saved.
        </p>
      </SectionIntro>

      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {PLATFORM_POINTS.map((point, index) => (
          <div key={point.title} className="border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-medium text-base-content">{point.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
          </div>
        ))}
      </div>
    </FigureSplit>
  );
}
