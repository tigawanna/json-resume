import { Rail } from "@/components/ui/hairline";

import { WARDROBE_ROLES } from "./content";
import { FigureSplit, SectionIntro } from "./primitives";

export function LandingHire() {
  return (
    <FigureSplit
      id="roles"
      tone="primary"
      reverse
      figure={Rail}
      label="A garment rail with seven bare hangers; the pointer brushes them and each rocks away"
      captionLabel="fig. 06 — rail"
      intensity={0.7}
    >
      <SectionIntro
        title={
          <>
            A wardrobe of <span className="text-primary">hats for the role.</span>
          </>
        }
      >
        <p>
          You've worn lots of hats but not every hat belongs on every job application. Build the
          right résumé from the pieces you already own: choose which summary, bullets and skills
          come forward for this posting, and keep the final output tidy and focused.
        </p>
      </SectionIntro>

      <ul className="mt-8 divide-y divide-border/50 border-y border-border/50">
        {WARDROBE_ROLES.map((role, index) => (
          <li
            key={role.name}
            className="group flex flex-col gap-1 px-1 py-4 transition-colors hover:bg-primary/5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium text-base-content">{role.name}</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground transition-colors group-hover:text-base-content">
              {role.picks}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        Hover the rail — each hanger rocks away from the pointer.
      </p>
    </FigureSplit>
  );
}
