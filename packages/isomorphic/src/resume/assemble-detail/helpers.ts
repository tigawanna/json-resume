import { emptyResumeLayout, type ResumeLayout } from "../layout/schema.ts";
import type { ResumeSnapshot } from "./types.ts";

export function byId<T extends { id: string }>(rows: ReadonlyArray<T>) {
  return new Map(rows.map((row) => [row.id, row]));
}

/** Rows for `ids` in that order; missing rows are skipped. */
export function pick<T extends { id: string }>(ids: ReadonlyArray<string>, rows: Map<string, T>) {
  return ids.flatMap((id) => {
    const row = rows.get(id);
    return row ? [row] : [];
  });
}

export function mapPicked<T extends { id: string }, U>({
  ids,
  rows,
  map,
}: {
  ids: ReadonlyArray<string>;
  rows: ReadonlyArray<T>;
  map: (row: T, sortOrder: number) => U;
}): U[] {
  return pick(ids, byId(rows)).map(map);
}

/** A résumé saved before layouts existed shows the default sections only. */
export function resumeLayoutOf(resume: Pick<ResumeSnapshot, "layout"> | undefined): ResumeLayout {
  return resume?.layout ?? emptyResumeLayout();
}
