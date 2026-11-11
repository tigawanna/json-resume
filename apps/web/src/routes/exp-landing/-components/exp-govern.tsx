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
        title={
          <>
            Your data stays <span className="text-primary">on your device.</span>
          </>
        }
      >
        <p>
          The editor runs locally. You bring the model key, and you can export the JSON whenever you
          want.
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
