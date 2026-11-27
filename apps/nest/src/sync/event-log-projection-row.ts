import { sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import type { DrizzleDB } from '../database/database.module.js';

type ProjectionEvent = typeof syncEvent.$inferSelect;
type PgValue = null | string | number | bigint | boolean | Date | Uint8Array;

export async function applyProjectedRow({
  db,
  event,
  tableName,
  columns,
}: {
  db: DrizzleDB;
  event: ProjectionEvent;
  tableName: string;
  columns: Record<string, PgColumn>;
}) {
  const columnEntries = Object.entries(columns);
  const idColumn = columnEntries.find(([name]) => name === 'id')?.[1];
  const ownerColumn = columnEntries.find(([name]) => name === 'userId')?.[1];
  if (!idColumn || !ownerColumn || !idColumn.name || !ownerColumn.name)
    return true;
  if (event.type === 'delete') {
    await db.execute(sql`
      delete from ${sql.identifier(tableName)}
      where ${sql.identifier(idColumn.name)} = ${event.key}
        and ${sql.identifier(ownerColumn.name)} = ${event.userId}
    `);
    return true;
  }
  const payload = payloadOf({ event });
  if (!('id' in payload)) return true;
  const assigned: Array<{ column: PgColumn; value: unknown }> = [
    { column: idColumn, value: event.key },
    { column: ownerColumn, value: event.userId },
  ];
  for (const [property, column] of columnEntries) {
    if (property === 'id' || property === 'userId' || property === 'embedding')
      continue;
    if (!column.name || !(property in payload)) continue;
    assigned.push({
      column,
      value: databaseValue({ column, value: payload[property] }),
    });
  }
  const names = assigned.map(({ column }) => sql.identifier(column.name));
  const values = assigned.map(({ value }) => sql`${toPgValue({ value })}`);
  const updates = assigned.map(
    ({ column }) =>
      sql`${sql.identifier(column.name)} = excluded.${sql.identifier(column.name)}`,
  );
  const result = await db.execute(sql`
    insert into ${sql.identifier(tableName)} (${sql.join(names, sql`, `)})
    values (${sql.join(values, sql`, `)})
    on conflict (${sql.identifier(idColumn.name)}) do update set ${sql.join(updates, sql`, `)}
    where ${sql.identifier(ownerColumn.name)} = excluded.${sql.identifier(ownerColumn.name)}
    returning 1
  `);
  return (result.rowCount ?? 0) > 0;
}

export function createdAtOf({ payload }: { payload: Record<string, unknown> }) {
  const value = payload.createdAt;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

export function payloadOf({
  event,
}: {
  event: ProjectionEvent;
}): Record<string, unknown> {
  if (!event.payload) return {};
  const parsed: unknown = JSON.parse(event.payload);
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Event payload is not an object');
  }
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) payload[key] = value;
  return payload;
}

function databaseValue({
  column,
  value,
}: {
  column: PgColumn;
  value: unknown;
}): unknown {
  const sqlType = column.getSQLType().toLowerCase();
  if (sqlType.includes('timestamp')) return timestampOf({ value });
  if (sqlType === 'json' || sqlType === 'jsonb') return JSON.stringify(value);
  return value;
}

function timestampOf({ value }: { value: unknown }) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return value;
}

function toPgValue({ value }: { value: unknown }): PgValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  throw new Error('Sync event payload contains an unsupported database value');
}
