import { DEFAULT_RETENTION_MS } from "@/modules/sync/squash-plan";
import { BackendMismatchError } from "event-sourced-collection";
import type { AppDb } from "./collection";
import { mergeEventHistory, squashLocalEvents } from "./event-history";
import { wipeLocalDatabase } from "./local-reset";
import type { AppSettings } from "./schemas";
import { beginSyncProgress, finishSyncProgress } from "./sync-progress";

export const APP_SETTINGS_ID = "app";

const defaultSettings = (): AppSettings => ({
  id: APP_SETTINGS_ID,
  theme: "dark",
  language: "en",
  syncEnabled: false,
});

export function readAppSettings(db: AppDb): AppSettings {
  const existing = db.collections.settings.get(APP_SETTINGS_ID);
  if (existing) return existing;
  db.collections.settings.insert(defaultSettings());
  return db.collections.settings.get(APP_SETTINGS_ID) ?? defaultSettings();
}

export function updateAppSettings(db: AppDb, patch: Partial<Omit<AppSettings, "id">>): AppSettings {
  const current = readAppSettings(db);
  db.collections.settings.update(APP_SETTINGS_ID, (draft) => {
    Object.assign(draft, patch);
  });
  return db.collections.settings.get(APP_SETTINGS_ID) ?? { ...current, ...patch };
}

export function applyManagedSyncGate(db: AppDb, isAuthenticated: boolean): AppSettings {
  const settings = readAppSettings(db);
  db.setSyncEnabled(Boolean(isAuthenticated && settings.syncEnabled));
  return settings;
}

/** Coalesce concurrent kickers (nested providers) into one in-flight sync. */
let managedSyncInFlight: Promise<void> | null = null;

/** Synced events older than this leave the device entirely; the server keeps its own copy. */
const LOCAL_EVENT_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One library sync: it pushes the outbox batch by batch until drained, then
 * pulls every page. Afterwards synced events replaced by a later event for the
 * same row are squashed once they leave the retention window, and anything past
 * the horizon is pruned. Restore can reach back as far as what is left.
 */
export async function runManagedSync(db: AppDb, mode: "background" | "manual") {
  beginSyncProgress(db.getSyncStatus().pendingCount);
  try {
    const result = mode === "manual" ? await db.manualSync() : await db.sync();
    const rebuiltOnServer = result.errors.some((err) => err instanceof BackendMismatchError);
    if (rebuiltOnServer && db.getSyncStatus().pendingCount === 0) {
      await wipeLocalDatabase({ resumeSync: true });
    }
    if (!result.deferred && result.errors.length === 0) {
      const history = mergeEventHistory(
        db.collections.outbox.toArray,
        db.collections.inbox.toArray,
      );
      await squashLocalEvents(db, history, Date.now() - DEFAULT_RETENTION_MS);
      await db.pruneSyncedEvents({ olderThanMs: LOCAL_EVENT_HORIZON_MS });
    }
    return {
      pushed: result.pushed,
      pulled: result.pulled,
      deferred: result.deferred,
      errors: result.errors,
    };
  } finally {
    finishSyncProgress();
  }
}

/**
 * Drops this device's synced data and pulls it back from the server.
 * Pushes first so no local edit is lost; refuses if anything is still unsent.
 * The library removes rows without authoring delete events.
 */
export async function resetLocalCopy(db: AppDb) {
  if (!db.getSyncEnabled()) throw new Error("Turn on managed sync and stay signed in first");

  const pushed = await runManagedSync(db, "manual");
  if (pushed.deferred) throw new Error("Another tab is syncing. Close it and try again.");
  const pending = db.getSyncStatus().pendingCount;
  if (pending > 0) {
    throw new Error(`${pending} local change(s) could not be uploaded. Sync them first.`);
  }

  const reset = await db.resetLocalReplica();
  if (reset.deferred) throw new Error("Another tab is syncing. Close it and try again.");

  const pulled = await runManagedSync(db, "manual");
  return { removed: reset.removedRows, pulled: pulled.pulled, errors: pulled.errors };
}

/**
 * Fire-and-forget push/pull when managed sync is enabled.
 * Safe to call from multiple {@link EventSourcedDbProvider} mounts.
 */
export function kickManagedSync(db: AppDb): void {
  if (!db.getSyncEnabled()) return;
  if (managedSyncInFlight) return;

  managedSyncInFlight = runManagedSync(db, "background")
    .then((result) => {
      if (result.errors.length > 0) {
        console.error("[sync] managed sync errors", result.errors);
      }
    })
    .catch((err: unknown) => {
      console.error("[sync] managed sync failed", err);
    })
    .finally(() => {
      managedSyncInFlight = null;
    });
}

export function setManagedSyncEnabled(
  db: AppDb,
  enabled: boolean,
  isAuthenticated: boolean,
): AppSettings {
  const current = readAppSettings(db);
  if (db.collections.settings.has(APP_SETTINGS_ID)) {
    db.collections.settings.update(APP_SETTINGS_ID, (draft) => {
      draft.syncEnabled = enabled;
    });
  } else {
    db.collections.settings.insert({ ...current, syncEnabled: enabled });
  }
  const next = readAppSettings(db);
  db.setSyncEnabled(Boolean(isAuthenticated && next.syncEnabled));
  if (isAuthenticated && next.syncEnabled) {
    kickManagedSync(db);
  }
  return next;
}
