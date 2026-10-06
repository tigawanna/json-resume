import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  return onlineManager.subscribe(onStoreChange);
}

/**
 * Browser online state from TanStack Query's `onlineManager`
 * (`online` / `offline` window events).
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => onlineManager.isOnline(),
    () => true,
  );
}
