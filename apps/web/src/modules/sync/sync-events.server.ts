import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncBackend, syncEvent } from "@/lib/drizzle/scheam/sync-event";
import { and, eq, gt, lte, notInArray, sql } from "drizzle-orm";
import type {
  OutboundEvent,
  PullResponse,
  PushConfirmation,
  PushFailure,
  PushResponse,
  ServerEvent,
} from "event-sourced-collection";
import { log as standaloneLog } from "evlog";
import { z } from "zod";
import { projectUnappliedSyncEvents } from "./project-legacy.server";

export const outboundEventSchema = z.object({
  eventId: z.string().min(1),
  collectionId: z.string().min(1),
  type: z.enum(["insert", "update", "delete"]),
  key: z.union([z.string(), z.number()]),
  payload: z.record(z.string(), z.unknown()),
  previous: z.record(z.string(), z.unknown()).nullable().optional(),
  txId: z.string().min(1),
  clientId: z.string().min(1),
  schemaVersion: z.number().int(),
  timestamp: z.number(),
  baseVersion: z.string().nullable().optional(),
});

export const outboundEventBatchSchema = z.array(outboundEventSchema);

/** Kept in the browser only (`localOnly` in the client registry); never stored or served. */
const LOCAL_ONLY_COLLECTIONS: string[] = [
  "resumeAiChat",
  "resumeAiConversation",
  "resumeAiMessage",
];

const PULL_LIMIT = 200;
/** JSON length budget per pull response, under Vercel's 4.5 MB body limit. */
const PULL_MAX_BYTES = 3_500_000;
/** Ids, cursor, timestamps and keys around each payload. */
const PULL_ROW_OVERHEAD_BYTES = 400;

export async function ensureSyncBackend() {
  const existing = await db.select().from(syncBackend).where(eq(syncBackend.id, 1)).limit(1);
  if (existing[0]) return existing[0];
  const backendId = crypto.randomUUID();
  await db.insert(syncBackend).values({ id: 1, backendId, lastProjectedSeq: 0 });
  const created = await db.select().from(syncBackend).where(eq(syncBackend.id, 1)).limit(1);
  if (!created[0]) throw new Error("Failed to initialize sync_backend");
  return created[0];
}

function groupByTxId(events: ReadonlyArray<OutboundEvent>): OutboundEvent[][] {
  const groups: OutboundEvent[][] = [];
  let current: OutboundEvent[] = [];
  let currentTx: string | null = null;

  for (const event of events) {
    if (currentTx !== null && event.txId !== currentTx) {
      groups.push(current);
      current = [];
    }
    currentTx = event.txId;
    current.push(event);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

export async function pushSyncEvents(
  userId: string,
  events: ReadonlyArray<OutboundEvent>,
): Promise<PushResponse> {
  if (events.length === 0) return { confirmed: [], failed: [] };
  await ensureSyncBackend();

  // Clients built before these collections went local-only still push them;
  // acknowledge without storing so their outboxes drain.
  const confirmed: PushConfirmation[] = events
    .filter((event) => LOCAL_ONLY_COLLECTIONS.includes(event.collectionId))
    .map((event) => ({ eventId: event.eventId, globalSeq: 0 }));
  const failed: PushFailure[] = [];
  const stored = events.filter((event) => !LOCAL_ONLY_COLLECTIONS.includes(event.collectionId));

  for (const group of groupByTxId(stored)) {
    try {
      const groupConfirmed = await db.transaction(
        async (tx) => {
          const rows: PushConfirmation[] = [];
          for (const event of group) {
            const existing = await tx
              .select({ globalSeq: syncEvent.globalSeq })
              .from(syncEvent)
              .where(eq(syncEvent.eventId, event.eventId))
              .limit(1);
            if (existing[0]) {
              rows.push({ eventId: event.eventId, globalSeq: existing[0].globalSeq });
              continue;
            }
            const inserted = await tx
              .insert(syncEvent)
              .values({
                eventId: event.eventId,
                userId,
                collectionId: event.collectionId,
                type: event.type,
                key: String(event.key),
                payload: JSON.stringify(event.payload),
                previous: event.previous == null ? null : JSON.stringify(event.previous),
                txId: event.txId,
                clientId: event.clientId,
                schemaVersion: event.schemaVersion,
                clientTimestamp: event.timestamp,
              })
              .returning({ globalSeq: syncEvent.globalSeq });
            const seq = inserted[0]?.globalSeq;
            if (seq == null) throw new Error(`Insert returned no seq for ${event.eventId}`);
            rows.push({ eventId: event.eventId, globalSeq: seq });
          }
          return rows;
        },
        { behavior: "immediate" },
      );
      confirmed.push(...groupConfirmed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Push transaction failed";
      for (const event of group) {
        failed.push({
          eventId: event.eventId,
          message,
          code: "TX_FAILED",
          retryable: true,
        });
      }
    }
  }

  try {
    await projectUnappliedSyncEvents(50);
  } catch (err: unknown) {
    standaloneLog.error({
      message: "Post-push projection threw",
      service: "agentic-json-resume",
      error: err instanceof Error ? err.message : "Unknown projection error",
    });
  }

  return { confirmed, failed };
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (raw == null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

export async function pullSyncEvents(userId: string, since: number): Promise<PullResponse> {
  const backend = await ensureSyncBackend();
  const safeSince = Number.isFinite(since) && since >= 0 ? Math.floor(since) : 0;

  const pageFilter = and(
    eq(syncEvent.userId, userId),
    gt(syncEvent.globalSeq, safeSince),
    notInArray(syncEvent.collectionId, LOCAL_ONLY_COLLECTIONS),
  );

  // Size the page before loading payloads: rows can be hundreds of KB, and
  // reading PULL_LIMIT of them from the remote DB only to drop most took
  // minutes per page. Vercel caps responses at 4.5 MB, so stop at
  // PULL_MAX_BYTES; the first row always goes out so a huge one can't stall.
  const sizes = await db
    .select({
      globalSeq: syncEvent.globalSeq,
      bytes: sql<number>`length(cast(${syncEvent.payload} as blob)) + coalesce(length(cast(${syncEvent.previous} as blob)), 0)`,
    })
    .from(syncEvent)
    .where(pageFilter)
    .orderBy(syncEvent.globalSeq)
    .limit(PULL_LIMIT);

  let bytes = 0;
  let take = 0;
  for (const size of sizes) {
    const rowBytes = size.bytes + PULL_ROW_OVERHEAD_BYTES;
    if (take > 0 && bytes + rowBytes > PULL_MAX_BYTES) break;
    bytes += rowBytes;
    take++;
  }
  const truncated = take < sizes.length;
  const lastSeq = sizes[take - 1]?.globalSeq;

  const rows =
    lastSeq === undefined
      ? []
      : await db
          .select()
          .from(syncEvent)
          .where(and(pageFilter, lte(syncEvent.globalSeq, lastSeq)))
          .orderBy(syncEvent.globalSeq);

  const events: ServerEvent[] = rows.map((row) => ({
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

  const last = events[events.length - 1];
  return {
    events,
    cursor: last ? last.cursor : String(safeSince),
    hasMore: truncated || sizes.length === PULL_LIMIT,
    backendId: backend.backendId,
  };
}
