import type { AppDb } from "./collection";
import type { AppSettings } from "./schemas";

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

/** Coalesce concurrent kickers (nested providers) into one in-flight drain. */
let managedSyncInFlight: Promise<void> | null = null;

const MAX_SYNC_PASSES = 200;

async function removeSyncedOutbox(db: AppDb) {
  const syncedIds = db.collections.outbox.toArray
    .filter((row) => row.sync)
    .map((row) => row.eventId);
  for (const eventId of syncedIds) {
    await db.collections.outbox.delete(eventId).isPersisted.promise;
  }
}

/**
 * Push one chunk per sync pass, drop the rows that were accepted, then continue
 * from what is still waiting. Stops when the outbox no longer shrinks.
 */
export async function drainManagedSync(db: AppDb, mode: "background" | "manual") {
  let pushed = 0;
  let pulled = 0;
  let deferred = false;
  const errors: Error[] = [];

  for (let pass = 0; pass < MAX_SYNC_PASSES; pass++) {
    const before = db.getSyncStatus().pendingCount;
    if (before === 0) break;

    const result = mode === "manual" ? await db.manualSync() : await db.sync();
    pushed += result.pushed;
    pulled += result.pulled;
    if (result.deferred) deferred = true;
    errors.push(...result.errors);
    await removeSyncedOutbox(db);

    if (result.deferred || result.errors.length > 0) break;
    const after = db.getSyncStatus().pendingCount;
    if (after === 0 || after >= before) break;
  }

  return { pushed, pulled, deferred, errors };
}

/**
 * Fire-and-forget push/pull when managed sync is enabled.
 * Safe to call from multiple {@link EventSourcedDbProvider} mounts.
 */
export function kickManagedSync(db: AppDb): void {
  if (!db.getSyncEnabled()) return;
  if (managedSyncInFlight) return;

  managedSyncInFlight = drainManagedSync(db, "background")
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
