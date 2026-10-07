import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncEvent } from "@/lib/drizzle/scheam";
import { log as standaloneLog } from "evlog";
import { catchUpProjection, ownerFilter, toPayload } from "../admin/rebuild-event-log.server";
import { planCompaction } from "./compact-plan";
import { isProjectableCollectionId, tablesByCollection } from "./project-legacy.server";
import { LOCAL_ONLY_COLLECTIONS } from "./sync-events.server";

const COMPACT_CLIENT_ID = "server-compact";
const INSERT_CHUNK = 50;

export type CompactResult = {
  events: number;
  merged: Record<string, number>;
};

type Row = Record<string, unknown>;

/** One compaction per user at a time in this process; a second request waits for the first. */
const running = new Map<string, Promise<CompactResult>>();

async function loadUserRows(userId: string): Promise<Record<string, Row[]>> {
  const rows: Record<string, Row[]> = {};
  for (const collectionId of Object.keys(tablesByCollection)) {
    if (!isProjectableCollectionId(collectionId)) continue;
    if (LOCAL_ONLY_COLLECTIONS.includes(collectionId)) continue;
    if (collectionId === "savedProject" || collectionId === "job") continue;
    const table = tablesByCollection[collectionId];
    rows[collectionId] = await db.select().from(table).where(ownerFilter(collectionId, userId));
  }
  return rows;
}

async function compact(userId: string): Promise<CompactResult> {
  await catchUpProjection();
  const now = new Date();
  const plan = planCompaction(await loadUserRows(userId), { userId, now });
  if (plan.ops.length === 0) return { events: 0, merged: plan.merged };

  const txId = `compact-${crypto.randomUUID()}`;
  const values: (typeof syncEvent.$inferInsert)[] = plan.ops.map((op) => ({
    eventId: crypto.randomUUID(),
    userId,
    collectionId: op.collectionId,
    type: op.type,
    key: op.id,
    payload: JSON.stringify(toPayload(op.row)),
    previous: null,
    txId,
    clientId: COMPACT_CLIENT_ID,
    schemaVersion: 1,
    clientTimestamp: now.getTime(),
  }));
  // Global seq follows insert order, and projection applies in seq order.
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    await db.insert(syncEvent).values(values.slice(i, i + INSERT_CHUNK));
  }
  await catchUpProjection();

  standaloneLog.info({
    message: "Library compaction appended events",
    service: "agentic-json-resume",
    userId,
    events: values.length,
    merged: plan.merged,
  });
  return { events: values.length, merged: plan.merged };
}

/**
 * Merges a user's duplicate library rows into one per natural key and points
 * every reference at the survivor. Changes go out as ordinary sync events, so
 * devices converge on their next pull without a log reset.
 */
export function compactUserLibrary(userId: string): Promise<CompactResult> {
  const pending = running.get(userId);
  if (pending) return pending;
  const next = compact(userId).finally(() => running.delete(userId));
  running.set(userId, next);
  return next;
}
