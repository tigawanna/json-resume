// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { openTestAppDb } from "@/data-access-layer/event-sourced/testing/app-test-db";
import {
  SEED_RESUME_ID,
  seedLibrary,
} from "@/data-access-layer/event-sourced/testing/seed-library";
import { libraryKeys, type LibraryCollectionId } from "@/modules/library/library-keys";

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

describe("seedLibrary", () => {
  it("bulk-inserts 1000 experiences", () => {
    seedLibrary(db, { include: ["resumeExperience"], count: 1000 });
    expect(db.collections.resumeExperience.toArray).toHaveLength(1000);
    expect(db.collections.resumeExperience.get("resumeExperience-0")?.company).toBe("Company 0");
    expect(db.collections.resumeExperience.get("resumeExperience-999")?.company).toBe(
      "Company 999",
    );
    expect(db.collections.resumeExperienceBullet.toArray).toHaveLength(1000);
    expect(
      db.collections.resumeExperienceBullet.get("resumeExperienceBullet-0-0")?.experienceId,
    ).toBe("resumeExperience-0");
    expect(db.collections.resume.get("resume-seed")?.layout?.experiences[0]).toEqual({
      id: "resumeExperience-0",
      bullets: ["resumeExperienceBullet-0-0"],
    });
  });

  it("seeds every library collection when no list is given", () => {
    seedLibrary(db, { count: 2 });
    for (const id of Object.keys(libraryKeys) as LibraryCollectionId[]) {
      expect(db.collections[id].toArray).toHaveLength(2);
    }
  });

  it("skips excluded collections", () => {
    seedLibrary(db, { include: ["resumeExperience", "resumeSkill"], exclude: ["resumeSkill"] });
    expect(db.collections.resumeExperience.toArray).toHaveLength(1);
    expect(db.collections.resumeSkill.toArray).toHaveLength(0);
    expect(db.collections.resumeExperienceBullet.toArray).toHaveLength(1);
  });

  it("omits bullets when they are excluded", () => {
    seedLibrary(db, { include: ["resumeExperience"], exclude: ["resumeExperienceBullet"] });
    expect(db.collections.resumeExperienceBullet.toArray).toHaveLength(0);
    expect(db.collections.resume.get(SEED_RESUME_ID)?.layout?.experiences[0]?.bullets).toEqual([]);
  });

  it("nests the bullet under the experience the résumé layout points at", () => {
    seedLibrary(db, { include: ["resumeExperience"], count: 1 });
    const experience = db.collections.resumeExperience.get("resumeExperience-0");
    const bullet = db.collections.resumeExperienceBullet.get("resumeExperienceBullet-0-0");
    const layout = db.collections.resume.get(SEED_RESUME_ID)?.layout?.experiences[0];
    expect(experience?.id).toBe("resumeExperience-0");
    expect(bullet?.experienceId).toBe(experience?.id);
    expect(layout).toEqual({
      id: experience?.id,
      bullets: [bullet?.id],
    });
  });
});
