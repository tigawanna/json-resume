import {
  layoutReferencedIds,
  removeIdEverywhere,
  type ResumeLayout,
} from "@/features/resume/resume-layout";
import { nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import type { AppDb } from "./collection";
import { resumeLayoutOf } from "./assemble-resume-detail";

/** The résumé's live layout. */
export function currentLayout(db: AppDb, resumeId: string): ResumeLayout {
  return resumeLayoutOf(db.collections.resume.get(resumeId));
}

/** Reads the live layout (not a render snapshot), so chained edits see each other. */
export function editLayout(
  db: AppDb,
  resumeId: string,
  edit: (layout: ResumeLayout) => ResumeLayout,
) {
  if (!db.collections.resume.has(resumeId)) return;
  const next = edit(currentLayout(db, resumeId));
  db.collections.resume.update(resumeId, (draft) => {
    draft.layout = next;
    draft.updatedAt = nowMs();
  });
}

/** Strips deleted library rows from every stored layout that names them. */
export function removeFromLayouts(db: AppDb, ids: ReadonlyArray<string>) {
  if (ids.length === 0) return;
  for (const resume of db.collections.resume.toArray) {
    if (!resume.layout) continue;
    const referenced = layoutReferencedIds(resume.layout);
    if (!ids.some((id) => referenced.has(id))) continue;
    editLayout(db, resume.id, (layout) => ids.reduce(removeIdEverywhere, layout));
  }
}
