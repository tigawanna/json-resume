import { Inject, Injectable } from '@nestjs/common';
import { syncBackend, syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import type { OutboundEvent } from './sync.dto.js';
import { EventLogProjectionService } from './event-log-projection.service.js';

type Confirmed = { eventId: string; globalSeq: number };
type Failure = { eventId: string; message: string; code?: string; retryable?: boolean };

const LOCAL_ONLY_COLLECTIONS = new Set([
  'resumeAiChat',
  'resumeAiConversation',
  'resumeAiMessage',
]);
const RESERVED_COLLECTIONS = new Set(['__sync_reset__']);

@Injectable()
export class SyncPushService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projection: EventLogProjectionService,
  ) {}

  async push({ userId, events }: { userId: string; events: OutboundEvent[] }) {
    const confirmed: Confirmed[] = [];
    const failed: Failure[] = [];
    const groups = new Map<string, OutboundEvent[]>();
    for (const event of events) {
      const group = groups.get(event.txId) ?? [];
      group.push(event);
      groups.set(event.txId, group);
    }
    for (const group of groups.values()) {
      await this.pushGroup({ userId, events: group, confirmed, failed });
    }
    await this.projection.catchUp();
    return failed.length > 0 ? { confirmed, failed } : { confirmed };
  }

  private async pushGroup({
    userId,
    events,
    confirmed,
    failed,
  }: {
    userId: string;
    events: OutboundEvent[];
    confirmed: Confirmed[];
    failed: Failure[];
  }) {
    const groupConfirmed: Confirmed[] = [];
    try {
      await this.db.transaction(async (tx) => {
        for (const event of events) {
          if (LOCAL_ONLY_COLLECTIONS.has(event.collectionId)) {
            groupConfirmed.push({ eventId: event.eventId, globalSeq: 0 });
            continue;
          }
          if (RESERVED_COLLECTIONS.has(event.collectionId)) {
            failed.push({
              eventId: event.eventId,
              message: 'This collection is reserved',
              code: 'RESERVED_COLLECTION',
              retryable: false,
            });
            continue;
          }
          const [inserted] = await tx
            .insert(syncEvent)
            .values({
              eventId: event.eventId,
              userId,
              collectionId: event.collectionId,
              type: event.type,
              key: String(event.key),
              payload: JSON.stringify(event.payload),
              previous: event.previous === undefined ? null : JSON.stringify(event.previous),
              txId: event.txId,
              clientId: event.clientId,
              schemaVersion: event.schemaVersion,
              clientTimestamp: event.timestamp,
            })
            .onConflictDoNothing({ target: syncEvent.eventId })
            .returning();
          if (inserted) {
            groupConfirmed.push({ eventId: event.eventId, globalSeq: inserted.globalSeq });
            continue;
          }
          const [existing] = await tx
            .select({ globalSeq: syncEvent.globalSeq })
            .from(syncEvent)
            .where(eq(syncEvent.eventId, event.eventId))
            .limit(1);
          groupConfirmed.push({
            eventId: event.eventId,
            globalSeq: existing?.globalSeq ?? 0,
          });
        }
      });
      confirmed.push(...groupConfirmed);
    } catch {
      for (const event of events)
        failed.push({
          eventId: event.eventId,
          message: 'The event transaction failed',
          code: 'TX_FAILED',
          retryable: true,
        });
    }
  }

  async backendId() {
    await this.db
      .insert(syncBackend)
      .values({ id: 1, backendId: crypto.randomUUID() })
      .onConflictDoNothing();
    const [backend] = await this.db
      .select({ backendId: syncBackend.backendId })
      .from(syncBackend)
      .where(eq(syncBackend.id, 1))
      .limit(1);
    return backend?.backendId ?? crypto.randomUUID();
  }
}
