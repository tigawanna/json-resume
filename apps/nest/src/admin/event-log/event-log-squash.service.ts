import { Inject, Injectable } from '@nestjs/common';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { eq, inArray } from 'drizzle-orm';
import {
  DEFAULT_RETENTION_MS,
  planSquash,
  type SquashReason,
} from '@repo/isomorphic/sync/squash-plan';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import { EventLogProjectionService } from '../../sync/event-log-projection.service.js';

export type SquashResult = {
  users: number;
  scanned: number;
  removed: number;
  reasons: Record<SquashReason, number>;
  before: number;
};

const MIN_RETENTION_MS = 60 * 60 * 1000;
const DELETE_CHUNK = 500;
const RESET_COLLECTION = '__sync_reset__';

@Injectable()
export class EventLogSquashService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projection: EventLogProjectionService,
  ) {}

  async run({
    userId,
    retentionMs,
    dryRun = false,
  }: {
    userId?: string;
    retentionMs?: number;
    dryRun?: boolean;
  } = {}): Promise<SquashResult> {
    const before = Date.now() - Math.max(retentionMs ?? DEFAULT_RETENTION_MS, MIN_RETENTION_MS);
    if (!dryRun) await this.projection.catchUp();
    const userIds = userId
      ? [userId]
      : (
          await this.db.selectDistinct({ userId: syncEvent.userId }).from(syncEvent)
        ).map((row) => row.userId);
    const result: SquashResult = {
      users: userIds.length,
      scanned: 0,
      removed: 0,
      reasons: { superseded: 0, deleted: 0 },
      before,
    };
    for (const owner of userIds) {
      const rows = await this.db
        .select({
          globalSeq: syncEvent.globalSeq,
          collectionId: syncEvent.collectionId,
          key: syncEvent.key,
          type: syncEvent.type,
          serverTimestamp: syncEvent.serverTimestamp,
          projectedAt: syncEvent.projectedAt,
        })
        .from(syncEvent)
        .where(eq(syncEvent.userId, owner));
      const plan = planSquash(
        rows.map((row) => ({
          ...row,
          order: row.globalSeq,
          at: row.serverTimestamp.getTime(),
          pinned: row.collectionId === RESET_COLLECTION || row.projectedAt === null,
        })),
        { before },
      );
      result.scanned += rows.length;
      result.removed += plan.remove.length;
      result.reasons.superseded += plan.reasons.superseded;
      result.reasons.deleted += plan.reasons.deleted;
      if (dryRun) continue;
      const seqs = plan.remove.map((event) => event.globalSeq);
      for (let index = 0; index < seqs.length; index += DELETE_CHUNK)
        await this.db
          .delete(syncEvent)
          .where(inArray(syncEvent.globalSeq, seqs.slice(index, index + DELETE_CHUNK)));
    }
    return result;
  }
}
