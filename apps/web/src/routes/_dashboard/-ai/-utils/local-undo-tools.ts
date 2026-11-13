import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { revertOwnEvents } from "@/data-access-layer/event-sourced/resume/event-history";
import type { AiChange, LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  undoLastAiChangeToolInputSchema,
  type UndoLastAiChangeToolInput,
  type UndoLastAiChangeToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";

function nextOutboxSeq(db: AppDb) {
  return db.collections.outbox.toArray.reduce(
    (next, entry) => Math.max(next, entry.localSeq + 1),
    0,
  );
}

const settleOutbox = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested: unknown) =>
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => (a < b ? -1 : 1)))
      : nested,
  );
}

function stripVolatile(row: Record<string, unknown> | null) {
  if (!row) return row;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "updatedAt" || key.startsWith("$")) continue;
    out[key] = value;
  }
  return out;
}

function snapshot(db: AppDb) {
  const result = new Map<string, Map<string, Record<string, unknown>>>();
  for (const [collectionId, collection] of Object.entries(db.collections)) {
    if (collectionId === "outbox" || collectionId === "inbox" || collectionId === "deadletter")
      continue;
    const rows = new Map<string, Record<string, unknown>>();
    for (const row of (collection as unknown as { toArray: ReadonlyArray<Record<string, unknown>> })
      .toArray) {
      const key = String((row as { id?: string }).id ?? "");
      rows.set(key, { ...row });
    }
    result.set(collectionId, rows);
  }
  return result;
}

function diffSnapshots(
  before: Map<string, Map<string, Record<string, unknown>>>,
  after: Map<string, Map<string, Record<string, unknown>>>,
) {
  const touched: AiChange["touched"] = [];
  const collections = new Set([...before.keys(), ...after.keys()]);
  for (const collectionId of collections) {
    const beforeRows = before.get(collectionId) ?? new Map();
    const afterRows = after.get(collectionId) ?? new Map();
    const keys = new Set([...beforeRows.keys(), ...afterRows.keys()]);
    for (const key of keys) {
      const b = beforeRows.get(key) ?? null;
      const a = afterRows.get(key) ?? null;
      if (canonicalJson(stripVolatile(b)) !== canonicalJson(stripVolatile(a))) {
        touched.push({ collectionId, key, before: b, after: a });
      }
    }
  }
  return touched;
}

function eventsOf(db: AppDb, change: AiChange) {
  const entries = db.collections.outbox.toArray as Array<{
    txId: string;
    localSeq: number;
    collectionId: string;
    key: string;
  }>;
  const firstSeq = new Map<string, number>();
  for (const entry of entries) {
    firstSeq.set(entry.txId, Math.min(firstSeq.get(entry.txId) ?? entry.localSeq, entry.localSeq));
  }
  return entries.filter((entry) => {
    const seq = firstSeq.get(entry.txId) ?? entry.localSeq;
    return seq >= change.fromSeq && seq < change.toSeq;
  }) as never;
}

/** Runs one write tool and records its outbox range on the context, even when it fails part way. */
export async function trackAiChange<T>(
  ctx: LocalToolContext,
  tool: string,
  run: () => T | Promise<T>,
): Promise<T> {
  await settleOutbox();
  const fromSeq = nextOutboxSeq(ctx.db);
  const before = snapshot(ctx.db);
  try {
    return await run();
  } finally {
    await settleOutbox();
    const after = snapshot(ctx.db);
    ctx.changes.push({
      tool,
      fromSeq,
      toSeq: nextOutboxSeq(ctx.db),
      touched: diffSnapshots(before, after),
    });
  }
}

export function undoLocalAiChange(
  ctx: LocalToolContext,
  input: UndoLastAiChangeToolInput,
): UndoLastAiChangeToolOutput {
  undoLastAiChangeToolInputSchema.parse(input);
  let change = ctx.changes.pop();
  let events = change ? eventsOf(ctx.db, change) : [];
  while (change && Array.isArray(events) && events.length === 0 && change.touched.length === 0) {
    change = ctx.changes.pop();
    events = change ? eventsOf(ctx.db, change) : [];
  }

  const result = {
    reverted: 0,
    skipped: [] as Array<{ collectionId: string; key: string }>,
    unknown: [] as Array<{ collectionId: string; key: string }>,
  };

  if (change && change.touched && change.touched.length > 0) {
    const now = Date.now();
    for (const touched of change.touched) {
      const collection = (
        ctx.db.collections as unknown as Record<
          string,
          {
            has: (key: string) => boolean;
            get: (key: string) => Record<string, unknown> | undefined;
            insert: (row: Record<string, unknown>) => unknown;
            update: (key: string, updater: (draft: Record<string, unknown>) => void) => unknown;
            delete: (key: string) => unknown;
          }
        >
      )[touched.collectionId];
      if (!collection) {
        result.unknown.push({ collectionId: touched.collectionId, key: touched.key });
        continue;
      }
      const ref = { collectionId: touched.collectionId, key: touched.key };
      const current = collection.get(touched.key);
      const before = touched.before;
      const after = touched.after;

      if (before === null && after !== null) {
        // Created by the tool: remove it unless the user already did.
        if (collection.has(touched.key)) {
          collection.delete(touched.key);
          result.reverted += 1;
        } else {
          result.skipped.push(ref);
        }
        continue;
      }

      if (before !== null && after === null) {
        // Deleted by the tool: restore unless the user re-created it.
        if (!collection.has(touched.key)) {
          const row = typeof before.updatedAt === "number" ? { ...before, updatedAt: now } : before;
          collection.insert(row);
          result.reverted += 1;
        } else {
          result.skipped.push(ref);
        }
        continue;
      }

      if (before !== null && after !== null) {
        // Updated by the tool: restore unless edited since.
        if (!collection.has(touched.key)) {
          result.skipped.push(ref);
          continue;
        }
        if (!rowsEqual(current, after)) {
          result.skipped.push(ref);
          continue;
        }
        const row = typeof before.updatedAt === "number" ? { ...before, updatedAt: now } : before;
        collection.update(touched.key, (draft) => {
          Object.assign(draft, row);
        });
        result.reverted += 1;
        continue;
      }
    }
  } else if (change) {
    const reverted = revertOwnEvents(ctx.db, events as never);
    result.reverted = reverted.reverted;
    result.skipped = reverted.skipped;
    result.unknown = reverted.unknown;
  }

  const activeResumeId = ctx.getActiveResumeId();
  return {
    undoneTool: change?.tool ?? null,
    reverted: result.reverted,
    skipped: result.skipped,
    unknown: result.unknown,
    remaining: ctx.changes.length,
    activeResumeId:
      activeResumeId && ctx.db.collections.resume.has(activeResumeId) ? activeResumeId : null,
  };
}

function rowsEqual(a: Record<string, unknown> | undefined, b: Record<string, unknown> | null) {
  if (a === undefined && b === null) return true;
  if (a === undefined || b === null) return false;
  return canonicalJson(stripVolatile(a)) === canonicalJson(stripVolatile(b));
}
