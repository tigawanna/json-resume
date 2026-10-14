import { syncEvent, syncSquashState, user } from "@/lib/drizzle/scheam";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  max,
  min,
  ne,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { SYNC_RESET_COLLECTION } from "../plan/sync-reset.ts";

type SquashDb = Pick<LibSQLDatabase, "select" | "insert" | "update" | "delete">;

/** Events per step; each step's deletes and `previous` strip commit before the next. */
export const SQUASH_STEP_EVENTS = 500;

export type IncrementalSquashOptions = {
  now: number;
  retentionMs: number;
  /** Stops starting new steps after this long; finished steps are kept. */
  budgetMs: number;
  maxUsers: number;
};

export type IncrementalSquashResult = {
  users: number;
  caughtUp: number;
  removed: number;
  stripped: number;
  steps: number;
  outOfTime: boolean;
};

/**
 * Users with events past their watermark that are old enough to squash, never
 * squashed first, then the longest since their last pass.
 */
async function pickUsers(db: SquashDb, cutoff: Date, limit: number) {
  return db
    .select({ userId: user.id, through: syncSquashState.squashedThroughSeq })
    .from(user)
    .leftJoin(syncSquashState, eq(syncSquashState.userId, user.id))
    .where(
      exists(
        db
          .select({ one: sql`1` })
          .from(syncEvent)
          .where(
            and(
              eq(syncEvent.userId, user.id),
              gt(syncEvent.globalSeq, sql`coalesce(${syncSquashState.squashedThroughSeq}, 0)`),
              lt(syncEvent.serverTimestamp, cutoff),
            ),
          ),
      ),
    )
    .orderBy(asc(syncSquashState.squashedAt))
    .limit(limit);
}

/**
 * The last seq this user's log can be squashed through: older than the cutoff
 * and before the first event projection has not applied yet.
 */
async function squashableThrough(db: SquashDb, userId: string, cutoff: Date) {
  // `+user_id` sends this through the (nearly empty) projected_at index instead of every event the user has.
  const [pending] = await db
    .select({ seq: min(syncEvent.globalSeq) })
    .from(syncEvent)
    .where(and(eq(sql`+${syncEvent.userId}`, userId), isNull(syncEvent.projectedAt)));
  const [last] = await db
    .select({ seq: syncEvent.globalSeq })
    .from(syncEvent)
    .where(
      and(
        eq(syncEvent.userId, userId),
        lt(syncEvent.serverTimestamp, cutoff),
        pending?.seq == null ? undefined : lt(syncEvent.globalSeq, pending.seq),
      ),
    )
    .orderBy(desc(syncEvent.globalSeq))
    .limit(1);
  return last?.seq ?? 0;
}

async function stepEnd(db: SquashDb, userId: string, from: number, through: number) {
  const [edge] = await db
    .select({ seq: syncEvent.globalSeq })
    .from(syncEvent)
    .where(
      and(
        eq(syncEvent.userId, userId),
        gt(syncEvent.globalSeq, from),
        lte(syncEvent.globalSeq, through),
      ),
    )
    .orderBy(asc(syncEvent.globalSeq))
    .limit(1)
    .offset(SQUASH_STEP_EVENTS - 1);
  return edge?.seq ?? through;
}

/**
 * Removes every earlier event of the rows touched in `(from, to]`. Walking the
 * newer events rather than the older ones is what catches a row edited long
 * after its first event.
 *
 * Cost has to follow the step, not the user's whole log: `+user_id` keeps
 * SQLite on the seq (rowid) range instead of scanning the user's index entries,
 * and the cross join makes it seek each touched row's history rather than walk
 * all of the user's events and probe the step.
 */
async function removeSuperseded(db: SquashDb, userId: string, from: number, to: number) {
  const touched = db
    .select({
      collectionId: syncEvent.collectionId,
      key: syncEvent.key,
      latest: max(syncEvent.globalSeq).as("latest"),
    })
    .from(syncEvent)
    .where(
      and(
        eq(sql`+${syncEvent.userId}`, userId),
        gt(syncEvent.globalSeq, from),
        lte(syncEvent.globalSeq, to),
      ),
    )
    .groupBy(syncEvent.collectionId, syncEvent.key)
    .as("touched");
  const older = alias(syncEvent, "older");
  const superseded = db
    .select({ seq: older.globalSeq })
    .from(touched)
    .crossJoin(older)
    .where(
      and(
        eq(older.userId, userId),
        eq(older.collectionId, touched.collectionId),
        eq(older.key, touched.key),
        lt(older.globalSeq, touched.latest),
        ne(older.collectionId, SYNC_RESET_COLLECTION),
      ),
    );
  const result = await db.delete(syncEvent).where(inArray(syncEvent.globalSeq, superseded));
  return result.rowsAffected;
}

/** `previous` only serves restore, which never reaches past the retention window. */
async function stripPrevious(db: SquashDb, userId: string, from: number, to: number) {
  const result = await db
    .update(syncEvent)
    .set({ previous: null })
    .where(
      and(
        eq(syncEvent.userId, userId),
        gt(syncEvent.globalSeq, from),
        lte(syncEvent.globalSeq, to),
        isNotNull(syncEvent.previous),
      ),
    );
  return result.rowsAffected;
}

async function saveProgress(
  db: SquashDb,
  userId: string,
  through: number,
  removed: number,
  squashedAt: Date | null,
) {
  await db
    .insert(syncSquashState)
    .values({ userId, squashedThroughSeq: through, removedEvents: removed, squashedAt })
    .onConflictDoUpdate({
      target: syncSquashState.userId,
      set: {
        squashedThroughSeq: sql`max(${syncSquashState.squashedThroughSeq}, excluded.squashed_through_seq)`,
        removedEvents: sql`${syncSquashState.removedEvents} + excluded.removed_events`,
        ...(squashedAt ? { squashedAt } : {}),
      },
    });
}

/**
 * Squashes each picked user's log from their watermark up to the retention
 * cutoff in steps, keeping every row's latest event and clearing `previous` on
 * what is left. A user cut off by the budget keeps their progress and stays at
 * the front of the queue; `squashedAt` is only set once a user is caught up.
 */
export async function squashUserLogsIncrementally(
  db: SquashDb,
  options: IncrementalSquashOptions,
): Promise<IncrementalSquashResult> {
  const deadline = Date.now() + options.budgetMs;
  const cutoff = new Date(options.now - options.retentionMs);
  const result: IncrementalSquashResult = {
    users: 0,
    caughtUp: 0,
    removed: 0,
    stripped: 0,
    steps: 0,
    outOfTime: false,
  };

  for (const candidate of await pickUsers(db, cutoff, options.maxUsers)) {
    if (Date.now() >= deadline) {
      result.outOfTime = true;
      break;
    }
    result.users += 1;
    const through = await squashableThrough(db, candidate.userId, cutoff);
    let from = candidate.through ?? 0;
    if (through <= from) {
      await saveProgress(db, candidate.userId, from, 0, new Date(options.now));
      result.caughtUp += 1;
      continue;
    }
    while (from < through) {
      if (Date.now() >= deadline) {
        result.outOfTime = true;
        break;
      }
      const to = await stepEnd(db, candidate.userId, from, through);
      const removed = await removeSuperseded(db, candidate.userId, from, to);
      result.stripped += await stripPrevious(db, candidate.userId, from, to);
      result.removed += removed;
      result.steps += 1;
      from = to;
      const done = from >= through;
      await saveProgress(db, candidate.userId, from, removed, done ? new Date(options.now) : null);
      if (done) result.caughtUp += 1;
    }
    if (result.outOfTime) break;
  }
  return result;
}
