import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncEvent, user } from "@/lib/drizzle/scheam";
import { getTableName } from "drizzle-orm";
import { quoteIdent, remoteColumns } from "./admin-tables.server";
import { catchUpProjection } from "./rebuild-event-log.server";

export const EVENT_LOG_TABLE = getTableName(syncEvent);
const BACKUP_PREFIX = `${EVENT_LOG_TABLE}_backup_`;
/** `sync_event_backup_YYYYMMDDHHMMSS` (UTC). Anything else is never touched by restore/drop. */
const BACKUP_NAME = new RegExp(
  `^${BACKUP_PREFIX}(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})$`,
);

export type EventLogBackup = { table: string; rows: number; createdAt: number };

function backupCreatedAt(name: string): number | null {
  const match = BACKUP_NAME.exec(name);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  if (y === undefined || mo === undefined) return null;
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

export async function listEventLogBackups(): Promise<EventLogBackup[]> {
  const result = await db.$client.execute({
    sql: "select name from sqlite_master where type = 'table' and name like ? order by name desc",
    args: [`${BACKUP_PREFIX}%`],
  });
  const backups: EventLogBackup[] = [];
  for (const row of result.rows) {
    const table = row.name;
    if (typeof table !== "string") continue;
    const createdAt = backupCreatedAt(table);
    if (createdAt === null) continue;
    const counted = await db.$client.execute(`select count(*) as n from ${quoteIdent(table)}`);
    backups.push({ table, rows: Number(counted.rows[0]?.n ?? 0), createdAt });
  }
  return backups;
}

async function requireBackup(table: string): Promise<string> {
  const backups = await listEventLogBackups();
  if (!backups.some((backup) => backup.table === table)) {
    throw new Error(`"${table}" is not an event log backup`);
  }
  return table;
}

function newBackupName(): string {
  return `${BACKUP_PREFIX}${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
}

/** Copies every `sync_event` row into a new backup table, leaving the log as it is. */
export async function backupEventLog(): Promise<{ backup: string; rows: number }> {
  const backup = newBackupName();
  await db.$client.execute(
    `create table ${quoteIdent(backup)} as select * from ${quoteIdent(EVENT_LOG_TABLE)}`,
  );
  const counted = await db.$client.execute(`select count(*) as n from ${quoteIdent(backup)}`);
  return { backup, rows: Number(counted.rows[0]?.n ?? 0) };
}

/**
 * Copies every `sync_event` row into a new backup table and empties
 * `sync_event`, in one write transaction. Pending events are projected first so
 * the projected tables already hold everything the log described.
 */
export async function backupAndEmptyEventLog(): Promise<{ backup: string; deleted: number }> {
  await catchUpProjection();
  const backup = newBackupName();
  const [, emptied] = await db.$client.batch(
    [
      `create table ${quoteIdent(backup)} as select * from ${quoteIdent(EVENT_LOG_TABLE)}`,
      `delete from ${quoteIdent(EVENT_LOG_TABLE)}`,
    ],
    "write",
  );
  return { backup, deleted: emptied?.rowsAffected ?? 0 };
}

/**
 * Copies a backup's events back into `sync_event` with their original
 * `global_seq`. Rows already present (same seq or event id) and rows of users
 * that no longer exist are skipped.
 */
export async function restoreEventLogBackup(table: string): Promise<{ restored: number }> {
  const backup = await requireBackup(table);
  const saved = new Set((await remoteColumns(backup)).map((column) => column.name));
  const columns = (await remoteColumns(EVENT_LOG_TABLE))
    .map((column) => column.name)
    .filter((name) => saved.has(name))
    .map(quoteIdent)
    .join(", ");
  const result = await db.$client.execute(
    `insert or ignore into ${quoteIdent(EVENT_LOG_TABLE)} (${columns})
     select ${columns} from ${quoteIdent(backup)}
     where "user_id" in (select "id" from ${quoteIdent(getTableName(user))})
     order by "global_seq"`,
  );
  return { restored: result.rowsAffected };
}

export async function dropEventLogBackup(table: string): Promise<{ dropped: string }> {
  const backup = await requireBackup(table);
  await db.$client.execute(`drop table ${quoteIdent(backup)}`);
  return { dropped: backup };
}
