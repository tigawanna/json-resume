/* Live sync status for the nearest event-sourced DB. */
import { useSyncStatus } from "event-sourced-collection/react";
import type { SyncStatus } from "event-sourced-collection";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";

/** Live sync status for the nearest event-sourced DB. */
export function useEventSourcedSyncStatus(): SyncStatus {
  const db = useEventSourcedDb();
  return useSyncStatus(db);
}
