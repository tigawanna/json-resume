import type { SyncPushLimits } from "event-sourced-collection";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { AppDb } from "./collection";
import { setPushObserver, type PushOutcome } from "./sync-transport";

/** Rungs the batch size drops through after an HTTP 413. */
export const SYNC_BATCH_SIZE_STEPS = [100, 50, 40, 30, 20, 10, 5, 1] as const;

/** Byte cap after a 413, as a share of the rejected request's size. */
const TOO_LARGE_BYTES_FACTOR = 0.8;

/**
 * Device-local and never synced: storing this in a synced collection would
 * make every push author a new outbox event, so the outbox never drains.
 */
const STORAGE_KEY = "sync-push-tuning";

const syncPushStatsSchema = z.object({
  largestOkEvents: z.number().int().nonnegative(),
  largestOkBytes: z.number().int().nonnegative(),
  avgEventBytes: z.number().nonnegative(),
  sampledEvents: z.number().int().nonnegative(),
  lastTooLarge: z
    .object({
      at: z.number(),
      events: z.number().int(),
      bytes: z.number().int(),
      droppedFrom: z.number().int(),
      droppedTo: z.number().int(),
      maxBytesTo: z.number().int(),
    })
    .optional(),
});
export type SyncPushStats = z.infer<typeof syncPushStatsSchema>;

const syncPushTuningSchema = z.object({
  pushBatchSize: z.number().int().min(1).max(100).optional(),
  maxPushBytes: z.number().int().positive().optional(),
  stats: syncPushStatsSchema.optional(),
});
export type SyncPushTuning = z.infer<typeof syncPushTuningSchema>;

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

function readStored(): SyncPushTuning {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = syncPushTuningSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch (err: unknown) {
    console.warn("[sync push] ignoring unreadable tuning", err);
    return {};
  }
}

let tuning: SyncPushTuning = readStored();
const listeners = new Set<() => void>();

function writeTuning(next: SyncPushTuning) {
  tuning = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY_TUNING: SyncPushTuning = {};

export function useSyncPushTuning(): SyncPushTuning {
  return useSyncExternalStore(
    subscribe,
    () => tuning,
    () => EMPTY_TUNING,
  );
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
  db.setPushLimits({
    pushBatchSize: tuning.pushBatchSize ?? presetLimits.pushBatchSize,
    maxPushBytes: tuning.maxPushBytes ?? presetLimits.maxPushBytes,
  });

  setPushObserver((outcome) => {
    if (outcome.status === "ok") {
      writeTuning({ ...tuning, stats: recordAcceptedPush(tuning.stats, outcome) });
      return;
    }

    const next = limitsAfterTooLarge(db.getPushLimits(), tuning.stats, outcome, Date.now());
    if (!next) return;
    const applied = db.setPushLimits(next.limits);
    console.warn("[sync push] server rejected batch as too large, lowering limits", {
      events: outcome.events,
      bytes: outcome.bytes,
      ...applied,
    });
    writeTuning({
      pushBatchSize: applied.pushBatchSize,
      maxPushBytes: applied.maxPushBytes ?? undefined,
      stats: next.stats,
    });
  });
}

export function setSyncPushBatchSize(db: AppDb, pushBatchSize: number) {
  const applied = db.setPushLimits({ pushBatchSize });
  writeTuning({ ...tuning, pushBatchSize: applied.pushBatchSize });
  return applied;
}

/** Back to the preset limits; clears what was learned from 413s. */
export function resetSyncPushTuning(db: AppDb) {
  const applied = db.setPushLimits(getPresetPushLimits(db));
  writeTuning({});
  return applied;
}
