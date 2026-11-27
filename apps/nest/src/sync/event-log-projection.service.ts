import { Inject, Injectable, Logger } from '@nestjs/common';
import { syncBackend, syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { eq, getTableColumns, getTableName, isNull } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { ResumeCreditChargeService } from '../credits/resume-credit-charge.service.js';
import {
  isCollectionId,
  tableForCollection,
} from '../admin/tables/admin-table-registry.js';
import {
  applyProjectedRow,
  createdAtOf,
  payloadOf,
} from './event-log-projection-row.js';

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

  /** Apply pending events in sequence, retrying poison rows a bounded number of times. */
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
          if (!applied) {
            this.logger.warn(
              `sync.projection_gave_up ${JSON.stringify({ globalSeq: event.globalSeq, eventId: event.eventId })}`,
            );
          }
          await this.stamp({ event });
          processed += 1;
        }
      }
    }
    return processed;
  }

  /** Every write is scoped to the event owner; payload ids never take over another user's row. */
  private async apply({ event }: { event: SyncEventRow }): Promise<boolean> {
    if (
      SKIP_COLLECTIONS.has(event.collectionId) ||
      !isCollectionId(event.collectionId)
    )
      return true;
    try {
      const table = tableForCollection({ collectionId: event.collectionId });
      const columns: Record<string, PgColumn> = getTableColumns(table);
      const applied = await applyProjectedRow({
        db: this.db,
        event,
        tableName: getTableName(table),
        columns,
      });
      if (
        applied &&
        event.collectionId === 'resume' &&
        event.type === 'insert'
      ) {
        await this.charges.chargeProjectedResume({
          userId: event.userId,
          resumeId: event.key,
          createdAt: createdAtOf({ payload: payloadOf({ event }) }),
        });
      }
      return true;
    } catch (error: unknown) {
      this.logger.warn(
        `sync.projection_failed ${JSON.stringify({
          eventId: event.eventId,
          error: error instanceof Error ? error.message : String(error),
        })}`,
      );
      return false;
    }
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
    if (next !== backend?.seq) {
      await this.db
        .update(syncBackend)
        .set({ lastProjectedSeq: next })
        .where(eq(syncBackend.id, 1));
    }
  }
}
