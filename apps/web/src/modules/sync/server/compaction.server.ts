import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncEvent, user } from "@/lib/drizzle/scheam";
import { logFields } from "@/lib/evlog/request-log";
import { and, eq, gt } from "drizzle-orm";
import { log as standaloneLog } from "evlog";
import {
  COMPACTION_CLIENT_ID,
  compactionEvents,
  compactionRequestEvent,
  type CompactionEvent,
  type CompactionOutcome,
  type CompactionProposal,
} from "../plan/compaction-protocol.ts";
import { projectUnappliedSyncEvents } from "./project-legacy.server.ts";
import { ensureSyncBackend } from "./sync-events.server.ts";

const INSERT_CHUNK = 50;
const ADMIN_CLIENT_ID = "admin";

function toSyncEventRow(
  userId: string,
  event: CompactionEvent,
  meta: { txId: string; clientId: string; now: number },
): typeof syncEvent.$inferInsert {
  return {
    eventId: event.eventId,
    userId,
    collectionId: event.collectionId,
    type: event.type,
    key: event.key,
    payload: JSON.stringify(event.payload),
    previous: event.previous == null ? null : JSON.stringify(event.previous),
    txId: meta.txId,
    clientId: meta.clientId,
    schemaVersion: 1,
    clientTimestamp: meta.now,
  };
}

/**
 * Appends a device's compaction if nothing reached the user's log after the
 * position it was planned at; otherwise reports it stale and writes nothing.
 * The check and the inserts share one write transaction, so two devices
 * proposing at once cannot both win.
 */
export async function acceptCompaction(
  userId: string,
  proposal: CompactionProposal,
): Promise<CompactionOutcome> {
  await ensureSyncBackend();
  const meta = {
    txId: `compact-${proposal.compactionId}`,
    clientId: COMPACTION_CLIENT_ID,
    now: Date.now(),
  };
  const rows = compactionEvents(proposal).map((event) => toSyncEventRow(userId, event, meta));

  const outcome = await db.transaction(
    async (tx): Promise<CompactionOutcome> => {
      const [newer] = await tx
        .select({ seq: syncEvent.globalSeq })
        .from(syncEvent)
        .where(and(eq(syncEvent.userId, userId), gt(syncEvent.globalSeq, proposal.baseSeq)))
        .limit(1);
      if (newer) return { status: "stale" };
      // Global seq follows insert order, which is the order devices replay in.
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        await tx.insert(syncEvent).values(rows.slice(i, i + INSERT_CHUNK));
      }
      return { status: "accepted", events: rows.length };
    },
    { behavior: "immediate" },
  );

  logFields("Library compaction proposal", {
    compactLibrary: {
      userId,
      compactionId: proposal.compactionId,
      baseSeq: proposal.baseSeq,
      prune: proposal.prune,
      status: outcome.status,
      ops: proposal.ops.length,
      merged: proposal.merged,
      pruned: proposal.pruned,
    },
  });
  if (outcome.status !== "accepted") return outcome;

  try {
    await projectUnappliedSyncEvents(50);
  } catch (err: unknown) {
    standaloneLog.error({
      message: "Post-compaction projection threw",
      service: "agentic-json-resume",
      error: err instanceof Error ? err.message : "Unknown projection error",
    });
  }
  return outcome;
}

/**
 * Asks each user's devices to compact: the next one to pull the request plans
 * and proposes it. Nothing is planned here.
 */
export async function requestLibraryCompaction(options: {
  userId?: string;
  prune: boolean;
}): Promise<{ users: number }> {
  await ensureSyncBackend();
  const userIds = options.userId
    ? [options.userId]
    : (await db.select({ id: user.id }).from(user)).map((row) => row.id);
  const now = Date.now();
  const rows = userIds.map((userId) => {
    const event = compactionRequestEvent(options.prune);
    return toSyncEventRow(userId, event, { txId: event.key, clientId: ADMIN_CLIENT_ID, now });
  });
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await db.insert(syncEvent).values(rows.slice(i, i + INSERT_CHUNK));
  }
  return { users: userIds.length };
}
