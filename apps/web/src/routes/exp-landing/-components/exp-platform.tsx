import { Exploded } from "@/components/ui/hairline";

import { PLATFORM_POINTS } from "../-utils/content";
import { FigureSplit, SectionIntro } from "./primitives";

export function ExpPlatform() {
  return (
    <FigureSplit
      id="career-brain"
      figure={Exploded}
      label="An app window broken into four layers; the pointer opens the gap"
      captionLabel="fig. 03 — exploded"
      intensity={0.65}
    >
      <SectionIntro
        title={
          <>
            The career brain, not <span className="text-primary">just a résumé builder.</span>
          </>
        }
      >
        <p>
          Your history, the applications you are running, the questions you keep getting asked, and
          the gaps a posting exposes. Résumés, cover letters and answers are outputs of that brain.
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
