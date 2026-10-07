import { log as standaloneLog, type RequestLogger } from "evlog";
import { useRequest } from "nitro/context";

/** The evlog logger of the current Nitro request, or `null` outside one (tests, background work). */
export function requestLog(): RequestLogger | null {
  try {
    const candidate = useRequest().context?.log;
    if (
      candidate &&
      typeof candidate === "object" &&
      "warn" in candidate &&
      "set" in candidate &&
      typeof candidate.warn === "function" &&
      typeof candidate.set === "function"
    ) {
      // Runtime-checked subset of RequestLogger; Nitro context types it as unknown.
      return candidate as RequestLogger;
    }
  } catch {
    // No Nitro async request context.
  }
  return null;
}

/**
 * Adds fields to the current request's wide event so they reach the drains.
 * Outside a request they are logged as their own event. Arrays concatenate
 * across calls, so repeated steps can append one entry each.
 */
export function logFields(message: string, fields: Record<string, unknown>) {
  const log = requestLog();
  if (log) {
    log.set(fields);
    return;
  }
  standaloneLog.info({ message, ...fields });
}
