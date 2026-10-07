import "@tanstack/react-start/server-only";

import { requestLog } from "@/lib/evlog/request-log";
import { unwrapUnknownError } from "@/utils/errors";
import { log as standaloneLog } from "evlog";

export type AdminActor = { id: string; email: string };

/**
 * Runs a managerial admin action and records it on the request's wide event
 * as `adminAction`: who ran it, the input, how long it took, and the result
 * or error. Errors are rethrown unchanged.
 */
export async function auditAdminAction<T>(
  action: string,
  actor: AdminActor,
  input: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  const log = requestLog();
  const started = { action, actor: { id: actor.id, email: actor.email }, input };
  log?.set({ adminAction: started });

  try {
    const result = await run();
    const adminAction = {
      ...started,
      outcome: "success",
      durationMs: Date.now() - startedAt,
      result,
    };
    if (log) log.info(`Admin ${action} succeeded`, { adminAction });
    else standaloneLog.info({ message: `Admin ${action} succeeded`, adminAction });
    return result;
  } catch (err: unknown) {
    const error = unwrapUnknownError(err);
    const adminAction = {
      ...started,
      outcome: "error",
      durationMs: Date.now() - startedAt,
      error: error.message,
    };
    if (log) log.error(error, { adminAction });
    else standaloneLog.error({ message: `Admin ${action} failed`, adminAction });
    throw err;
  }
}
