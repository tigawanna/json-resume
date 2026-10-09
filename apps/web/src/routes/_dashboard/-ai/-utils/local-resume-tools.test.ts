// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openTestAppDb } from "@/data-access-layer/event-sourced/app-test-db";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import { getLocalResume, listLocalResumes, setLocalActiveResume } from "./local-resume-tools";

const embeddable = { searchableText: "", embedding: null, embeddingModel: null };
const lib = { userId: "u1", ...embeddable, createdAt: 1, updatedAt: 1 };

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

function context(activeResumeId = ""): LocalToolContext {
  let active = activeResumeId;
  return {
    db,
    userId: "u1",
    getActiveResumeId: () => active,
    setActiveResumeId: (resumeId) => {
      active = resumeId;
    },
    navigateToResume: () => {},
  };
}

function insertJob(id: string, fields: { company: string; title: string; description: string }) {
  db.collections.job.insert({
    id,
    userId: "u1",
    ...fields,
    url: "",
    location: "",
    status: "saved",
    notes: "",
    appliedAt: null,
    ...embeddable,
    createdAt: 1,
    updatedAt: 1,
  });
}

function insertResume(
  id: string,
  updatedAt: number,
  fields: { name?: string; jobId?: string; layout?: Partial<ResumeLayout> },
) {
  db.collections.resume.insert({
    ...(fields.layout ? { layout: { ...emptyResumeLayout(), ...fields.layout } } : {}),
    id,
    userId: "u1",
    name: fields.name ?? id,
    fullName: "Ada",
    headline: "",
    description: "",
    jobId: fields.jobId ?? null,
    templateId: "classic",
    ...embeddable,
    createdAt: 1,
    updatedAt,
  });
}

describe("listLocalResumes", () => {
  it("pages newest first and reports the next offset", async () => {
    for (let i = 1; i <= 5; i++) insertResume(`r${i}`, i, {});

    const first = await listLocalResumes(context(), { limit: 2 });
    expect(first.resumes.map((r) => r.id)).toEqual(["r5", "r4"]);
    expect(first.total).toBe(5);
    expect(first.nextOffset).toBe(2);

    const last = await listLocalResumes(context(), { limit: 2, offset: 4 });
    expect(last.resumes.map((r) => r.id)).toEqual(["r1"]);
    expect(last.nextOffset).toBeNull();
  });

  it("requires every keyword to match a résumé or linked job field", async () => {
    insertJob("j1", {
      company: "Acme",
      title: "Senior Backend Engineer",
      description: "Go, remote",
    });
    insertResume("go-remote", 3, { name: "Backend", jobId: "j1" });
    insertResume("go-only", 2, { name: "Go tooling" });
    insertResume("other", 1, { name: "Designer" });

    const result = await listLocalResumes(context(), { keyword: "go remote" });
    expect(result.total).toBe(1);
    expect(result.resumes).toEqual([
      expect.objectContaining({
        id: "go-remote",
        jobId: "j1",
        jobLabel: "Acme — Senior Backend Engineer",
      }),
    ]);
  });

  it("returns résumés without a job and empty results", async () => {
    insertResume("solo", 1, { name: "Solo" });

    const solo = await listLocalResumes(context(), { keyword: "solo" });
    expect(solo.resumes).toEqual([
      expect.objectContaining({ id: "solo", jobId: null, jobLabel: "" }),
    ]);

    const none = await listLocalResumes(context(), { keyword: "nothing-matches" });
    expect(none).toEqual({ resumes: [], total: 0, nextOffset: null });
  });
});

describe("getLocalResume", () => {
  function seedTailoredResume() {
    insertJob("j1", {
      company: "Acme",
      title: "Backend Engineer",
      description: "Build Go services",
    });
    db.collections.resumeSummary.insert({
      id: "s1",
      text: "Backend engineer",
      sortOrder: 0,
      ...lib,
    });
    db.collections.resumeExperience.insert({
      id: "exp1",
      company: "Initech",
      role: "Engineer",
      startDate: "2020",
      endDate: "",
      location: "",
      sortOrder: 0,
      ...lib,
    });
    db.collections.resumeExperienceBullet.insert({
      id: "b1",
      experienceId: "exp1",
      text: "Shipped billing",
      sortOrder: 0,
      ...lib,
    });
    const sections = emptyResumeLayout().sections.map((section) =>
      section.key === "talks" ? { ...section, enabled: false } : section,
    );
    insertResume("cv", 1, {
      name: "Backend CV",
      jobId: "j1",
      layout: { sections, summaries: ["s1"], experiences: [{ id: "exp1", bullets: ["b1"] }] },
    });
  }

  it("reads the active résumé with item ids and the linked job", () => {
    seedTailoredResume();

    const { resume } = getLocalResume(context("cv"), {});

    expect(resume).toMatchObject({
      id: "cv",
      name: "Backend CV",
      hiddenSections: ["talks"],
      job: { id: "j1", company: "Acme", description: "Build Go services" },
      summary: [{ id: "s1", text: "Backend engineer" }],
      experience: [
        { id: "exp1", company: "Initech", bullets: [{ id: "b1", text: "Shipped billing" }] },
      ],
    });
  });

  it("returns only the requested sections and leaves out the job text unless asked", () => {
    seedTailoredResume();

    const { resume } = getLocalResume(context("cv"), { sections: ["summary"] });

    expect(resume.summary).toHaveLength(1);
    expect(resume.experience).toBeUndefined();
    expect(resume.header).toBeUndefined();
    expect(resume.job).toEqual(expect.objectContaining({ id: "j1" }));
    expect(resume.job?.description).toBeUndefined();
  });

  it("follows set_active_resume and rejects unknown ids", () => {
    seedTailoredResume();
    insertResume("other", 2, { name: "Other CV" });
    const ctx = context("cv");

    expect(setLocalActiveResume(ctx, { resumeId: "other" })).toEqual({
      resumeId: "other",
      name: "Other CV",
    });
    expect(getLocalResume(ctx, {}).resume.id).toBe("other");
    expect(getLocalResume(ctx, { resumeId: "cv" }).resume.id).toBe("cv");

    expect(() => setLocalActiveResume(ctx, { resumeId: "missing" })).toThrow(/list_resumes/);
    expect(ctx.getActiveResumeId()).toBe("other");
  });
});
