// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { syncEvent, syncSquashState, user } from "@/lib/drizzle/scheam";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SQUASH_STEP_EVENTS, squashUserLogsIncrementally } from "./squash-incremental.server.ts";
import { SYNC_RESET_COLLECTION } from "../shared/sync-reset.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 9, 1);
const migrationsFolder = fileURLToPath(new URL("../../../../drizzle/migrations", import.meta.url));

let dir: string;
let db: ReturnType<typeof drizzle>;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "squash-incremental-"));
  db = drizzle({ connection: { url: `file:${join(dir, "test.db")}` } });
  await migrate(db, { migrationsFolder });
  await db.insert(user).values([
    { id: "u1", name: "One", email: "one@example.com" },
    { id: "u2", name: "Two", email: "two@example.com" },
  ]);
});

afterEach(() => {
  db.$client.close();
  rmSync(dir, { recursive: true, force: true });
});

type EventInput = {
  userId?: string;
  collectionId?: string;
  key: string;
  type?: "insert" | "update" | "delete";
  at: number;
  projected?: boolean;
};

async function addEvents(events: EventInput[]) {
  await db.insert(syncEvent).values(
    events.map((event) => ({
      eventId: crypto.randomUUID(),
      userId: event.userId ?? "u1",
      collectionId: event.collectionId ?? "resume",
      type: event.type ?? "update",
      key: event.key,
      payload: JSON.stringify({ id: event.key, at: event.at }),
      previous: event.type === "insert" ? null : JSON.stringify({ id: event.key }),
      txId: crypto.randomUUID(),
      clientId: "test",
      clientTimestamp: event.at,
      serverTimestamp: new Date(event.at),
      projectedAt: event.projected === false ? null : new Date(event.at),
    })),
  );
}

function run(now: number, budgetMs = 60_000) {
  return squashUserLogsIncrementally(db, { now, retentionMs: DAY, budgetMs, maxUsers: 100 });
}

async function remaining(userId = "u1") {
  return db
    .select({
      key: syncEvent.key,
      collectionId: syncEvent.collectionId,
      at: syncEvent.clientTimestamp,
      previous: syncEvent.previous,
    })
    .from(syncEvent)
    .where(eq(syncEvent.userId, userId))
    .orderBy(asc(syncEvent.globalSeq));
}

async function state(userId = "u1") {
  const [row] = await db.select().from(syncSquashState).where(eq(syncSquashState.userId, userId));
  return row;
}

describe("squashUserLogsIncrementally", () => {
  it("keeps each row's latest event and clears previous on what is left", async () => {
    await addEvents([
      { key: "a", type: "insert", at: T0 },
      { key: "a", at: T0 + 1 },
      { key: "b", type: "insert", at: T0 + 2 },
      { key: "a", at: T0 + 3 },
    ]);

    const result = await run(T0 + 2 * DAY);

    expect(result).toMatchObject({ users: 1, caughtUp: 1, removed: 2, outOfTime: false });
    expect(await remaining()).toEqual([
      { key: "b", collectionId: "resume", at: T0 + 2, previous: null },
      { key: "a", collectionId: "resume", at: T0 + 3, previous: null },
    ]);
    expect(await state()).toMatchObject({ removedEvents: 2, squashedAt: new Date(T0 + 2 * DAY) });
  });

  it("leaves events inside the retention window alone", async () => {
    const now = T0 + 10 * DAY;
    await addEvents([
      { key: "a", at: now - 2 * DAY },
      { key: "a", at: now - HOUR },
    ]);

    await run(now);
    expect((await remaining()).map((event) => event.at)).toEqual([now - 2 * DAY, now - HOUR]);

    await run(now + DAY);
    expect((await remaining()).map((event) => event.at)).toEqual([now - HOUR]);
  });

  it("removes an event already behind the watermark once a later edit ages out", async () => {
    await addEvents([{ key: "a", at: T0 }]);
    await run(T0 + 2 * DAY);
    expect(await remaining()).toHaveLength(1);

    await addEvents([{ key: "a", at: T0 + 5 * DAY }]);
    await run(T0 + 7 * DAY);

    expect((await remaining()).map((event) => event.at)).toEqual([T0 + 5 * DAY]);
  });

  it("never touches another user's row with the same key", async () => {
    await addEvents([
      { userId: "u2", key: "a", at: T0 },
      { userId: "u1", key: "a", at: T0 + 1 },
    ]);

    await run(T0 + 2 * DAY);

    expect(await remaining("u1")).toHaveLength(1);
    expect(await remaining("u2")).toHaveLength(1);
  });

  it("stops before events projection has not applied", async () => {
    await addEvents([
      { key: "a", at: T0 },
      { key: "a", at: T0 + 1, projected: false },
      { key: "a", at: T0 + 2 },
    ]);

    await run(T0 + 2 * DAY);

    expect(await remaining()).toHaveLength(3);
    expect(await state()).toMatchObject({ squashedThroughSeq: 1 });
  });

  it("keeps reset markers", async () => {
    await addEvents([
      { collectionId: SYNC_RESET_COLLECTION, key: "u1", type: "insert", at: T0 },
      { collectionId: SYNC_RESET_COLLECTION, key: "u1", type: "insert", at: T0 + 1 },
    ]);

    await run(T0 + 2 * DAY);

    expect(await remaining()).toHaveLength(2);
  });

  it("walks a long log in steps and resumes after running out of time", async () => {
    const count = SQUASH_STEP_EVENTS * 2 + 10;
    await addEvents(
      Array.from({ length: count }, (_, i) => ({ key: i % 2 ? "a" : "b", at: T0 + i })),
    );

    const stalled = await run(T0 + 2 * DAY, 0);
    expect(stalled).toMatchObject({ users: 0, steps: 0, outOfTime: true });

    const result = await run(T0 + 2 * DAY);
    expect(result).toMatchObject({ steps: 3, caughtUp: 1, removed: count - 2 });
    expect((await remaining()).map((event) => event.key)).toEqual(["b", "a"]);
    expect(await state()).toMatchObject({ squashedThroughSeq: count, removedEvents: count - 2 });
  });

  it("serves users that were never squashed before the most recently squashed", async () => {
    await addEvents([{ userId: "u2", key: "x", at: T0 }]);
    await run(T0 + 2 * DAY);
    await addEvents([
      { userId: "u2", key: "x", at: T0 + 3 * DAY },
      { userId: "u1", key: "a", at: T0 + 3 * DAY },
    ]);

    const result = await squashUserLogsIncrementally(db, {
      now: T0 + 5 * DAY,
      retentionMs: DAY,
      budgetMs: 60_000,
      maxUsers: 1,
    });

    expect(result.users).toBe(1);
    expect(await state("u1")).toBeDefined();
    expect(await remaining("u2")).toHaveLength(2);
  });
});
