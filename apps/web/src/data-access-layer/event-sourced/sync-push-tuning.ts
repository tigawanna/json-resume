import type { SyncPushLimits } from "event-sourced-collection";
import type { AppDb } from "./collection";
import { readAppSettings, updateAppSettings } from "./app-settings";
import type { SyncPushStats } from "./schemas";
import { setPushObserver, type PushOutcome } from "./sync-transport";

/** Rungs the batch size drops through after an HTTP 413. */
export const SYNC_BATCH_SIZE_STEPS = [100, 50, 40, 30, 20, 10, 5, 1] as const;

/** Byte cap after a 413, as a share of the rejected request's size. */
const TOO_LARGE_BYTES_FACTOR = 0.8;

const EMPTY_STATS: SyncPushStats = {
  largestOkEvents: 0,
  largestOkBytes: 0,
  avgEventBytes: 0,
  sampledEvents: 0,
};

export function stepBelow(size: number): number {
  return SYNC_BATCH_SIZE_STEPS.find((step) => step < size) ?? 1;
}

export function recordAcceptedPush(stats: SyncPushStats | undefined, outcome: PushOutcome) {
  const current = stats ?? EMPTY_STATS;
  const sampledEvents = current.sampledEvents + outcome.events;
  return {
    ...current,
    largestOkEvents: Math.max(current.largestOkEvents, outcome.events),
    largestOkBytes: Math.max(current.largestOkBytes, outcome.bytes),
    avgEventBytes:
      sampledEvents === 0
        ? 0
        : (current.avgEventBytes * current.sampledEvents + outcome.bytes) / sampledEvents,
    sampledEvents,
  } satisfies SyncPushStats;
}

/**
 * Next limits after the server rejected `outcome` as too large, or `null` when
 * lowering limits cannot help (a single event over the platform limit is
 * dead-lettered by the library instead).
 */
export function limitsAfterTooLarge(
  limits: SyncPushLimits,
  stats: SyncPushStats | undefined,
  outcome: PushOutcome,
  now: number,
): { limits: SyncPushLimits; stats: SyncPushStats } | null {
  if (outcome.events <= 1) return null;

  const pushBatchSize = Math.min(limits.pushBatchSize, stepBelow(outcome.events));
  const learnedBytes = Math.floor(outcome.bytes * TOO_LARGE_BYTES_FACTOR);
  const maxPushBytes =
    limits.maxPushBytes === null ? learnedBytes : Math.min(limits.maxPushBytes, learnedBytes);

  return {
    limits: { pushBatchSize, maxPushBytes },
    stats: {
      ...(stats ?? EMPTY_STATS),
      lastTooLarge: {
        at: now,
        events: outcome.events,
        bytes: outcome.bytes,
        droppedFrom: limits.pushBatchSize,
        droppedTo: pushBatchSize,
        maxBytesTo: maxPushBytes,
      },
    },
  };
}

/** How many average-sized events fit under the byte cap, or `null` before any history. */
export function eventsThatFit(maxPushBytes: number | null, stats: SyncPushStats | undefined) {
  if (maxPushBytes === null || !stats || stats.avgEventBytes <= 0) return null;
  return Math.max(1, Math.floor(maxPushBytes / stats.avgEventBytes));
}

let presetLimits: SyncPushLimits | null = null;

/** Limits from the `syncPreset` in `collection.ts`, before user or learned overrides. */
export function getPresetPushLimits(db: AppDb): SyncPushLimits {
  return presetLimits ?? db.getPushLimits();
}

/**
 * Applies saved limits to the DB and learns from every push: accepted
 * requests feed the size stats, a 413 steps the batch size down a rung and
 * lowers the byte cap so the next batches are packed smaller up front.
 */
export function installSyncPushTuning(db: AppDb) {
  presetLimits ??= db.getPushLimits();
  const settings = readAppSettings(db);
  db.setPushLimits({
    pushBatchSize: settings.syncPushBatchSize ?? presetLimits.pushBatchSize,
    maxPushBytes: settings.syncPushMaxBytes ?? presetLimits.maxPushBytes,
  });

  setPushObserver((outcome) => {
    const stats = readAppSettings(db).syncPushStats;

    if (outcome.status === "ok") {
      updateAppSettings(db, { syncPushStats: recordAcceptedPush(stats, outcome) });
      return;
    }

    const next = limitsAfterTooLarge(db.getPushLimits(), stats, outcome, Date.now());
    if (!next) return;
    const applied = db.setPushLimits(next.limits);
    console.warn("[sync push] server rejected batch as too large, lowering limits", {
      events: outcome.events,
      bytes: outcome.bytes,
      ...applied,
    });
    updateAppSettings(db, {
      syncPushBatchSize: applied.pushBatchSize,
      syncPushMaxBytes: applied.maxPushBytes ?? undefined,
      syncPushStats: next.stats,
    });
  });
}

export function setSyncPushBatchSize(db: AppDb, pushBatchSize: number) {
  const applied = db.setPushLimits({ pushBatchSize });
  updateAppSettings(db, { syncPushBatchSize: applied.pushBatchSize });
  return applied;
}

/** Back to the preset limits; clears what was learned from 413s. */
export function resetSyncPushTuning(db: AppDb) {
  const preset = getPresetPushLimits(db);
  const applied = db.setPushLimits(preset);
  updateAppSettings(db, {
    syncPushBatchSize: undefined,
    syncPushMaxBytes: undefined,
    syncPushStats: undefined,
  });
  return applied;
}
