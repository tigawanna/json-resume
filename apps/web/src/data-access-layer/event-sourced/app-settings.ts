import type { AppDb } from "./collection";
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

/** Recent synced outbox/inbox rows kept for the Events page; older ones are pruned. */
const SYNCED_EVENTS_KEPT = 50;

/**
 * One library sync: it pushes the outbox batch by batch until drained, then
 * pulls every page. Synced outbox rows are left for `pruneSyncedEvents`.
 */
export async function runManagedSync(db: AppDb, mode: "background" | "manual") {
  beginSyncProgress(db.getSyncStatus().pendingCount);
  try {
    const result = mode === "manual" ? await db.manualSync() : await db.sync();
    if (!result.deferred && result.errors.length === 0) {
      await db.pruneSyncedEvents({ keepLast: SYNCED_EVENTS_KEPT });
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
