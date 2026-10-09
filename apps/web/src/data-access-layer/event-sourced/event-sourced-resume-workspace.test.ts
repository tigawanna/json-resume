// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import { openTestAppDb } from "./app-test-db";
import { assembleResumeDetail } from "./assemble-resume-detail";
import { cloneResume } from "./clone-resume";
import type { AppDb } from "./collection";
import { createEventSourcedResumeWorkspace } from "./event-sourced-resume-workspace";
import { deleteWithReferences } from "./library-resolve";
import { snapshotEventSourcedResume } from "./snapshot-resume";

const ts = { createdAt: 1, updatedAt: 1 };
const lib = { userId: "u1", searchableText: "", embedding: null, embeddingModel: null, ...ts };

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

function insertResume(id: string, layout?: Partial<ResumeLayout>) {
  db.collections.resume.insert({
    ...(layout ? { layout: { ...emptyResumeLayout(), ...layout } } : {}),
    id,
    userId: "u1",
    name: id,
    fullName: "Ada",
    headline: "",
    description: "",
    jobId: null,
    templateId: "classic",
    searchableText: "",
    embedding: null,
    embeddingModel: null,
    ...ts,
  });
}

function insertExperience(id: string, bulletIds: string[]) {
  db.collections.resumeExperience.insert({
    id,
    company: id,
    role: "Engineer",
    startDate: "2020",
    endDate: "",
    location: "",
    sortOrder: 0,
    ...lib,
  });
  bulletIds.forEach((bulletId, sortOrder) => {
    db.collections.resumeExperienceBullet.insert({
      id: bulletId,
      experienceId: id,
      text: `${bulletId} text`,
      sortOrder,
      ...lib,
    });
  });
}

function workspace(resumeId: string) {
  const snapshots = snapshotEventSourcedResume(db, resumeId);
  const detail = assembleResumeDetail(resumeId, snapshots);
  if (!detail) throw new Error(`no résumé ${resumeId}`);
  return createEventSourcedResumeWorkspace(db, detail, snapshots);
}

function detailOf(resumeId: string) {
  return assembleResumeDetail(resumeId, snapshotEventSourcedResume(db, resumeId));
}

function layoutOf(resumeId: string) {
  return db.collections.resume.get(resumeId)?.layout;
}

describe("event-sourced résumé workspace (layout writes)", () => {
  it("reorders the stored layout", async () => {
    insertResume("r1", {
      experiences: [
        { id: "e1", bullets: ["b1"] },
        { id: "e2", bullets: [] },
      ],
    });
    insertExperience("e1", ["b1"]);
    insertExperience("e2", []);

    await workspace("r1").reorderExperience("e1", "e2");

    expect(layoutOf("r1")?.experiences).toEqual([
      { id: "e2", bullets: [] },
      { id: "e1", bullets: ["b1"] },
    ]);
    expect(detailOf("r1")?.experiences.map((row) => row.id)).toEqual(["e2", "e1"]);
  });

  it("stores a layout on the first edit of a résumé that has none", async () => {
    insertResume("r1");
    expect(layoutOf("r1")).toBeUndefined();
    await workspace("r1").createProject({
      name: "A",
      url: "a",
      homepageUrl: "",
      description: "",
      tech: [],
    });
    expect(layoutOf("r1")?.sections).toEqual(emptyResumeLayout().sections);
    expect(layoutOf("r1")?.projects).toHaveLength(1);
  });

  it("chained edits on one workspace see each other", async () => {
    insertResume("r1");
    const ws = workspace("r1");
    await ws.createProject({ name: "A", url: "a", homepageUrl: "", description: "", tech: [] });
    await ws.createProject({ name: "B", url: "b", homepageUrl: "", description: "", tech: [] });
    expect(detailOf("r1")?.projects.map((row) => row.name)).toEqual(["A", "B"]);
  });

  it("adds a library experience with all its bullets and picks bullets by text", async () => {
    insertResume("r1");
    insertExperience("e1", ["b1", "b2"]);
    const ws = workspace("r1");

    const { id } = await ws.createExperience({
      company: "e1",
      role: "Engineer",
      startDate: "2020",
      endDate: "",
      location: "",
    });
    expect(id).toBe("e1");
    expect(layoutOf("r1")?.experiences).toEqual([{ id: "e1", bullets: ["b1", "b2"] }]);

    await ws.updateExperienceBullets("e1", ["b2 text", "brand new"]);
    const bullets = detailOf("r1")?.experiences[0]?.bullets.map((bullet) => bullet.text);
    expect(bullets).toEqual(["b2 text", "brand new"]);
    expect(db.collections.resumeExperienceBullet.toArray).toHaveLength(3);
  });

  it("shares a skill group by name while each résumé picks its own skills", async () => {
    insertResume("r1");
    insertResume("r2");
    await workspace("r1").updateSkillGroups([
      { name: "Languages", items: ["TypeScript", "Go"] },
      { name: "languages ", items: ["Rust"] },
    ]);
    await workspace("r2").updateSkillGroups([{ name: "Languages", items: ["Go"] }]);

    expect(db.collections.resumeSkillGroup.toArray).toHaveLength(1);
    expect(db.collections.resumeSkill.toArray).toHaveLength(3);
    expect(detailOf("r1")?.skillGroups.map((g) => g.skills.map((s) => s.name))).toEqual([
      ["TypeScript", "Go", "Rust"],
    ]);
    expect(detailOf("r2")?.skillGroups.map((g) => g.skills.map((s) => s.name))).toEqual([["Go"]]);
  });

  it("replaceDocument round-trips the résumé's own document", async () => {
    insertResume("r1");
    insertExperience("e1", ["b1", "b2"]);
    const ws = workspace("r1");
    await ws.createExperience({
      company: "e1",
      role: "Engineer",
      startDate: "2020",
      endDate: "",
      location: "",
    });
    await ws.updateSkillGroups([{ name: "Tools", items: ["Vim"] }]);
    await ws.updateSummary("Hello");
    const before = detailOf("r1");
    if (!before) throw new Error("no detail");

    await workspace("r1").replaceDocument(resumeDetailToDocument(before));

    const after = detailOf("r1");
    expect(after?.experiences).toEqual(before.experiences);
    expect(after?.skillGroups).toEqual(before.skillGroups);
    expect(after?.summaries).toEqual(before.summaries);
    expect(after?.sections.map((s) => [s.key, s.enabled])).toEqual(
      before.sections.map((s) => [s.key, s.enabled]),
    );
  });

  it("deleting a library experience strips it and its bullets from every stored layout", async () => {
    insertResume("r1");
    insertResume("r2");
    insertExperience("e1", ["b1"]);
    insertExperience("e2", []);
    await workspace("r1").createExperience({
      company: "e1",
      role: "Engineer",
      startDate: "2020",
      endDate: "",
      location: "",
    });
    await workspace("r1").createExperience({
      company: "e2",
      role: "Engineer",
      startDate: "2020",
      endDate: "",
      location: "",
    });
    cloneResume(db, "r1", { name: "copy" });

    deleteWithReferences(db, "resumeExperience", "e1");

    for (const resume of db.collections.resume.toArray) {
      if (!resume.layout) continue;
      expect(resume.layout.experiences).toEqual([{ id: "e2", bullets: [] }]);
    }
    expect(db.collections.resumeExperienceBullet.toArray).toHaveLength(0);
  });

  it("saves a target job with only a description, links it, and edits it in place", async () => {
    insertResume("r1");
    const target = { description: "Build things", company: "", title: "", location: "", url: "" };

    const { id } = await workspace("r1").saveTargetJob(target);
    expect(db.collections.resume.get("r1")?.jobId).toBe(id);
    expect(detailOf("r1")?.jobDescription).toBe("Build things");

    await workspace("r1").saveTargetJob({ ...target, company: "Acme", title: "Engineer" });
    expect(db.collections.job.toArray).toHaveLength(1);
    expect(detailOf("r1")?.job).toMatchObject({ id, company: "Acme", title: "Engineer" });

    await workspace("r1").attachJob(null);
    expect(detailOf("r1")?.job).toBeNull();
    expect(db.collections.job.toArray).toHaveLength(1);
  });

  it("linking a job drops a legacy pasted description from the résumé row", async () => {
    insertResume("r1");
    db.collections.resume.update("r1", (draft) => {
      Reflect.set(draft, "jobDescription", "Old posting");
    });
    expect(detailOf("r1")?.jobDescription).toBe("Old posting");

    const { id } = await workspace("r1").saveTargetJob({
      description: "New posting",
      company: "",
      title: "",
      location: "",
      url: "",
    });
    expect(detailOf("r1")?.job?.id).toBe(id);
    expect(detailOf("r1")?.jobDescription).toBe("New posting");

    await workspace("r1").attachJob(null);
    expect(detailOf("r1")?.jobDescription).toBe("");
  });

  it("clones a résumé as one row with a copy of its layout", async () => {
    insertResume("r1", { experiences: [{ id: "e1", bullets: ["b1"] }] });
    insertExperience("e1", ["b1"]);

    const { resumeId } = cloneResume(db, "r1", { name: "copy" });

    expect(layoutOf(resumeId)?.experiences).toEqual([{ id: "e1", bullets: ["b1"] }]);
    expect(db.collections.resume.toArray).toHaveLength(2);
    expect(detailOf(resumeId)?.experiences.map((row) => row.id)).toEqual(["e1"]);
  });
});
