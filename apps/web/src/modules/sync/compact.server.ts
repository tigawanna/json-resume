import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncEvent, user } from "@/lib/drizzle/scheam";
import { logFields } from "@/lib/evlog/request-log";
import { catchUpProjection, ownerFilter, toPayload } from "../admin/rebuild-event-log.server";
import { planCompaction } from "./compact-plan";
import { isProjectableCollectionId, tablesByCollection } from "./project-legacy.server";
import { LOCAL_ONLY_COLLECTIONS } from "./sync-events.server";

const COMPACT_CLIENT_ID = "server-compact";
const INSERT_CHUNK = 50;

export type CompactResult = {
  events: number;
  merged: Record<string, number>;
  pruned: Record<string, number>;
};

export type CompactOptions = { prune?: boolean };

type Row = Record<string, unknown>;

/**
 * One compaction per user at a time in this process. A second plain request
 * shares the running one; a prune waits for it and then runs its own.
 */
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

async function compact(userId: string, options: CompactOptions): Promise<CompactResult> {
  await catchUpProjection();
  const now = new Date();
  const plan = planCompaction(await loadUserRows(userId), { now, prune: options.prune });
  if (plan.ops.length === 0) return { events: 0, merged: plan.merged, pruned: plan.pruned };

  const txId = `compact-${crypto.randomUUID()}`;
  const values: (typeof syncEvent.$inferInsert)[] = plan.ops.map((op) => {
    const payload = JSON.stringify(toPayload(op.row));
    return {
      eventId: crypto.randomUUID(),
      userId,
      collectionId: op.collectionId,
      type: op.type,
      key: op.id,
      payload,
      previous: op.type === "delete" ? payload : null,
      txId,
      clientId: COMPACT_CLIENT_ID,
      schemaVersion: 1,
      clientTimestamp: now.getTime(),
    };
  });
  // Global seq follows insert order, and projection applies in seq order.
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    await db.insert(syncEvent).values(values.slice(i, i + INSERT_CHUNK));
  }
  await catchUpProjection();

  logFields("Library compaction appended events", {
    compactLibrary: {
      users: [
        {
          userId,
          txId,
          prune: options.prune ?? false,
          events: values.length,
          merged: plan.merged,
          pruned: plan.pruned,
        },
      ],
    },
  });
  return { events: values.length, merged: plan.merged, pruned: plan.pruned };
}

/**
 * Merges a user's duplicate library rows into one per natural key and points
 * every reference at the survivor; with `prune`, also deletes library rows no
 * résumé reaches. Changes go out as ordinary sync events, so devices converge
 * on their next pull without a log reset.
 */
export function compactUserLibrary(
  userId: string,
  options: CompactOptions = {},
): Promise<CompactResult> {
  const pending = running.get(userId);
  if (pending && !options.prune) return pending;
  const next: Promise<CompactResult> = (pending ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => compact(userId, options))
    .finally(() => {
      if (running.get(userId) === next) running.delete(userId);
    });
  running.set(userId, next);
  return next;
}

function addCounts(into: Record<string, number>, from: Record<string, number>) {
  for (const [collectionId, n] of Object.entries(from)) {
    into[collectionId] = (into[collectionId] ?? 0) + n;
  }
}

/** Runs {@link compactUserLibrary} for every user, one at a time. */
export async function compactAllLibraries(
  options: CompactOptions = {},
): Promise<CompactResult & { users: number }> {
  const userIds = (await db.select({ id: user.id }).from(user)).map((row) => row.id);
  const total: CompactResult & { users: number } = {
    users: userIds.length,
    events: 0,
    merged: {},
    pruned: {},
  };
  for (const userId of userIds) {
    const result = await compactUserLibrary(userId, options);
    total.events += result.events;
    addCounts(total.merged, result.merged);
    addCounts(total.pruned, result.pruned);
  }
  return total;
}
