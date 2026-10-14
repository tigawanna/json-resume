// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSeededLibrary } from "./open-seeded-library";

let seeded: Awaited<ReturnType<typeof openSeededLibrary>>;

beforeEach(async () => {
  seeded = await openSeededLibrary({ count: 1000 });
});

afterEach(() => seeded.close());

describe("compactOnClient", () => {
  it("has 100 entries in the library", () => {
    expect(seeded.db.collections.resumeExperience.toArray).toHaveLength(1000);
  });
});
