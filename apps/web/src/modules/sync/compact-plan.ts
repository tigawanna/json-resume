import {
  layoutReferencedIds,
  replaceId,
  resumeLayoutSchema,
  type ResumeLayout,
} from "@/features/resume/resume-layout";
import { bulletKey, libraryKeys, norm } from "@/modules/library/library-keys";
import { ownedChildren, rowsToDeleteWith } from "@/modules/library/library-references";

type Row = Record<string, unknown>;

export type CompactionOp = {
  collectionId: string;
  type: "insert" | "update" | "delete";
  id: string;
  row: Row;
};

export type CompactionPlan = {
  ops: CompactionOp[];
  merged: Record<string, number>;
  /** Rows removed because no résumé layout reaches them, per collection (only with `prune`). */
  pruned: Record<string, number>;
};

/** Library collections a résumé layout points at; `prune` only touches these. */
const PRUNABLE = [...Object.keys(libraryKeys), "resumeSkillGroup", "resumeExperienceBullet"];

/** Owned children are deleted before their parent so each delete projects cleanly. */
const CHILD_COLLECTIONS = new Set(
  Object.values(ownedChildren).flatMap((children) => children.map((child) => child.collectionId)),
);

function ms(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  return typeof value === "number" ? value : 0;
}

class WorkingSet {
  private readonly tables = new Map<string, Map<string, Row>>();
  private readonly original = new Map<string, Map<string, Row>>();
  private readonly dirty = new Map<string, Set<string>>();

  constructor(
    input: Record<string, ReadonlyArray<Row>>,
    readonly now: Date,
  ) {
    for (const [collectionId, rows] of Object.entries(input)) {
      const table = new Map<string, Row>();
      for (const row of rows) if (typeof row.id === "string") table.set(row.id, { ...row });
      this.tables.set(collectionId, table);
      this.original.set(collectionId, new Map(table));
    }
  }

  private table(collectionId: string) {
    let table = this.tables.get(collectionId);
    if (!table) {
      table = new Map();
      this.tables.set(collectionId, table);
      this.original.set(collectionId, new Map());
    }
    return table;
  }

  collections(): string[] {
    return [...this.tables.keys()];
  }

  rows(collectionId: string): Row[] {
    return [...this.table(collectionId).values()];
  }

  size(collectionId: string) {
    return this.table(collectionId).size;
  }

  set(collectionId: string, id: string, patch: Row) {
    const table = this.table(collectionId);
    const current = table.get(id);
    if (!current) return;
    table.set(id, { ...current, ...patch, updatedAt: this.now });
    let dirty = this.dirty.get(collectionId);
    if (!dirty) this.dirty.set(collectionId, (dirty = new Set()));
    dirty.add(id);
  }

  delete(collectionId: string, id: string) {
    this.table(collectionId).delete(id);
  }

  diff() {
    const deletes: CompactionOp[] = [];
    const updates: CompactionOp[] = [];
    for (const [collectionId, table] of this.tables) {
      const before = this.original.get(collectionId) ?? new Map<string, Row>();
      const dirty = this.dirty.get(collectionId) ?? new Set<string>();
      // Deletes carry the full row, like client deletes, so a backup of the log can restore it.
      for (const [id, row] of before) {
        if (!table.has(id)) deletes.push({ collectionId, type: "delete", id, row });
      }
      for (const [id, row] of table) {
        if (before.has(id) && dirty.has(id)) {
          updates.push({ collectionId, type: "update", id, row });
        }
      }
    }
    return { deletes, updates };
  }
}

/**
 * Résumé layouts, edited in memory and written back once at the end. A résumé
 * whose layout does not parse (never migrated) is left alone and blocks pruning,
 * since what it shows is unknown.
 */
class Layouts {
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

function pickSurvivor(rows: Row[]): Row {
  return rows.reduce((best, row) => (ms(row.updatedAt) > ms(best.updatedAt) ? row : best));
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
  options: { now?: Date; prune?: boolean } = {},
): CompactionPlan {
  const state = new WorkingSet(input, options.now ?? new Date());
  const layouts = new Layouts(state.rows("resume"));
  const merged: Record<string, number> = {};

  for (const [collectionId, keyOf] of Object.entries(libraryKeys)) {
    merged[collectionId] = mergeBy(state, layouts, collectionId, keyOf);
  }
  merged.resumeExperienceBullet = mergeBy(state, layouts, "resumeExperienceBullet", (row) =>
    typeof row.experienceId === "string" && typeof row.text === "string"
      ? bulletKey({ experienceId: row.experienceId, text: row.text })
      : null,
  );
  merged.resumeSkillGroup = mergeBy(
    state,
    layouts,
    "resumeSkillGroup",
    (row) => norm(row.name) || null,
  );

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
