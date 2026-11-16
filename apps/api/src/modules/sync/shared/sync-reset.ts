/**
 * `collection_id` of the marker event written when an admin rebuilds a user's
 * event log. Never pulled by clients and never projected. Pull appends the
 * marker's `global_seq` to that user's `backendId`, so their devices see a new
 * backend and start over instead of keeping rows the rebuilt log no longer has.
 */
export const SYNC_RESET_COLLECTION = "__sync_reset__";

export function userBackendId(backendId: string, resetSeq: number | null): string {
  return resetSeq == null ? backendId : `${backendId}:${resetSeq}`;
}
