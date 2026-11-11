// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { HISTORY_UPDATES } from "@/data-access-layer/event-sourced/testing/seed-history/history";
import { openSeededLibrary } from "./open-seeded-library";

let seeded: Awaited<ReturnType<typeof openSeededLibrary>>;

// The seed writes 5 résumés x 16 collections x (1 insert + 20 updates).
// `compactOnWrite` folds the unpushed chain on every update, so most of the
// cost is SQLite I/O rather than outbox growth. 30s keeps it stable under the
// full parallel suite while still flagging a real regression.
beforeEach(async () => {
  seeded = await openSeededLibrary({ resumes: 5, updates: HISTORY_UPDATES });
}, 30_000);

afterEach(() => seeded.close());

describe("compactOnClient", () => {
  it("seeds five résumés and folds each row's history into one pending insert", () => {
    expect(seeded.db.collections.resume.toArray).toHaveLength(5);

    for (const row of seeded.seeded.rows) {
      const events = seeded.db.collections.outbox.toArray.filter(
        (event) => event.collectionId === row.collectionId && String(event.key) === row.id,
      );

      // `compactOnWrite` (default on in event-sourced-collection) replaces the
      // create + 20 updates with one insert carrying the newest payload.
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "insert",
        compaction: true,
        payload: { updatedAt: HISTORY_UPDATES + 1 },
      });
    }
  });
});
