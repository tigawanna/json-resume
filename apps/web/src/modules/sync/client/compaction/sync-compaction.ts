import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { libraryKeys, type LibraryCollectionId } from "@/modules/library/library-keys";

/** Fails to compile when a library key is not a collection on the device database. */
function dbCollection(id: LibraryCollectionId): keyof AppDb["collections"] {
  return id;
}

/**
 * Client compaction entrypoint.
 * Called after this device finishes a successful sync.
 * Compacts one library collection, then the next.
 */
export async function compactOnClient(_db: AppDb): Promise<void> {
  for (const collectionId of Object.keys(libraryKeys) as LibraryCollectionId[]) {
    dbCollection(collectionId);
    // TODO: compact this collection, then continue to the next.
  }
  throw new Error("compactOnClient is not implemented");
}
