import type { CompactionOp, Row } from "./types.ts";

export function rowTimestamp({ value }: { value: unknown }): number {
  if (value instanceof Date) return value.getTime();
  return typeof value === "number" ? value : 0;
}

export class WorkingSet {
  private readonly tables = new Map<string, Map<string, Row>>();
  private readonly original = new Map<string, Map<string, Row>>();
  private readonly dirty = new Map<string, Set<string>>();
  readonly now: number;

  constructor(input: Record<string, ReadonlyArray<Row>>, now: number) {
    this.now = now;
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
    // Devices drop a replayed row older than their copy, so a rewrite must outrank the row it read.
    const updatedAt = Math.max(this.now, rowTimestamp({ value: current.updatedAt }) + 1);
    table.set(id, { ...current, ...patch, updatedAt });
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
