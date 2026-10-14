import { z } from "zod";
import { COMPACTION_INPUT_COLLECTIONS } from "./compact-plan.ts";

/**
 * Library compaction is planned on a device and only appended by the server.
 *
 * A device that is caught up (nothing to push, every page pulled) plans the
 * merge against its own rows and proposes it with `baseSeq`, the last log
 * position it has seen. The server appends the ops only if nothing reached the
 * log after `baseSeq`, so the first proposal wins and the rest come back
 * stale. Accepted ops carry {@link COMPACTION_CLIENT_ID}, which no device
 * mistakes for its own echo, so the proposer replays them like everyone else.
 */

/** Appended after an accepted proposal's ops. Devices skip it as an unknown collection. */
export const COMPACTION_COLLECTION = "__compaction__";

/** Appended by an admin to ask the next device that pulls it to compact, optionally pruning. */
export const COMPACTION_REQUEST_COLLECTION = "__compaction_request__";

export const COMPACTION_CLIENT_ID = "compaction";

/** Keeps a proposal under the 4.5 MB request body limit with room for JSON overhead. */
export const MAX_PROPOSAL_BYTES = 3_500_000;
export const MAX_PROPOSAL_OPS = 5_000;

const rowSchema = z.record(z.string(), z.unknown());

const compactionOpSchema = z
  .object({
    collectionId: z.string().refine((id) => COMPACTION_INPUT_COLLECTIONS.includes(id), {
      message: "Not a compactable collection",
    }),
    type: z.enum(["update", "delete"]),
    id: z.string().min(1),
    row: rowSchema,
  })
  .refine((op) => op.row.id === op.id, { message: "row.id must match id" });

const countsSchema = z.record(z.string(), z.number().int().min(0));

export const compactionProposalSchema = z.object({
  compactionId: z.string().min(1),
  baseSeq: z.number().int().min(0),
  prune: z.boolean(),
  merged: countsSchema,
  pruned: countsSchema,
  ops: z.array(compactionOpSchema).min(1).max(MAX_PROPOSAL_OPS),
});

export type CompactionProposal = z.infer<typeof compactionProposalSchema>;

export type CompactionOutcome = { status: "accepted"; events: number } | { status: "stale" };

export const compactionMarkerSchema = z.object({
  compactionId: z.string(),
  baseSeq: z.number(),
  prune: z.boolean(),
  events: z.number(),
});

export const compactionRequestSchema = z.object({
  requestId: z.string(),
  prune: z.boolean(),
});

type Row = Record<string, unknown>;

export type CompactionEvent = {
  eventId: string;
  collectionId: string;
  type: "insert" | "update" | "delete";
  key: string;
  payload: Row;
  previous: Row | null;
};

/** What an accepted proposal appends: its ops in planned order, then the marker. */
export function compactionEvents(
  proposal: CompactionProposal,
  newId: () => string = () => crypto.randomUUID(),
): CompactionEvent[] {
  const events: CompactionEvent[] = proposal.ops.map((op) => ({
    eventId: newId(),
    collectionId: op.collectionId,
    type: op.type,
    key: op.id,
    payload: op.row,
    previous: op.type === "delete" ? op.row : null,
  }));
  const marker = {
    compactionId: proposal.compactionId,
    baseSeq: proposal.baseSeq,
    prune: proposal.prune,
    events: proposal.ops.length,
  } satisfies z.infer<typeof compactionMarkerSchema>;
  events.push({
    eventId: newId(),
    collectionId: COMPACTION_COLLECTION,
    type: "insert",
    key: proposal.compactionId,
    payload: {
      id: proposal.compactionId,
      ...marker,
      merged: proposal.merged,
      pruned: proposal.pruned,
    },
    previous: null,
  });
  return events;
}

/** The marker event an admin appends to request a compaction. */
export function compactionRequestEvent(
  prune: boolean,
  newId: () => string = () => crypto.randomUUID(),
): CompactionEvent {
  const requestId = newId();
  return {
    eventId: newId(),
    collectionId: COMPACTION_REQUEST_COLLECTION,
    type: "insert",
    key: requestId,
    payload: { id: requestId, requestId, prune } satisfies Row &
      z.infer<typeof compactionRequestSchema>,
    previous: null,
  };
}
