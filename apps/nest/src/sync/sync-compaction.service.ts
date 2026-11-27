import { Inject, Injectable } from '@nestjs/common';
import { syncEvent } from '@repo/db/schema/sync-schema';
import { eq, max } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { EventLogProjectionService } from './event-log-projection.service.js';
import type { CompactionProposal } from './sync.dto.js';

const COMPACTION_COLLECTION = '__compaction__';
const CLIENT_ID = 'compaction';

@Injectable()
export class SyncCompactionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projection: EventLogProjectionService,
  ) {}

  async propose({
    userId,
    proposal,
  }: {
    userId: string;
    proposal: CompactionProposal;
  }): Promise<{ status: 'accepted'; events: number } | { status: 'stale' }> {
    const [current] = await this.db
      .select({ seq: max(syncEvent.globalSeq) })
      .from(syncEvent)
      .where(eq(syncEvent.userId, userId));
    if ((current?.seq ?? 0) > proposal.baseSeq) return { status: 'stale' };

    const now = Date.now();
    const values: Array<typeof syncEvent.$inferInsert> = proposal.ops.map((op) => ({
      eventId: crypto.randomUUID(),
      userId,
      collectionId: op.collectionId,
      type: op.type,
      key: op.id,
      payload: JSON.stringify(op.row),
      previous: op.type === 'delete' ? JSON.stringify(op.row) : null,
      txId: proposal.compactionId,
      clientId: CLIENT_ID,
      schemaVersion: 1,
      clientTimestamp: now,
    }));
    values.push({
      eventId: crypto.randomUUID(),
      userId,
      collectionId: COMPACTION_COLLECTION,
      type: 'insert',
      key: proposal.compactionId,
      payload: JSON.stringify({
        id: proposal.compactionId,
        compactionId: proposal.compactionId,
        baseSeq: proposal.baseSeq,
        prune: proposal.prune,
        events: proposal.ops.length,
        merged: proposal.merged,
        pruned: proposal.pruned,
      }),
      previous: null,
      txId: proposal.compactionId,
      clientId: CLIENT_ID,
      schemaVersion: 1,
      clientTimestamp: now,
    });
    await this.db.transaction(async (tx) => {
      for (const value of values) await tx.insert(syncEvent).values(value);
    });
    await this.projection.catchUp();
    return { status: 'accepted', events: proposal.ops.length };
  }
}
