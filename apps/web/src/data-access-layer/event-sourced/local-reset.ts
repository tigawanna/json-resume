import { close } from "./collection";

const RESYNC_AFTER_RESET_KEY = "agentic-json-resume:resync-after-reset";

/**
 * Deletes the local OPFS database and reloads, so the next load pulls from the
 * server from zero. Settings live in that database too, so `resumeSync` leaves
 * a flag that turns managed sync back on once the fresh database opens.
 *
 * Fails with a clear message while another tab still holds the database open.
 */
export async function wipeLocalDatabase({ resumeSync }: { resumeSync: boolean }): Promise<void> {
  if (resumeSync) localStorage.setItem(RESYNC_AFTER_RESET_KEY, "1");
  await close();
  const root = await navigator.storage.getDirectory();
  try {
    for await (const name of root.keys()) {
      await root.removeEntry(name, { recursive: true });
    }
  } catch (err: unknown) {
    localStorage.removeItem(RESYNC_AFTER_RESET_KEY);
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Close other tabs of this app, then reload and try again (${reason})`);
  }
  location.reload();
}

/** True once after {@link wipeLocalDatabase} asked for sync to resume. */
export function consumeResyncAfterReset(): boolean {
  if (localStorage.getItem(RESYNC_AFTER_RESET_KEY) !== "1") return false;
  localStorage.removeItem(RESYNC_AFTER_RESET_KEY);
  return true;
}
