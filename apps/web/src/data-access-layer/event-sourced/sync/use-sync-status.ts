/* Live sync status for the nearest event-sourced DB. */
import { useSyncStatus } from "event-sourced-collection/react";
import type { SyncStatus } from "event-sourced-collection";
import { useEventSourcedDb } from "../provider";

/** Live sync status for the nearest event-sourced DB. */
export function useEventSourcedSyncStatus(): SyncStatus {
  const db = useEventSourcedDb();
  return useSyncStatus(db);
}
