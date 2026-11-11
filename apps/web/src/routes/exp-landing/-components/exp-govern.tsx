import { Check } from "lucide-react";

import { Vault } from "@/components/ui/hairline";

import { GOVERN_POINTS } from "../-utils/content";
import { FigureSplit, SectionIntro } from "./primitives";

export function ExpGovern() {
  return (
    <FigureSplit
      id="control"
      tone="primary"
      reverse
      figure={Vault}
      label="A vault door; the pointer turns the dial until the bolts draw back"
      captionLabel="fig. 04 — vault"
      intensity={0.6}
    >
      <SectionIntro
        eyebrow="Control"
        title={
          <>
            You own the JSON. <span className="text-primary">Every change is reversible.</span>
          </>
        }
      >
        <p>
          The résumé is the product, not the editor. Keep it local, export it whenever you like, and
          replay the history when an agent gets something wrong.
        </p>
      </SectionIntro>

      <ul className="mt-8 space-y-3">
        {GOVERN_POINTS.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/40">
              <Check className="size-3" />
            </span>
            <span className="text-sm leading-relaxed text-base-content">{point}</span>
          </li>
        ))}
      </ul>
    </FigureSplit>
  );
}
