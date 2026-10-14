import type { AppDb } from "@/data-access-layer/event-sourced/collection";

/**
 * Client compaction entrypoint.
 *
 * Called after this device finishes a successful sync. Plan the library
 * compaction here and send it to `compactOnServer`.
 */
export async function compactOnClient(_db: AppDb): Promise<void> {
  // TODO: plan this device's library compaction and send the proposal to compactOnServer.
  throw new Error("compactOnClient is not implemented");
}
