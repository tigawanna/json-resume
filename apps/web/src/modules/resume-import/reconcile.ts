import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { newId } from "@/routes/_dashboard/-utils/row-helpers";
import { sameText } from "./normalize";

/**
 * - `identity`: what names the row (company, role, skill name). A close match keeps the library spelling.
 * - `fact`: dates, places, URLs. Differences default to updating the library row.
 * - `wording`: prose tailored per résumé (descriptions, tech lists). Shared rows are not reworded by default.
 */
export type FieldKind = "identity" | "fact" | "wording";

/** `link`: reuse unchanged. `update`: reuse and write the incoming values. `keep`: reuse, ignore differences. `create`: new row. */
export type ImportAction = "create" | "link" | "update" | "keep";

export type ImportSection =
  | "contacts"
  | "links"
  | "summaries"
  | "notes"
  | "experiences"
  | "education"
  | "projects"
  | "talks"
  | "skillGroups"
  | "skills";

export interface ReconcileField<K extends string> {
  key: K;
  label: string;
  kind: FieldKind;
  same?: (a: string, b: string) => boolean;
  format?: (value: string) => string;
}

type OwnedRow = { id: string; userId?: string | null };

/** How one library collection is matched and written. `rows`/`insert`/`update` bind it to the live collection. */
export interface SectionDefinition<K extends string, Row extends OwnedRow & Record<K, string>> {
  section: ImportSection;
  fields: ReadonlyArray<ReconcileField<K>>;
  label: (values: Record<K, string>) => string;
  /** Same key ⇒ same row. Must agree with `libraryKeys`, or compaction will merge what this keeps apart. */
  exactKey: (values: Record<string, unknown>) => string | null;
  /** 0 when `candidate` is not plausibly the same thing; higher is a better match. */
  closeScore?: (incoming: Record<K, string>, candidate: Record<K, string>) => number;
  rows: (db: AppDb) => ReadonlyArray<Row>;
  insert: (db: AppDb, id: string, userId: string, values: Record<K, string>) => void;
  update: (db: AppDb, id: string, values: Record<K, string>) => void;
}

export function defineSection<K extends string, Row extends OwnedRow & Record<K, string>>(
  definition: SectionDefinition<K, Row>,
) {
  return definition;
}

export interface ReconcileContext {
  userId: string;
  /** Library ids already on the résumé being imported into; preferred when matches tie. */
  onResume: ReadonlySet<string>;
  /** Library id → number of other résumés whose layout uses it. */
  usedElsewhere: ReadonlyMap<string, number>;
}

export interface ImportMatch {
  id: string;
  label: string;
  exact: boolean;
  score: number;
  /** Matched an item added earlier in this same import, not a stored row. */
  earlierEntry: boolean;
}

export interface FieldChange {
  field: string;
  label: string;
  kind: FieldKind;
  from: string;
  to: string;
}

export interface ImportEntry {
  key: string;
  section: ImportSection;
  label: string;
  match: ImportMatch | null;
  changes: FieldChange[];
  actions: ImportAction[];
  defaultAction: ImportAction;
  usedElsewhere: number;
  details: string[];
  /** Performs the write for `action` and returns the library id the layout should reference. */
  commit: (db: AppDb, action: ImportAction) => string;
}

function actionsFor(match: ImportMatch | null, changes: FieldChange[]): ImportAction[] {
  if (!match) return ["create"];
  if (match.earlierEntry || changes.length === 0) return ["link"];
  return match.exact ? ["update", "keep"] : ["update", "keep", "create"];
}

function defaultActionFor(
  match: ImportMatch | null,
  changes: FieldChange[],
  usedElsewhere: number,
): ImportAction {
  if (!match) return "create";
  if (match.earlierEntry || changes.length === 0) return "link";
  if (usedElsewhere > 0 && changes.some((change) => change.kind === "wording")) {
    return match.exact ? "keep" : "create";
  }
  if (changes.some((change) => change.kind !== "identity")) return "update";
  return "keep";
}

type Candidate<K extends string> = { id: string; values: Record<K, string>; earlierEntry: boolean };

/**
 * Matches each incoming item against the collection: exact natural key first,
 * then the best close match. Unmatched items get an id up front so later items
 * in the same batch can link to them instead of adding a duplicate.
 */
export function reconcileSection<K extends string, Row extends OwnedRow & Record<K, string>>(
  definition: SectionDefinition<K, Row>,
  db: AppDb,
  context: ReconcileContext,
  items: ReadonlyArray<Record<K, string>>,
): ImportEntry[] {
  const rows = definition
    .rows(db)
    .filter((row) => row.userId == null || row.userId === context.userId);
  const byKey = new Map<string, Row>();
  for (const row of rows) {
    const key = definition.exactKey(row);
    if (!key) continue;
    const current = byKey.get(key);
    if (!current || (!context.onResume.has(current.id) && context.onResume.has(row.id))) {
      byKey.set(key, row);
    }
  }
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const candidates: Candidate<K>[] = rows.map((row) => ({
    id: row.id,
    values: row,
    earlierEntry: false,
  }));
  const pendingByKey = new Map<string, Candidate<K>>();

  function closest(values: Record<K, string>): { candidate: Candidate<K>; score: number } | null {
    const score = definition.closeScore;
    if (!score) return null;
    let best: { candidate: Candidate<K>; score: number; rank: number } | null = null;
    for (const candidate of candidates) {
      const value = score(values, candidate.values);
      if (value <= 0) continue;
      const rank = value + (context.onResume.has(candidate.id) ? 0.05 : 0);
      if (!best || rank > best.rank) best = { candidate, score: value, rank };
    }
    return best;
  }

  return items.map((values, index) => {
    const key = definition.exactKey(values);
    const exactRow = key ? byKey.get(key) : undefined;
    const pending = key ? pendingByKey.get(key) : undefined;
    let match: ImportMatch | null = null;
    if (exactRow) {
      match = {
        id: exactRow.id,
        label: definition.label(exactRow),
        exact: true,
        score: 1,
        earlierEntry: false,
      };
    } else if (pending) {
      match = {
        id: pending.id,
        label: definition.label(pending.values),
        exact: true,
        score: 1,
        earlierEntry: true,
      };
    } else {
      const close = closest(values);
      if (close) {
        match = {
          id: close.candidate.id,
          label: definition.label(close.candidate.values),
          exact: false,
          score: close.score,
          earlierEntry: close.candidate.earlierEntry,
        };
      }
    }

    const matchedRow = match && !match.earlierEntry ? rowsById.get(match.id) : undefined;
    const changes: FieldChange[] = [];
    if (matchedRow) {
      for (const field of definition.fields) {
        const incoming = values[field.key];
        // An empty incoming value means "not provided", never "clear it".
        if (!incoming.trim()) continue;
        const current = matchedRow[field.key];
        if ((field.same ?? sameText)(current, incoming)) continue;
        const format = field.format ?? ((value: string) => value);
        changes.push({
          field: field.key,
          label: field.label,
          kind: field.kind,
          from: format(current),
          to: format(incoming),
        });
      }
    }

    const createdId = match ? null : newId();
    if (createdId) {
      const candidate = { id: createdId, values, earlierEntry: true };
      candidates.push(candidate);
      if (key) pendingByKey.set(key, candidate);
    }

    const usedElsewhere = match ? (context.usedElsewhere.get(match.id) ?? 0) : 0;
    return {
      key: `${definition.section}:${index}`,
      section: definition.section,
      label: definition.label(values),
      match,
      changes,
      actions: actionsFor(match, changes),
      defaultAction: defaultActionFor(match, changes, usedElsewhere),
      usedElsewhere,
      details: [],
      commit(target, action) {
        if (action === "create" || !match) {
          const id = createdId ?? newId();
          definition.insert(target, id, context.userId, values);
          return id;
        }
        if (action === "update" && matchedRow) {
          const changed = new Set(changes.map((change) => change.field));
          const merged: Record<K, string> = { ...values };
          for (const field of definition.fields) {
            if (!changed.has(field.key)) merged[field.key] = matchedRow[field.key];
          }
          definition.update(target, match.id, merged);
        }
        return match.id;
      },
    };
  });
}
