import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncEvent } from "@/lib/drizzle/scheam";
import { logFields } from "@/lib/evlog/request-log";
import { eq, inArray } from "drizzle-orm";
import { catchUpProjection } from "../admin/rebuild-event-log.server";
import { DEFAULT_RETENTION_MS, planSquash, type SquashReason } from "./squash-plan";
import { SYNC_RESET_COLLECTION } from "./sync-reset";

/**
 * Push dedupes on `event_id`, so a retry of an event that was squashed away
 * would be stored again as the row's newest state. Retries land well inside
 * this window.
 */
export const MIN_SERVER_RETENTION_MS = 60 * 60 * 1000;
const DELETE_CHUNK = 500;

export type SquashSyncEventsResult = {
  users: number;
  scanned: number;
  removed: number;
  reasons: Record<SquashReason, number>;
  before: number;
};

async function squashUser(userId: string, before: number, dryRun: boolean) {
  const rows = await db
    .select({
      globalSeq: syncEvent.globalSeq,
      collectionId: syncEvent.collectionId,
      key: syncEvent.key,
      type: syncEvent.type,
      serverTimestamp: syncEvent.serverTimestamp,
      projectedAt: syncEvent.projectedAt,
    })
    .from(syncEvent)
    .where(eq(syncEvent.userId, userId));

  const plan = planSquash(
    rows.map((row) => ({
      ...row,
      order: row.globalSeq,
      at: row.serverTimestamp.getTime(),
      pinned: row.collectionId === SYNC_RESET_COLLECTION || row.projectedAt == null,
    })),
    { before },
  );
  const seqs = dryRun ? [] : plan.remove.map((event) => event.globalSeq);
  for (let i = 0; i < seqs.length; i += DELETE_CHUNK) {
    await db.delete(syncEvent).where(inArray(syncEvent.globalSeq, seqs.slice(i, i + DELETE_CHUNK)));
  }
  return { scanned: rows.length, plan };
}

/**
 * Drops server events superseded by a later event for the same row, keeping
 * every row's latest event (full row or tombstone) and anything newer than the
 * retention window. Runs for one user, or every user when `userId` is omitted.
 * `dryRun` counts without projecting or deleting; unprojected events are never
 * counted, so a preview can come in slightly under the real run.
 */
export async function squashSyncEvents(
  options: { userId?: string; retentionMs?: number; dryRun?: boolean } = {},
): Promise<SquashSyncEventsResult> {
  const startedAt = Date.now();
  const dryRun = options.dryRun ?? false;
  const retentionMs = Math.max(
    options.retentionMs ?? DEFAULT_RETENTION_MS,
    MIN_SERVER_RETENTION_MS,
  );
  const before = Date.now() - retentionMs;
  if (!dryRun) await catchUpProjection();

  const userIds = options.userId
    ? [options.userId]
    : (await db.selectDistinct({ userId: syncEvent.userId }).from(syncEvent)).map(
        (row) => row.userId,
      );

  const result: SquashSyncEventsResult = {
    users: userIds.length,
    scanned: 0,
    removed: 0,
    reasons: { superseded: 0, deleted: 0 },
    before,
  };
  for (const userId of userIds) {
    const { scanned, plan } = await squashUser(userId, before, dryRun);
    result.scanned += scanned;
    result.removed += plan.remove.length;
    result.reasons.superseded += plan.reasons.superseded;
    result.reasons.deleted += plan.reasons.deleted;
  }

  if (!dryRun) {
    logFields("Squashed sync events", {
      squashSyncEvents: { ...result, retentionMs, durationMs: Date.now() - startedAt },
    });
  }
  return result;
}
