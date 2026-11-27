import type { InValue } from '@libsql/client';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { syncBackend, syncEvent } from '@repo/db/schema/sync-schema';
import { eq, getTableColumns, getTableName, isNull } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { ResumeCreditChargeService } from '../credits/resume-credit-charge.service.js';
import {
  isCollectionId,
  tableForCollection,
} from '../admin/tables/admin-table-registry.js';
import { quoteIdent } from '../admin/tables/admin-table-metadata.service.js';

type SyncEventRow = typeof syncEvent.$inferSelect;

const BATCH_SIZE = 500;
const MAX_ROUNDS = 50;
const MAX_ATTEMPTS = 3;
const SKIP_COLLECTIONS = new Set([
  'settings',
  '__sync_reset__',
  '__compaction__',
  '__compaction_request__',
]);

@Injectable()
export class EventLogProjectionService {
  private readonly logger = new Logger(EventLogProjectionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly charges: ResumeCreditChargeService,
  ) {}

  /**
   * Apply pending events in sequence, stamping them and the backend cursor.
   * An event that keeps failing is stamped after MAX_ATTEMPTS so a poison row
   * cannot block every later event, but transient failures get retried.
   */
  async catchUp(): Promise<number> {
    let processed = 0;
    const attempts = new Map<number, number>();
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const pending = await this.db
        .select()
        .from(syncEvent)
        .where(isNull(syncEvent.projectedAt))
        .orderBy(syncEvent.globalSeq)
        .limit(BATCH_SIZE);
      if (pending.length === 0) break;
      for (const event of pending) {
        const attempt = (attempts.get(event.globalSeq) ?? 0) + 1;
        attempts.set(event.globalSeq, attempt);
        const applied = await this.apply({ event });
        if (applied || attempt >= MAX_ATTEMPTS) {
          if (!applied)
            this.logger.warn(
              `sync.projection_gave_up ${JSON.stringify({
                globalSeq: event.globalSeq,
                eventId: event.eventId,
              })}`,
            );
          await this.stamp({ event });
          processed += 1;
        }
      }
    }
    return processed;
  }

  /**
   * Every write is scoped to the signed-in owner. `id` and `user_id` always
   * come from the event row, never from the client payload, and the upsert's
   * WHERE stops a caller from taking over another user's row by id.
   */
  private async apply({ event }: { event: SyncEventRow }): Promise<boolean> {
    if (SKIP_COLLECTIONS.has(event.collectionId) || !isCollectionId(event.collectionId))
      return true;
    try {
      const table = tableForCollection({ collectionId: event.collectionId });
      const tableName = getTableName(table);
      const columns: Record<string, SQLiteColumn> = getTableColumns(table);
      const columnEntries = Object.entries(columns);
      const idColumn = columnEntries.find(([name]) => name === 'id')?.[1];
      const ownerColumn = columnEntries.find(([name]) => name === 'userId')?.[1];
      if (!idColumn || !ownerColumn) return true;
      if (event.type === 'delete') {
        await this.db.$client.execute({
          sql: `delete from ${quoteIdent({ name: tableName })}
            where ${quoteIdent({ name: idColumn.name })} = ?
              and ${quoteIdent({ name: ownerColumn.name })} = ?`,
          args: [event.key, event.userId],
        });
        return true;
      }
      const payload = this.payloadOf({ event });
      if (!('id' in payload)) return true;

      const assigned = [
        { name: idColumn.name, value: event.key as unknown },
        { name: ownerColumn.name, value: event.userId as unknown },
      ];
      for (const [property, column] of columnEntries) {
        if (
          property === 'id' ||
          property === 'userId' ||
          property === 'embedding' ||
          !column.name ||
          !(property in payload)
        )
          continue;
        const value = payload[property];
        assigned.push({
          name: column.name,
          value:
            column.name === 'created_at' || column.name === 'updated_at'
              ? timestampOf({ value })
              : value,
        });
      }
      const columnNames = assigned.map(({ name }) => quoteIdent({ name }));
      const assignments = assigned
        .map(({ name }) => `${quoteIdent({ name })} = excluded.${quoteIdent({ name })}`)
        .join(', ');
      const result = await this.db.$client.execute({
        sql: `insert into ${quoteIdent({ name: tableName })} (${columnNames.join(', ')})
          values (${assigned.map(() => '?').join(', ')})
          on conflict(${quoteIdent({ name: idColumn.name })}) do update set ${assignments}
          where ${quoteIdent({ name: ownerColumn.name })} = excluded.${quoteIdent({ name: ownerColumn.name })}`,
        args: assigned.map(({ value }) => toInValue({ value })),
      });
      if (result.rowsAffected > 0 && event.collectionId === 'resume' && event.type === 'insert')
        await this.charges.chargeProjectedResume({
          userId: event.userId,
          resumeId: event.key,
          createdAt: createdAtOf({ payload }),
        });
      return true;
    } catch {
      return false;
    }
  }

  private payloadOf({ event }: { event: SyncEventRow }): Record<string, unknown> {
    if (!event.payload) return {};
    const parsed: unknown = JSON.parse(event.payload);
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Event payload is not an object');
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) payload[key] = value;
    return payload;
  }

  private async stamp({ event }: { event: SyncEventRow }) {
    await this.db
      .update(syncEvent)
      .set({ projectedAt: new Date() })
      .where(eq(syncEvent.globalSeq, event.globalSeq));
    const [backend] = await this.db
      .select({ seq: syncBackend.lastProjectedSeq })
      .from(syncBackend)
      .where(eq(syncBackend.id, 1))
      .limit(1);
    const next = Math.max(backend?.seq ?? 0, event.globalSeq);
    if (next !== backend?.seq)
      await this.db
        .update(syncBackend)
        .set({ lastProjectedSeq: next })
        .where(eq(syncBackend.id, 1));
  }
}

function timestampOf({ value }: { value: unknown }) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return value;
}

function toInValue({ value }: { value: unknown }): InValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    value instanceof ArrayBuffer ||
    value instanceof Uint8Array
  )
    return value;
  throw new Error('Sync event payload contains an unsupported database value');
}

function createdAtOf({ payload }: { payload: Record<string, unknown> }) {
  const value = payload.createdAt;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}
