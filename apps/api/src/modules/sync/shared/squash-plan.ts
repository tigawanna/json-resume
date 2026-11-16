import type { MutationType } from "event-sourced-collection";

export const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;

/** The parts of an event the squash rule looks at, from the server log or a device queue. */
export type SquashableEvent = {
  collectionId: string;
  key: string;
  type: MutationType;
  /** Position in the log; higher is later. */
  order: number;
  /** Milliseconds since epoch, compared against the retention cutoff. */
  at: number;
  /** Counts as the row's latest event but is never removed. */
  pinned?: boolean;
};

export type SquashReason = "superseded" | "deleted";

export type SquashPlan<T extends SquashableEvent> = {
  remove: T[];
  kept: number;
  reasons: Record<SquashReason, number>;
};

const rowKey = (event: SquashableEvent) => `${event.collectionId}\u0000${event.key}`;

/**
 * Every row's latest event is its truth: a full row for insert/update, a
 * tombstone for delete. Earlier events for the row are dead weight once they
 * are older than `before`.
 */
export function planSquash<T extends SquashableEvent>(
  events: readonly T[],
  options: { before: number },
): SquashPlan<T> {
  const latest = new Map<string, T>();
  for (const event of events) {
    const current = latest.get(rowKey(event));
    if (!current || event.order > current.order) latest.set(rowKey(event), event);
  }

  const remove: T[] = [];
  const reasons: Record<SquashReason, number> = { superseded: 0, deleted: 0 };
  for (const event of events) {
    const last = latest.get(rowKey(event));
    if (!last || last === event || event.pinned || event.at >= options.before) continue;
    remove.push(event);
    reasons[last.type === "delete" ? "deleted" : "superseded"] += 1;
  }
  return { remove, kept: events.length - remove.length, reasons };
}

export type RestorableEvent = SquashableEvent & {
  id: string;
  payload: Record<string, unknown>;
  previous: Record<string, unknown> | null;
};

export type RestoreStep =
  | { kind: "upsert"; collectionId: string; key: string; row: Record<string, unknown> }
  | { kind: "remove"; collectionId: string; key: string };

export type RestorePlan = {
  steps: RestoreStep[];
  /** Rows changed after the target whose earlier state is no longer recorded. */
  unknown: { collectionId: string; key: string }[];
};

/**
 * Puts every row touched after `targetId` back to its state as of that event.
 * The state comes from the row's last event at or before the target, or failing
 * that from `previous` on its first event after it.
 */
export function planRestore(events: readonly RestorableEvent[], targetId: string): RestorePlan {
  const target = events.find((event) => event.id === targetId);
  if (!target) return { steps: [], unknown: [] };

  const ordered = [...events].sort((a, b) => a.order - b.order);
  const lastBefore = new Map<string, RestorableEvent>();
  const firstAfter = new Map<string, RestorableEvent>();
  for (const event of ordered) {
    const key = rowKey(event);
    if (event.order <= target.order) lastBefore.set(key, event);
    else if (!firstAfter.has(key)) firstAfter.set(key, event);
  }

  const steps: RestoreStep[] = [];
  const unknown: RestorePlan["unknown"] = [];
  for (const [key, after] of firstAfter) {
    const row = { collectionId: after.collectionId, key: after.key };
    const before = lastBefore.get(key);
    if (before) {
      steps.push(
        before.type === "delete"
          ? { kind: "remove", ...row }
          : { kind: "upsert", ...row, row: before.payload },
      );
    } else if (after.type === "insert") {
      steps.push({ kind: "remove", ...row });
    } else if (after.previous) {
      steps.push({ kind: "upsert", ...row, row: after.previous });
    } else {
      unknown.push(row);
    }
  }
  return { steps, unknown };
}
