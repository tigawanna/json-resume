// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { openTestAppDb } from "@/data-access-layer/event-sourced/testing/app-test-db";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import {
  deleteExperienceBullet,
  listExperienceBullets,
  listExperienceTitles,
  moveExperienceBullet,
  setExperienceTitleBullets,
  updateExperienceBullet,
  type ExperienceToolContext,
} from "./experience-ai-tools";

const embeddable = { searchableText: "", embedding: null, embeddingModel: null };
const lib = { userId: "u1", ...embeddable, createdAt: 1, updatedAt: 1 };

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

/** The open group: two titles of the same company and period. */
const GROUP_IDS = ["exp1", "exp2"];

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
  seed();
});

afterEach(() => handle.close());

function context(): ExperienceToolContext {
  return { db, userId: "u1", getGroupTitleIds: () => GROUP_IDS };
}

function seed() {
  db.collections.resumeExperience.insert({
    id: "exp1",
    company: "Acme",
    role: "Engineer",
    startDate: "2020",
    endDate: "2022",
    location: "Remote",
    sortOrder: 0,
    ...lib,
  });
  db.collections.resumeExperience.insert({
    id: "exp2",
    company: "Acme",
    role: "Lead",
    startDate: "2020",
    endDate: "2022",
    location: "Remote",
    sortOrder: 1,
    ...lib,
  });
  db.collections.resumeExperienceBullet.insert({
    id: "b1",
    experienceId: "exp1",
    text: "Shipped billing",
    sortOrder: 0,
    ...lib,
  });
  db.collections.resumeExperienceBullet.insert({
    id: "b2",
    experienceId: "exp1",
    text: "Cut costs",
    sortOrder: 1,
    ...lib,
  });
  db.collections.resume.insert({
    id: "cv",
    userId: "u1",
    name: "CV",
    fullName: "Ada",
    headline: "",
    description: "",
    jobId: null,
    templateId: "classic",
    layout: { ...emptyResumeLayout(), experiences: [{ id: "exp1", bullets: ["b1", "b2"] }] },
    ...embeddable,
    createdAt: 1,
    updatedAt: 1,
  });
}

describe("list_experience_titles", () => {
  it("returns only the group's titles with bullet counts", () => {
    const result = listExperienceTitles(context(), {});

    expect(result.titles.map((title) => title.id)).toEqual(["exp1", "exp2"]);
    expect(result.titles[0]).toMatchObject({ role: "Engineer", bulletCount: 2 });
    expect(result.titles[1]).toMatchObject({ role: "Lead", bulletCount: 0 });
  });
});

describe("list_experience_bullets", () => {
  it("lists one title's bullets in order", () => {
    const result = listExperienceBullets(context(), { experienceId: "exp1" });

    expect(result.role).toBe("Engineer");
    expect(result.bullets.map((bullet) => bullet.id)).toEqual(["b1", "b2"]);
  });

  it("rejects a title outside the group", () => {
    db.collections.resumeExperience.insert({
      id: "other",
      company: "Elsewhere",
      role: "Dev",
      startDate: "2019",
      endDate: "2019",
      location: "",
      sortOrder: 2,
      ...lib,
    });

    expect(() => listExperienceBullets(context(), { experienceId: "other" })).toThrow(
      /outside this company and period/,
    );
  });
});

describe("update_experience_bullet", () => {
  it("rewrites wording in place and keeps the id", () => {
    const result = updateExperienceBullet(context(), {
      bulletId: "b1",
      text: "  Shipped billing end-to-end  ",
    });

    expect(result).toEqual({ bulletId: "b1", text: "Shipped billing end-to-end" });
    expect(db.collections.resumeExperienceBullet.get("b1")?.text).toBe(
      "Shipped billing end-to-end",
    );
  });

  it("rejects bullets outside the group", () => {
    db.collections.resumeExperienceBullet.insert({
      id: "b-foreign",
      experienceId: "other",
      text: "Not yours",
      sortOrder: 0,
      ...lib,
    });

    expect(() => updateExperienceBullet(context(), { bulletId: "b-foreign", text: "x" })).toThrow(
      /outside this company and period/,
    );
  });
});

describe("move_experience_bullet", () => {
  it("reassigns a bullet to the other title and appends it", () => {
    const result = moveExperienceBullet(context(), { bulletId: "b1", toExperienceId: "exp2" });

    expect(result).toEqual({ bulletId: "b1", experienceId: "exp2" });
    const moved = db.collections.resumeExperienceBullet.get("b1");
    expect(moved?.experienceId).toBe("exp2");
    expect(moved?.sortOrder).toBe(0);
    expect(listExperienceBullets(context(), { experienceId: "exp1" }).bullets).toHaveLength(1);
  });
});

describe("delete_experience_bullet", () => {
  it("removes the bullet and strips it from resume layouts", () => {
    const result = deleteExperienceBullet(context(), { bulletId: "b1" });

    expect(result).toEqual({ bulletId: "b1", deleted: true });
    expect(db.collections.resumeExperienceBullet.get("b1")).toBeUndefined();
    expect(db.collections.resume.get("cv")?.layout?.experiences?.[0]?.bullets).toEqual(["b2"]);
  });
});

describe("set_experience_title_bullets", () => {
  it("keeps ids whose wording survives, reuses slots, and inserts what is missing", () => {
    const result = setExperienceTitleBullets(context(), {
      experienceId: "exp1",
      texts: ["Cut costs", "Led migration", "Mentored juniors"],
    });

    const bullets = listExperienceBullets(context(), { experienceId: "exp1" }).bullets;
    expect(bullets.map((bullet) => bullet.text)).toEqual([
      "Cut costs",
      "Led migration",
      "Mentored juniors",
    ]);
    // "Cut costs" keeps its id; the freed first slot is reused for new wording.
    expect(bullets[0]?.id).toBe("b2");
    expect(bullets[1]?.id).toBe("b1");
    expect(result.bulletIds).toEqual([bullets[0]?.id, bullets[1]?.id, bullets[2]?.id]);
    // Nothing was deleted, so the layout keeps both original ids.
    expect(db.collections.resume.get("cv")?.layout?.experiences?.[0]?.bullets).toEqual([
      "b1",
      "b2",
    ]);
  });

  it("deletes bullets the new list no longer needs and updates layouts", () => {
    setExperienceTitleBullets(context(), { experienceId: "exp1", texts: ["Led migration"] });

    const bullets = listExperienceBullets(context(), { experienceId: "exp1" }).bullets;
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toMatchObject({ id: "b1", text: "Led migration" });
    expect(db.collections.resumeExperienceBullet.get("b2")).toBeUndefined();
    expect(db.collections.resume.get("cv")?.layout?.experiences?.[0]?.bullets).toEqual(["b1"]);
  });

  it("clears every bullet when the list is empty", () => {
    const result = setExperienceTitleBullets(context(), { experienceId: "exp1", texts: [] });

    expect(result).toEqual({ experienceId: "exp1", bulletIds: [] });
    expect(listExperienceBullets(context(), { experienceId: "exp1" }).bullets).toEqual([]);
    expect(db.collections.resume.get("cv")?.layout?.experiences?.[0]?.bullets).toEqual([]);
  });
});
