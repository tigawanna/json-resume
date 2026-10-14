// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HISTORY_UPDATES } from "@/data-access-layer/event-sourced/testing/seed-history/history";
import { openSeededLibrary } from "./open-seeded-library";

let seeded: Awaited<ReturnType<typeof openSeededLibrary>>;

beforeEach(async () => {
  seeded = await openSeededLibrary({ resumes: 5, updates: HISTORY_UPDATES });
});

afterEach(() => seeded.close());

describe("compactOnClient", () => {
  it("seeds one résumé and an outbox event for the create and each update", () => {
    expect(seeded.db.collections.resume.toArray).toHaveLength(5);
    const eventsPerRow = HISTORY_UPDATES + 1;
    for (const row of seeded.seeded.rows) {
      const events = seeded.db.collections.outbox.toArray.filter(
        (event) => event.collectionId === row.collectionId && String(event.key) === row.id,
      );
      expect(events).toHaveLength(eventsPerRow);
      expect(events.filter((event) => event.type === "insert")).toHaveLength(1);
      expect(events.filter((event) => event.type === "update")).toHaveLength(HISTORY_UPDATES);
    }
  });
});
