import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { revertOwnEvents } from "@/data-access-layer/event-sourced/event-history";
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

function eventsOf(db: AppDb, change: AiChange) {
  const entries = db.collections.outbox.toArray;
  const firstSeq = new Map<string, number>();
  for (const entry of entries) {
    firstSeq.set(entry.txId, Math.min(firstSeq.get(entry.txId) ?? entry.localSeq, entry.localSeq));
  }
  return entries.filter((entry) => {
    const seq = firstSeq.get(entry.txId) ?? entry.localSeq;
    return seq >= change.fromSeq && seq < change.toSeq;
  });
}

/** Runs one write tool and records its outbox range on the context, even when it fails part way. */
export async function trackAiChange<T>(
  ctx: LocalToolContext,
  tool: string,
  run: () => T | Promise<T>,
): Promise<T> {
  const fromSeq = nextOutboxSeq(ctx.db);
  try {
    return await run();
  } finally {
    ctx.changes.push({ tool, fromSeq, toSeq: nextOutboxSeq(ctx.db) });
  }
}

export function undoLocalAiChange(
  ctx: LocalToolContext,
  input: UndoLastAiChangeToolInput,
): UndoLastAiChangeToolOutput {
  undoLastAiChangeToolInputSchema.parse(input);
  let change = ctx.changes.pop();
  let events = change ? eventsOf(ctx.db, change) : [];
  while (change && events.length === 0) {
    change = ctx.changes.pop();
    events = change ? eventsOf(ctx.db, change) : [];
  }

  const result = change
    ? revertOwnEvents(ctx.db, events)
    : { reverted: 0, skipped: [], unknown: [] };
  const activeResumeId = ctx.getActiveResumeId();
  return {
    undoneTool: change?.tool ?? null,
    ...result,
    remaining: ctx.changes.length,
    activeResumeId: ctx.db.collections.resume.has(activeResumeId) ? activeResumeId : null,
  };
}
