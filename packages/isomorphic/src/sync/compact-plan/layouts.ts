import {
  layoutReferencedIds,
  replaceId,
  resumeLayoutSchema,
  type ResumeLayout,
} from "@repo/isomorphic/resume/layout";
import type { Row } from "./types.ts";
import type { WorkingSet } from "./working-set.ts";

/**
 * Résumé layouts, edited in memory and written back once at the end. A résumé
 * whose layout does not parse (never migrated) is left alone and blocks pruning,
 * since what it shows is unknown.
 */
export class Layouts {
  private readonly current = new Map<string, ResumeLayout>();
  private readonly before = new Map<string, string>();
  readonly unknown: string[] = [];

  constructor(resumes: Row[]) {
    for (const resume of resumes) {
      if (typeof resume.id !== "string") continue;
      const parsed = resumeLayoutSchema.safeParse(resume.layout);
      if (!parsed.success || resume.layout == null) {
        this.unknown.push(resume.id);
        continue;
      }
      this.current.set(resume.id, parsed.data);
      this.before.set(resume.id, JSON.stringify(parsed.data));
    }
  }

  replace(from: string, to: string) {
    for (const [resumeId, layout] of this.current) {
      this.current.set(resumeId, replaceId(layout, from, to));
    }
  }

  reached(): Set<string> {
    const ids = new Set<string>();
    for (const layout of this.current.values()) {
      for (const id of layoutReferencedIds(layout)) ids.add(id);
    }
    return ids;
  }

  writeChanged(state: WorkingSet) {
    for (const [resumeId, layout] of this.current) {
      if (JSON.stringify(layout) !== this.before.get(resumeId)) {
        state.set("resume", resumeId, { layout });
      }
    }
  }
}
