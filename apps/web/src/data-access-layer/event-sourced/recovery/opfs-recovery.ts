/**
 * Recovery for wa-sqlite's OPFS startup cleanup failing with
 * `NoModificationAllowedError` on `removeEntry`: a leftover `.ahp-*` temp
 * directory still has open sync access handles from a worker that no longer
 * holds its Web Lock (e.g. one still shutting down after HMR or a reload).
 *
 * The temp directory cannot be deleted while those handles are open, and
 * wiping the DB would drop unsynced events, so recovery is retry → reload.
 */

const RELOAD_MARKER_KEY = "event-sourced-db:opfs-recovery-reload-at";
const RELOAD_COOLDOWN_MS = 60_000;

/** The DOMException name is lost crossing the worker boundary; match the message. */
export function isOpfsTempDirBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("removeEntry") && error.message.includes("modifications are not allowed")
  );
}

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
};

export async function withOpfsBusyRetry<T>(
  open: () => Promise<T>,
  { attempts = 5, baseDelayMs = 200 }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await open();
    } catch (error: unknown) {
      if (!isOpfsTempDirBusyError(error) || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
}

/** False if this tab already auto-reloaded recently, so a persistent lock cannot loop. */
export function canAutoReloadForOpfsRecovery(): boolean {
  const last = Number(sessionStorage.getItem(RELOAD_MARKER_KEY) ?? 0);
  return Date.now() - last > RELOAD_COOLDOWN_MS;
}

export function reloadForOpfsRecovery() {
  sessionStorage.setItem(RELOAD_MARKER_KEY, String(Date.now()));
  window.location.reload();
}

export function toOpfsBusyUserError(error: Error): Error {
  return new Error(
    "The local database is locked by another tab or a stale worker. Close other tabs of this app and reload.",
    { cause: error },
  );
}
