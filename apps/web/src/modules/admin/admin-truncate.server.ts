import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, syncEvent } from "@/lib/drizzle/scheam";
import type { InValue } from "@libsql/client";
import { getTableColumns, getTableName, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { rowsToDeleteWith } from "../library/library-references";
import {
  isProjectableCollectionId,
  tablesByCollection,
  type ProjectableCollectionId,
} from "../sync/project-legacy.server";
import {
  SET_NULL_ON_DELETE,
  rowModeFor,
  ruleCollections,
  syncedCollectionFor,
  type AdminRowMode,
} from "./admin-row-edit.server";
import {
  quoteIdent,
  referencingForeignKeys,
  remoteColumns,
  requireTable,
  type AdminColumn,
} from "./admin-tables.server";
import {
  EVENT_LOG_TABLE,
  backupAndEmptyEventLog,
  listEventLogBackups,
  type EventLogBackup,
} from "./event-log-backup.server";
import { ownedViaParent, rebuildAllEventLogs, toPayload } from "./rebuild-event-log.server";

const ADMIN_CLIENT_ID = "server-admin";
const ID_CHUNK = 400;
const EVENT_CHUNK = 50;
/** Second-precision epochs stay below this; millisecond ones are far above it. */
const SECONDS_EPOCH_LIMIT = 100_000_000_000;
const DATE_COLUMN = /(_at|_date|date|time|timestamp)$/i;

export type TruncateCutoff = { column: string; before: number };

type Row = Record<string, unknown>;
type DeleteTarget = { collectionId: ProjectableCollectionId; row: Row; userId: string | null };

/** Columns a cutoff can compare against: named like a timestamp or typed as one. */
function cutoffColumnsOf(columns: AdminColumn[]): string[] {
  return columns
    .filter((column) => DATE_COLUMN.test(column.name) || /DATE|TIME/.test(column.type))
    .map((column) => column.name);
}

/**
 * Stored timestamps come as epoch ms, epoch seconds or date text, and one
 * table can mix them (legacy rows in seconds, synced rows in ms), so each
 * value is normalized to epoch ms before comparing.
 */
function cutoffCondition(
  table: string,
  columns: AdminColumn[],
  cutoff: TruncateCutoff,
): { sql: string; args: InValue[] } {
  const column = columns.find((candidate) => candidate.name === cutoff.column);
  if (!column || !cutoffColumnsOf(columns).includes(column.name)) {
    throw new Error(`"${cutoff.column}" is not a date column of ${table}`);
  }
  const ident = quoteIdent(column.name);
  const asMs = `case
    when typeof(${ident}) in ('integer', 'real') and ${ident} < ${SECONDS_EPOCH_LIMIT} then ${ident} * 1000
    when typeof(${ident}) in ('integer', 'real') then ${ident}
    else (julianday(${ident}) - 2440587.5) * 86400000
  end`;
  return { sql: `(${asMs}) < ?`, args: [cutoff.before] };
}

function whereFor(table: string, columns: AdminColumn[], cutoff?: TruncateCutoff) {
  return cutoff ? cutoffCondition(table, columns, cutoff) : { sql: "1 = 1", args: [] };
}

/** Owner per row for event stamping, resolved in bulk rather than one query per row. */
function createOwnerResolver() {
  const parentOwners = new Map<string, Promise<Map<string, string>>>();

  function ownersOfTable(key: string, load: () => Promise<Row[]>) {
    let pending = parentOwners.get(key);
    if (!pending) {
      pending = load().then(
        (rows) =>
          new Map(
            rows.flatMap((row) =>
              typeof row.id === "string" && typeof row.userId === "string"
                ? [[row.id, row.userId] as const]
                : [],
            ),
          ),
      );
      parentOwners.set(key, pending);
    }
    return pending;
  }

  return async function ownerOf(
    collectionId: ProjectableCollectionId,
    row: Row,
  ): Promise<string | null> {
    if (typeof row.userId === "string") return row.userId;
    if (typeof row.resumeId === "string") {
      const owners = await ownersOfTable("resume", () =>
        db.select({ id: resume.id, userId: resume.userId }).from(resume),
      );
      return owners.get(row.resumeId) ?? null;
    }
    const via = ownedViaParent[collectionId];
    const parentId = via ? row[via.column] : undefined;
    if (!via || typeof parentId !== "string") return null;
    const parentColumns: Record<string, SQLiteColumn> = getTableColumns(via.parent);
    const idColumn = parentColumns.id;
    const userColumn = parentColumns.userId;
    if (!idColumn || !userColumn) return null;
    const owners = await ownersOfTable(getTableName(via.parent), () =>
      db.select({ id: idColumn, userId: userColumn }).from(via.parent),
    );
    return owners.get(parentId) ?? null;
  };
}

type TruncatePlan = {
  table: string;
  mode: AdminRowMode | "eventLog";
  backups: EventLogBackup[];
  cutoffColumns: string[];
  rows: number;
  references: Array<{ table: string; rows: number }>;
  blockedBy: Array<{ table: string; column: string; rows: number }>;
  cascades: Array<{ table: string; column: string; rows: number }>;
  targets: DeleteTarget[];
  where: { sql: string; args: InValue[] };
};

async function planTruncate(input: { table: string; cutoff?: TruncateCutoff }) {
  const table = await requireTable(input.table);
  const isEventLog = table === EVENT_LOG_TABLE;
  const mode = isEventLog ? "eventLog" : rowModeFor(table);
  const columns = await remoteColumns(table);
  const cutoffColumns = isEventLog ? [] : cutoffColumnsOf(columns);
  const where = whereFor(table, columns, isEventLog ? undefined : input.cutoff);
  const plan: TruncatePlan = {
    table,
    mode,
    backups: isEventLog ? await listEventLogBackups() : [],
    cutoffColumns,
    rows: 0,
    references: [],
    blockedBy: [],
    cascades: [],
    targets: [],
    where,
  };
  if (mode === "readonly") return plan;

  const counted = await db.$client.execute({
    sql: `select count(*) as n from ${quoteIdent(table)} where ${where.sql}`,
    args: where.args,
  });
  plan.rows = Number(counted.rows[0]?.n ?? 0);
  if (isEventLog) return plan;

  const collectionId = mode === "synced" ? syncedCollectionFor(table) : null;
  const handledTables = new Set<string>();

  if (collectionId) {
    const ownerOf = createOwnerResolver();
    const parents: Row[] = await db.select().from(tablesByCollection[collectionId]);
    const targetIds = new Set(
      (
        await db.$client.execute({
          sql: `select id from ${quoteIdent(table)} where ${where.sql}`,
          args: where.args,
        })
      ).rows.flatMap((row) => (typeof row.id === "string" ? [row.id] : [])),
    );
    const children = new Map<string, Row[]>();
    for (const childId of ruleCollections(collectionId)) {
      if (!isProjectableCollectionId(childId)) continue;
      handledTables.add(getTableName(tablesByCollection[childId]));
      children.set(childId, await db.select().from(tablesByCollection[childId]));
    }

    const seen = new Set<string>();
    const dependents: DeleteTarget[] = [];
    for (const parent of parents) {
      if (typeof parent.id !== "string" || !targetIds.has(parent.id)) continue;
      plan.targets.push({ collectionId, row: parent, userId: await ownerOf(collectionId, parent) });
      for (const dependent of rowsToDeleteWith(
        collectionId,
        parent.id,
        (c) => children.get(c) ?? [],
      )) {
        const key = `${dependent.collectionId}:${dependent.id}`;
        if (seen.has(key) || !isProjectableCollectionId(dependent.collectionId)) continue;
        seen.add(key);
        const row = children
          .get(dependent.collectionId)
          ?.find((child) => child.id === dependent.id);
        if (!row) continue;
        dependents.push({
          collectionId: dependent.collectionId,
          row,
          userId: await ownerOf(dependent.collectionId, row),
        });
      }
    }
    const byTable = new Map<string, number>();
    for (const dependent of dependents) {
      const name = getTableName(tablesByCollection[dependent.collectionId]);
      byTable.set(name, (byTable.get(name) ?? 0) + 1);
    }
    plan.references = [...byTable].map(([name, rows]) => ({ table: name, rows }));
    plan.targets = [...dependents, ...plan.targets];
  }

  for (const key of await referencingForeignKeys(table)) {
    if (handledTables.has(key.table) || SET_NULL_ON_DELETE.has(`${key.table}.${key.from}`)) {
      continue;
    }
    const result = await db.$client.execute({
      sql: `select count(*) as n from ${quoteIdent(key.table)} where ${quoteIdent(key.from)} in (select ${quoteIdent(key.to || "id")} from ${quoteIdent(table)} where ${where.sql})`,
      args: where.args,
    });
    const rows = Number(result.rows[0]?.n ?? 0);
    if (rows === 0) continue;
    // Synced children removed by SQLite alone would linger on devices; local ones can cascade.
    const entry = { table: key.table, column: key.from, rows };
    if (syncedCollectionFor(key.table)) plan.blockedBy.push(entry);
    else plan.cascades.push(entry);
  }
  return plan;
}

export async function previewTruncate(input: { table: string; cutoff?: TruncateCutoff }) {
  const { targets: _targets, where: _where, ...preview } = await planTruncate(input);
  return preview;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Empties a table, or only rows older than a cutoff, keeping the table. On a
 * synced table each removed row, and each reference row that goes with it,
 * gets a delete event in the same batch so owners' devices drop them too.
 * `sync_event` is copied to a backup table first and can be rebuilt afterwards.
 */
export async function truncateAdminTable(input: {
  table: string;
  confirm: string;
  cutoff?: TruncateCutoff;
  rebuild?: boolean;
}) {
  if (input.confirm !== input.table) throw new Error("Type the table name to confirm");
  const plan = await planTruncate(input);
  if (plan.mode === "readonly") throw new Error(`${plan.table} is read-only`);
  if (plan.mode === "eventLog") {
    const emptied = await backupAndEmptyEventLog();
    const rebuilt = input.rebuild ? await rebuildAllEventLogs() : null;
    return {
      mode: plan.mode,
      deleted: emptied.deleted,
      backup: emptied.backup,
      references: 0,
      events: rebuilt?.insertedEvents ?? 0,
      users: rebuilt?.users ?? 0,
    };
  }
  if (plan.blockedBy.length > 0) {
    const first = plan.blockedBy[0];
    throw new Error(
      `${first?.rows} synced row(s) in ${first?.table} still reference these rows. Truncate that table first.`,
    );
  }

  if (plan.mode === "direct") {
    const result = await db.$client.execute({
      sql: `delete from ${quoteIdent(plan.table)} where ${plan.where.sql}`,
      args: plan.where.args,
    });
    return { mode: plan.mode, deleted: result.rowsAffected, references: 0, events: 0 };
  }

  const now = new Date();
  const txId = `admin-truncate-${crypto.randomUUID()}`;
  const statements: BatchItem<"sqlite">[] = [];
  const byCollection = new Map<ProjectableCollectionId, string[]>();
  for (const target of plan.targets) {
    const id = target.row.id;
    if (typeof id !== "string") continue;
    const ids = byCollection.get(target.collectionId) ?? [];
    ids.push(id);
    byCollection.set(target.collectionId, ids);
  }
  for (const [collectionId, ids] of byCollection) {
    const tableRef = tablesByCollection[collectionId];
    const idColumn: SQLiteColumn | undefined = getTableColumns(tableRef).id;
    if (!idColumn) continue;
    for (const part of chunk(ids, ID_CHUNK)) {
      statements.push(db.delete(tableRef).where(inArray(idColumn, part)));
    }
  }

  const events: (typeof syncEvent.$inferInsert)[] = plan.targets.flatMap((target) =>
    target.userId && typeof target.row.id === "string"
      ? [
          {
            eventId: crypto.randomUUID(),
            userId: target.userId,
            collectionId: target.collectionId,
            type: "delete" as const,
            key: target.row.id,
            payload: JSON.stringify(toPayload(target.row)),
            previous: null,
            txId,
            clientId: ADMIN_CLIENT_ID,
            schemaVersion: 1,
            clientTimestamp: now.getTime(),
            projectedAt: now,
          },
        ]
      : [],
  );
  for (const part of chunk(events, EVENT_CHUNK)) statements.push(db.insert(syncEvent).values(part));

  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
  return {
    mode: plan.mode,
    deleted: plan.rows,
    references: plan.targets.length - plan.rows,
    events: events.length,
  };
}
