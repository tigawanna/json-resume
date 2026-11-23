import { syncEvent } from "@repo/db/schema/sync-schema";

export type FixtureEvent = {
  collectionId: string;
  type: "insert" | "update" | "delete";
  key: string;
  payload: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
  clientTimestamp: number;
};

/**
 * Replay a recorded event as a pending sync event for a test user. Only the
 * transport envelope is synthesized; payload/previous are the recorded shapes.
 */
export function toSyncEvent(input: FixtureEvent, userId: string): typeof syncEvent.$inferInsert {
  return {
    eventId: crypto.randomUUID(),
    userId,
    collectionId: input.collectionId,
    type: input.type,
    key: input.key,
    payload: JSON.stringify(input.payload),
    previous: input.previous ? JSON.stringify(input.previous) : null,
    txId: crypto.randomUUID(),
    clientId: "fixture-replay",
    clientTimestamp: input.clientTimestamp,
    serverTimestamp: new Date(input.clientTimestamp),
    projectedAt: null,
  };
}
