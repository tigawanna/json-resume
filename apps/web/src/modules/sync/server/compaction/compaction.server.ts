import "@tanstack/react-start/server-only";

import type { CompactionProposal } from "../../shared/compaction-protocol";

/**
 * Server compaction entrypoint.
 *
 * A device sends a proposal. Append it to that user's event log, or reject it
 * when the log has moved on since the device planned it.
 */
export async function compactOnServer(_input: {
  userId?: string;
  proposal?: CompactionProposal;
}): Promise<{ users: number }> {
  // TODO: append the proposal to the user's log, or reject it when the log moved past baseSeq.
  throw new Error("compactOnServer is not implemented");
}
