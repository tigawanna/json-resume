import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, syncEvent } from "@/lib/drizzle/scheam";
import type { InValue, Row as LibsqlRow } from "@libsql/client";
import { eq, getTableColumns, getTableName, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  isProjectableCollectionId,
  tablesByCollection,
  type ProjectableCollectionId,
} from "../sync/project-legacy.server";
import { LOCAL_ONLY_COLLECTIONS } from "../sync/sync-events.server";
import {
  isSecret,
  quoteIdent,
  referencingForeignKeys,
  remoteColumns,
  remoteForeignKeys,
  requireTable,
  type AdminColumn,
} from "./admin-tables.server";
import { ownedViaParent, ownerFilter, toPayload } from "./rebuild-event-log.server";
import { parentRules, rowsToDeleteWith } from "../library/library-references";

/** The event log and its bookkeeping: editing these breaks sync for everyone. */
const READ_ONLY_TABLES = new Set(["sync_event", "sync_backend", "__drizzle_migrations"]);
const ADMIN_CLIENT_ID = "server-admin";
/**
 * Synced rows keep their identity and owner. Foreign keys are locked too: they
 * define ownership (`resume_id`, `experience_id`, …), so changing one would move
 * the row to another user without the old owner's devices hearing about it.
 */
const LOCKED_SYNCED_COLUMNS = new Set(["id", "user_id"]);

/**
 * - `synced`: projected from the event log. Writes also append an event so
 *   devices receive the change on their next pull.
 * - `direct`: not in the log (auth, local-only AI tables); written as-is.
 * - `readonly`: sync bookkeeping.
 */
export type AdminRowMode = "synced" | "direct" | "readonly";

export type AdminRowField = {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  value: string | number | null;
  kind: "value" | "secret" | "binary";
  editable: boolean;
};

type DrizzleRow = Record<string, unknown>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function syncedCollectionFor(table: string): ProjectableCollectionId | null {
  for (const id of Object.keys(tablesByCollection)) {
    if (!isProjectableCollectionId(id)) continue;
    if (LOCAL_ONLY_COLLECTIONS.includes(id)) continue;
    if (getTableName(tablesByCollection[id]) === table) return id;
  }
  return null;
}

function rowModeFor(table: string): AdminRowMode {
  if (READ_ONLY_TABLES.has(table)) return "readonly";
  return syncedCollectionFor(table) ? "synced" : "direct";
}

async function lockedColumnsFor(mode: AdminRowMode, table: string): Promise<Set<string>> {
  if (mode !== "synced") return new Set();
  const keys = await remoteForeignKeys(table);
  return new Set([...LOCKED_SYNCED_COLUMNS, ...keys.map((key) => key.from)]);
}

function isEditable(
  mode: AdminRowMode,
  table: string,
  column: AdminColumn,
  locked: Set<string>,
): boolean {
  if (mode === "readonly" || column.primaryKey || isSecret(table, column.name)) return false;
  if (column.type.includes("BLOB")) return false;
  return !locked.has(column.name);
}

async function readRawRow(table: string, rowid: number): Promise<LibsqlRow> {
  const result = await db.$client.execute({
    sql: `select * from ${quoteIdent(table)} where rowid = ?`,
    args: [rowid],
  });
  const row = result.rows[0];
  if (!row) throw new Error(`Row ${rowid} no longer exists in ${table}`);
  return row;
}

function syncKeyOf(table: string, row: LibsqlRow): string {
  const id = row.id;
  if (typeof id === "string") return id;
  if (typeof id === "number" || typeof id === "bigint") return id.toString();
  throw new Error(`${table} row has no usable id, so no sync event can be written`);
}

export async function readAdminRow(input: { table: string; rowid: number }) {
  const table = await requireTable(input.table);
  const mode = rowModeFor(table);
  const [columns, row, locked] = await Promise.all([
    remoteColumns(table),
    readRawRow(table, input.rowid),
    lockedColumnsFor(mode, table),
  ]);

  const fields: AdminRowField[] = columns.map((column) => {
    const raw = row[column.name];
    const base = {
      name: column.name,
      type: column.type,
      primaryKey: column.primaryKey,
      notNull: column.notNull,
      editable: isEditable(mode, table, column, locked),
    };
    if (isSecret(table, column.name)) return { ...base, value: null, kind: "secret" };
    if (raw instanceof ArrayBuffer) {
      return { ...base, value: `<binary ${raw.byteLength} bytes>`, kind: "binary" };
    }
    if (typeof raw === "bigint") return { ...base, value: raw.toString(), kind: "value" };
    return { ...base, value: raw ?? null, kind: "value" };
  });

  return { table, rowid: input.rowid, mode, fields };
}

const NUMERIC_TYPE = /INT|REAL|NUM|DOUBLE|FLOAT|DEC|BOOL/;

function toSqlValue(column: AdminColumn, value: string | null): InValue {
  if (value === null) return null;
  if (!NUMERIC_TYPE.test(column.type)) return value;
  const trimmed = value.trim();
  if (trimmed === "" || !Number.isFinite(Number(trimmed))) {
    throw new Error(`Column "${column.name}" needs a number`);
  }
  return Number(trimmed);
}

async function readSyncedRow(
  executor: Tx | typeof db,
  collectionId: ProjectableCollectionId,
  id: string,
) {
  const table = tablesByCollection[collectionId];
  const columns: Record<string, SQLiteColumn> = getTableColumns(table);
  const idColumn = columns.id;
  if (!idColumn) throw new Error(`${collectionId} has no id column`);
  const rows: DrizzleRow[] = await executor.select().from(table).where(eq(idColumn, id)).limit(1);
  const row = rows[0];
  if (!row) throw new Error(`${collectionId} row ${id} not found`);
  return row;
}

async function ownerOf(collectionId: ProjectableCollectionId, row: DrizzleRow): Promise<string> {
  if (typeof row.userId === "string") return row.userId;
  if (typeof row.resumeId === "string") {
    const [owner] = await db
      .select({ userId: resume.userId })
      .from(resume)
      .where(eq(resume.id, row.resumeId))
      .limit(1);
    if (owner) return owner.userId;
  }
  const via = ownedViaParent[collectionId];
  const parentId = via ? row[via.column] : undefined;
  if (via && typeof parentId === "string") {
    const parentColumns: Record<string, SQLiteColumn> = getTableColumns(via.parent);
    if (parentColumns.id && parentColumns.userId) {
      const parents: DrizzleRow[] = await db
        .select({ userId: parentColumns.userId })
        .from(via.parent)
        .where(eq(parentColumns.id, parentId))
        .limit(1);
      const userId = parents[0]?.userId;
      if (typeof userId === "string") return userId;
    }
  }
  throw new Error(`Cannot tell which user owns this ${collectionId} row`);
}

async function appendAdminEvent(
  tx: Tx,
  input: {
    collectionId: ProjectableCollectionId;
    userId: string;
    type: "update" | "delete";
    row: DrizzleRow;
  },
) {
  const now = new Date();
  await tx.insert(syncEvent).values({
    eventId: crypto.randomUUID(),
    userId: input.userId,
    collectionId: input.collectionId,
    type: input.type,
    key: String(input.row.id),
    payload: JSON.stringify(toPayload(input.row)),
    previous: null,
    txId: `admin-${crypto.randomUUID()}`,
    clientId: ADMIN_CLIENT_ID,
    schemaVersion: 1,
    clientTimestamp: now.getTime(),
    projectedAt: now,
  });
}

/** Resolves the synced row and its owner before anything is written, so a failure leaves no partial change. */
async function syncedTarget(table: string, rowid: number) {
  const collectionId = syncedCollectionFor(table);
  if (!collectionId) return null;
  const id = syncKeyOf(table, await readRawRow(table, rowid));
  const row = await readSyncedRow(db, collectionId, id);
  const userId = await ownerOf(collectionId, row);
  return { collectionId, id, userId };
}

export async function updateAdminRow(input: {
  table: string;
  rowid: number;
  values: Record<string, string | null>;
}) {
  const table = await requireTable(input.table);
  const mode = rowModeFor(table);
  if (mode === "readonly") throw new Error(`${table} is read-only`);

  const [columns, locked] = await Promise.all([
    remoteColumns(table),
    lockedColumnsFor(mode, table),
  ]);
  const assignments: SQL[] = [];
  for (const [name, value] of Object.entries(input.values)) {
    const column = columns.find((candidate) => candidate.name === name);
    if (!column || !isEditable(mode, table, column, locked)) {
      throw new Error(`Column "${name}" cannot be edited`);
    }
    if (value === null && column.notNull) throw new Error(`Column "${name}" cannot be empty`);
    assignments.push(sql`${sql.raw(quoteIdent(name))} = ${toSqlValue(column, value)}`);
  }
  if (assignments.length === 0) return { mode, changed: 0 };

  // Devices drop remote writes older than their own copy, so the edit must look new.
  const updatedAt = columns.find((column) => column.name === "updated_at");
  if (updatedAt && !("updated_at" in input.values)) {
    const stamp = NUMERIC_TYPE.test(updatedAt.type) ? Date.now() : new Date().toISOString();
    assignments.push(sql`${sql.raw(quoteIdent("updated_at"))} = ${stamp}`);
  }

  const target = mode === "synced" ? await syncedTarget(table, input.rowid) : null;

  await db.transaction(async (tx) => {
    await tx.run(
      sql`update ${sql.raw(quoteIdent(table))} set ${sql.join(assignments, sql`, `)} where rowid = ${input.rowid}`,
    );
    if (target) {
      const row = await readSyncedRow(tx, target.collectionId, target.id);
      await appendAdminEvent(tx, { ...target, type: "update", row });
    }
  });
  return { mode, changed: Object.keys(input.values).length };
}

/** Legacy pointer that SQLite nulls on delete; compaction moves it onto a join row anyway. */
const SET_NULL_ON_DELETE = new Set(["resume_skill.group_id"]);

/**
 * SQLite cascades would remove children without delete events, leaving them
 * on devices. Rows the parent only points from (join rows, owned bullets) are
 * deleted explicitly with events; anything else still blocks.
 */
async function assertNoChildren(table: string, row: LibsqlRow, handled: Set<string>) {
  const keys = await referencingForeignKeys(table);
  for (const key of keys) {
    if (handled.has(key.table) || SET_NULL_ON_DELETE.has(`${key.table}.${key.from}`)) continue;
    const value = row[key.to || "id"];
    if (value == null || value instanceof ArrayBuffer) continue;
    const result = await db.$client.execute({
      sql: `select count(*) as n from ${quoteIdent(key.table)} where ${quoteIdent(key.from)} = ?`,
      args: [value],
    });
    const n = Number(result.rows[0]?.n ?? 0);
    if (n > 0) {
      throw new Error(
        `${n} row(s) in ${key.table} still reference this row. Delete them first so their devices are told too.`,
      );
    }
  }
}

/** Every collection `rowsToDeleteWith` may read for this parent, following owned children. */
function ruleCollections(collectionId: string, out = new Set<string>()): Set<string> {
  const rule = parentRules[collectionId];
  for (const ref of rule?.references ?? []) out.add(ref.collectionId);
  for (const owned of rule?.owned ?? []) {
    if (out.has(owned.collectionId)) continue;
    out.add(owned.collectionId);
    ruleCollections(owned.collectionId, out);
  }
  return out;
}

/** Reference rows and owned children that go with this parent, loaded in full for their events. */
async function dependentsOf(collectionId: ProjectableCollectionId, id: string, userId: string) {
  const loaded = new Map<string, DrizzleRow[]>();
  for (const childId of ruleCollections(collectionId)) {
    if (!isProjectableCollectionId(childId)) continue;
    const rows: DrizzleRow[] = await db
      .select()
      .from(tablesByCollection[childId])
      .where(ownerFilter(childId, userId));
    loaded.set(childId, rows);
  }
  const rows: Array<{ collectionId: ProjectableCollectionId; row: DrizzleRow }> = [];
  for (const dependent of rowsToDeleteWith(collectionId, id, (c) => loaded.get(c) ?? [])) {
    if (!isProjectableCollectionId(dependent.collectionId)) continue;
    const row = loaded
      .get(dependent.collectionId)
      ?.find((candidate) => candidate.id === dependent.id);
    if (row) rows.push({ collectionId: dependent.collectionId, row });
  }
  return {
    rows,
    tables: new Set(
      [...ruleCollections(collectionId)]
        .filter(isProjectableCollectionId)
        .map((childId) => getTableName(tablesByCollection[childId])),
    ),
  };
}

export async function deleteAdminRow(input: { table: string; rowid: number }) {
  const table = await requireTable(input.table);
  const mode = rowModeFor(table);
  if (mode === "readonly") throw new Error(`${table} is read-only`);

  let target: Awaited<ReturnType<typeof syncedTarget>> = null;
  let syncedRow: DrizzleRow | null = null;
  let dependents: Awaited<ReturnType<typeof dependentsOf>>["rows"] = [];
  if (mode === "synced") {
    target = await syncedTarget(table, input.rowid);
    const found = target
      ? await dependentsOf(target.collectionId, target.id, target.userId)
      : { rows: [], tables: new Set<string>() };
    dependents = found.rows;
    await assertNoChildren(table, await readRawRow(table, input.rowid), found.tables);
    if (target) syncedRow = await readSyncedRow(db, target.collectionId, target.id);
  }

  await db.transaction(async (tx) => {
    if (target) {
      for (const dependent of dependents) {
        const childTable = tablesByCollection[dependent.collectionId];
        const childColumns: Record<string, SQLiteColumn> = getTableColumns(childTable);
        const childId = childColumns.id;
        if (!childId) continue;
        await tx.delete(childTable).where(eq(childId, dependent.row.id));
        await appendAdminEvent(tx, {
          collectionId: dependent.collectionId,
          userId: target.userId,
          type: "delete",
          row: dependent.row,
        });
      }
    }
    await tx.run(sql`delete from ${sql.raw(quoteIdent(table))} where rowid = ${input.rowid}`);
    if (target && syncedRow) {
      await appendAdminEvent(tx, { ...target, type: "delete", row: syncedRow });
    }
  });
  return { mode, deletedReferences: dependents.length };
}
