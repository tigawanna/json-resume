import { libraryKeys } from "@repo/isomorphic/library/keys";
import { ownedChildren, rowsToDeleteWith } from "@repo/isomorphic/library/references";
import { Layouts } from "./layouts.ts";
import type { CompactionOp, CompactionPlan, Row } from "./types.ts";
import { rowTimestamp, WorkingSet } from "./working-set.ts";

export type { CompactionOp, CompactionPlan } from "./types.ts";

/** Library collections a résumé layout points at; `prune` only touches these. */
const PRUNABLE = Object.keys(libraryKeys);

/** Owned children are deleted before their parent so each delete projects cleanly. */
const CHILD_COLLECTIONS = new Set(
  Object.values(ownedChildren).flatMap((children) => children.map((child) => child.collectionId)),
);

/** Every collection a plan reads; a missing one is treated as empty and never pruned. */
export const COMPACTION_INPUT_COLLECTIONS: readonly string[] = [
  ...new Set(["resume", ...PRUNABLE, ...CHILD_COLLECTIONS]),
];

/** Newest row wins; ties go to the smaller id so every device picks the same one. */
function pickSurvivor(rows: Row[]): Row {
  return rows.reduce((best, row) => {
    const diff = rowTimestamp({ value: row.updatedAt }) - rowTimestamp({ value: best.updatedAt });
    if (diff !== 0) return diff > 0 ? row : best;
    return String(row.id) < String(best.id) ? row : best;
  });
}

/** Points owned children and every layout that referenced `from` at `to`, then drops `from`. */
function absorb(
  state: WorkingSet,
  layouts: Layouts,
  collectionId: string,
  from: string,
  to: string,
) {
  for (const child of ownedChildren[collectionId] ?? []) {
    for (const row of state.rows(child.collectionId)) {
      if (row[child.field] === from && typeof row.id === "string") {
        state.set(child.collectionId, row.id, { [child.field]: to });
      }
    }
  }
  layouts.replace(from, to);
  state.delete(collectionId, from);
}

function mergeBy(
  state: WorkingSet,
  layouts: Layouts,
  collectionId: string,
  keyOf: (row: Row) => string | null,
): number {
  const groups = new Map<string, Row[]>();
  for (const row of state.rows(collectionId)) {
    const key = keyOf(row);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  let merged = 0;
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const survivor = pickSurvivor(rows);
    for (const row of rows) {
      if (row === survivor || typeof row.id !== "string" || typeof survivor.id !== "string") {
        continue;
      }
      absorb(state, layouts, collectionId, row.id, survivor.id);
      merged++;
    }
  }
  return merged;
}

/** Deletes library rows no layout reaches, with their owned children. */
function pruneUnreferenced(state: WorkingSet, layouts: Layouts, loaded: Set<string>) {
  if (!loaded.has("resume") || layouts.unknown.length > 0) return;
  const reached = layouts.reached();
  for (const collectionId of PRUNABLE) {
    if (!loaded.has(collectionId)) continue;
    for (const row of state.rows(collectionId)) {
      if (typeof row.id !== "string" || reached.has(row.id)) continue;
      for (const dependent of rowsToDeleteWith(collectionId, row.id, (c) => state.rows(c))) {
        state.delete(dependent.collectionId, dependent.id);
      }
      state.delete(collectionId, row.id);
    }
  }
}

/**
 * One user's rows in, the events that collapse them to unique library rows
 * out. Skill groups merge by name; résumés that showed both keep the union of
 * their skills. With `prune`, rows no résumé layout reaches are deleted too.
 * Updates (layouts, repointed bullets) come before deletes, and owned children
 * are deleted before their parent.
 */
export function planCompaction(
  input: Record<string, ReadonlyArray<Row>>,
  options: { now?: number; prune?: boolean } = {},
): CompactionPlan {
  const state = new WorkingSet(input, options.now ?? Date.now());
  const layouts = new Layouts(state.rows("resume"));
  const merged: Record<string, number> = {};

  for (const [collectionId, keyOf] of Object.entries(libraryKeys)) {
    merged[collectionId] = mergeBy(state, layouts, collectionId, keyOf);
  }

  const pruned: Record<string, number> = {};
  if (options.prune) {
    const sizes = new Map(state.collections().map((id) => [id, state.size(id)]));
    pruneUnreferenced(state, layouts, new Set(Object.keys(input)));
    for (const [collectionId, size] of sizes) {
      const removed = size - state.size(collectionId);
      if (removed > 0) pruned[collectionId] = removed;
    }
  }

  layouts.writeChanged(state);

  const { deletes, updates } = state.diff();
  const isChild = (op: CompactionOp) => CHILD_COLLECTIONS.has(op.collectionId);
  return {
    ops: [...updates, ...deletes.filter(isChild), ...deletes.filter((op) => !isChild(op))],
    merged,
    pruned,
  };
}
