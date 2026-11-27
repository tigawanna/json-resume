import { Inject, Injectable } from '@nestjs/common';
import { syncBackend, syncEvent } from '@repo/db/schema/sync-schema';
import { and, eq, gt, lte, max, notInArray, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';

type ServerEvent = {
  globalSeq: number;
  eventId: string;
  collectionId: string;
  type: 'insert' | 'update' | 'delete';
  key: string;
  payload: Record<string, unknown>;
  previous: Record<string, unknown> | null;
  txId: string;
  clientId: string;
  schemaVersion: number;
  timestamp: number;
  cursor: string;
};

const PULL_LIMIT = 200;
const PULL_MAX_BYTES = 3_500_000;
const PULL_ROW_OVERHEAD_BYTES = 512;
const LOCAL_ONLY_COLLECTIONS = ['resumeAiChat', 'resumeAiConversation', 'resumeAiMessage'];
const RESET_COLLECTION = '__sync_reset__';

@Injectable()
export class SyncPullService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async pull({ userId, since }: { userId: string; since: number }) {
    const filter = and(
      eq(syncEvent.userId, userId),
      gt(syncEvent.globalSeq, since),
      notInArray(syncEvent.collectionId, [...LOCAL_ONLY_COLLECTIONS, RESET_COLLECTION]),
    );
    const sizes = await this.db
      .select({
        globalSeq: syncEvent.globalSeq,
        bytes: sql<number>`length(cast(${syncEvent.payload} as blob)) + coalesce(length(cast(${syncEvent.previous} as blob)), 0)`,
      })
      .from(syncEvent)
      .where(filter)
      .orderBy(syncEvent.globalSeq)
      .limit(PULL_LIMIT);

    let bytes = 0;
    let take = 0;
    for (const size of sizes) {
      const rowBytes = Number(size.bytes) + PULL_ROW_OVERHEAD_BYTES;
      if (take > 0 && bytes + rowBytes > PULL_MAX_BYTES) break;
      bytes += rowBytes;
      take += 1;
    }
    const lastSeq = sizes[take - 1]?.globalSeq;
    const rows =
      lastSeq === undefined
        ? []
        : await this.db
            .select()
            .from(syncEvent)
            .where(and(filter, lte(syncEvent.globalSeq, lastSeq)))
            .orderBy(syncEvent.globalSeq);
    const events = rows.map((row) => ({
      globalSeq: row.globalSeq,
      eventId: row.eventId,
      collectionId: row.collectionId,
      type: row.type,
      key: row.key,
      payload: parseJsonObject(row.payload) ?? {},
      previous: parseJsonObject(row.previous),
      txId: row.txId,
      clientId: row.clientId,
      schemaVersion: row.schemaVersion,
      timestamp: row.clientTimestamp,
      cursor: String(row.globalSeq),
    }));
    const last = events.at(-1);
    return {
      events,
      cursor: last ? last.cursor : String(since),
      hasMore: take < sizes.length || sizes.length === PULL_LIMIT,
      backendId: await this.backendId({ userId }),
    };
  }

  private async backendId({ userId }: { userId: string }) {
    await this.db
      .insert(syncBackend)
      .values({ id: 1, backendId: crypto.randomUUID() })
      .onConflictDoNothing();
    const [backend] = await this.db
      .select({ backendId: syncBackend.backendId })
      .from(syncBackend)
      .where(eq(syncBackend.id, 1))
      .limit(1);
    const [reset] = await this.db
      .select({ seq: max(syncEvent.globalSeq) })
      .from(syncEvent)
      .where(and(eq(syncEvent.collectionId, RESET_COLLECTION), eq(syncEvent.key, userId)));
    return reset?.seq == null
      ? (backend?.backendId ?? crypto.randomUUID())
      : `${backend?.backendId ?? ''}:${reset.seq}`;
  }
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (raw == null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) record[key] = value;
  return record;
}

export type { ServerEvent };
