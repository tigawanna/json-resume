// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDefaultResume } from "@/features/resume/resume-schema";
import { useLocalToolDb } from "./local-tool-fixtures";
import {
  cloneLocalResume,
  createLocalResume,
  openLocalResume,
  rankLocalResumesForJob,
  tailorLocalResumeForJob,
} from "./local-resume-lifecycle-tools";
import { getLocalResume } from "./local-resume-tools";

const fixture = useLocalToolDb();
const { context, insertExperience, insertJob, insertResume } = fixture;

function seed() {
  insertJob("go", {
    company: "Acme",
    title: "Go Engineer",
    description: "Build Go services for billing on Kubernetes.",
  });
  insertExperience("exp1", "Initech", [{ id: "b1", text: "Shipped billing services in Go" }]);
  insertResume("cv", 1, {
    name: "CV",
    headline: "Go engineer",
    layout: { experiences: [{ id: "exp1", bullets: ["b1"] }] },
  });
  insertResume("other", 2, { name: "Other", headline: "Designer" });
}

describe("clone_resume", () => {
  it("copies the active résumé, shares its library items and makes the copy active", () => {
    seed();
    const ctx = context("cv");

    const result = cloneLocalResume(ctx, { name: "CV copy", jobId: "go" });

    expect(result).toMatchObject({
      sourceResumeId: "cv",
      name: "CV copy",
      jobId: "go",
      active: true,
    });
    expect(ctx.getActiveResumeId()).toBe(result.resumeId);
    const copy = getLocalResume(ctx, { sections: ["experience"] }).resume;
    expect(copy.experience?.map((item) => item.id)).toEqual(["exp1"]);
  });

  it("keeps the active résumé when makeActive is false", () => {
    seed();
    const ctx = context("cv");

    const result = cloneLocalResume(ctx, { sourceResumeId: "other", makeActive: false });

    expect(result.active).toBe(false);
    expect(ctx.getActiveResumeId()).toBe("cv");
  });
});

describe("create_resume", () => {
  it("creates a blank résumé targeting a job", async () => {
    seed();
    const ctx = context("cv");

    const result = await createLocalResume(ctx, { name: "Fresh", jobId: "go" });

    expect(result).toMatchObject({ name: "Fresh", active: true });
    expect(ctx.getActiveResumeId()).toBe(result.resumeId);
    expect(fixture.db().collections.resume.get(result.resumeId)?.jobId).toBe("go");
  });

  it("imports a complete document", async () => {
    seed();
    const ctx = context("cv");
    const document = createDefaultResume();

    const result = await createLocalResume(ctx, { name: "Imported", document });

    const resume = getLocalResume(ctx, { resumeId: result.resumeId }).resume;
    expect(resume.experience?.length).toBe(document.experience.items.length);
  });

  it("rejects an unknown job", async () => {
    seed();

    await expect(createLocalResume(context("cv"), { name: "X", jobId: "nope" })).rejects.toThrow();
  });
});

describe("open_resume", () => {
  it("queues the active résumé on the AI tab by default", () => {
    seed();
    const ctx = context("cv");

    const result = openLocalResume(ctx, {});

    expect(result).toEqual({ resumeId: "cv", tab: "ai", opensAfterReply: true });
    expect(ctx.opened).toEqual(["cv:ai"]);
  });

  it("rejects an unknown résumé", () => {
    seed();

    expect(() => openLocalResume(context("cv"), { resumeId: "nope" })).toThrow("list_resumes");
  });
});

describe("rank_resumes_for_job", () => {
  it("ranks against the job given by id", () => {
    seed();

    const result = rankLocalResumesForJob(context("other"), { jobId: "go" });

    expect(result.jobId).toBe("go");
    expect(result.results.map((row) => row.resumeId)).toEqual(["cv", "other"]);
    expect(result.results[0]?.matchedTerms).toEqual(expect.arrayContaining(["go", "billing"]));
  });

  it("falls back to the active résumé's job, and accepts pasted text", () => {
    seed();
    fixture.db().collections.resume.update("other", (draft) => {
      draft.jobId = "go";
    });

    expect(rankLocalResumesForJob(context("other"), {}).jobId).toBe("go");
    expect(
      rankLocalResumesForJob(context("cv"), { jobText: "Designer", limit: 1 }).results[0]?.resumeId,
    ).toBe("other");
  });

  it("needs a job when the active résumé has none", () => {
    seed();

    expect(() => rankLocalResumesForJob(context("cv"), {})).toThrow("Pass jobId or jobText");
  });
});

describe("tailor_resume_for_job", () => {
  it("copies the best match, points it at the job and makes it active", () => {
    seed();
    const ctx = context("other");

    const result = tailorLocalResumeForJob(ctx, { jobId: "go" });

    expect(result).toMatchObject({ jobId: "go", baseResumeId: "cv" });
    expect(result.name).toContain("CV for");
    expect(result.missingTerms).toContain("kubernetes");
    expect(result.resume.experience?.map((item) => item.id)).toEqual(["exp1"]);
    expect(ctx.getActiveResumeId()).toBe(result.resumeId);
    expect(fixture.db().collections.resume.get(result.resumeId)?.jobId).toBe("go");
  });

  it("starts from the base résumé when one is given", () => {
    seed();

    const result = tailorLocalResumeForJob(context("cv"), {
      jobId: "go",
      baseResumeId: "other",
      name: "Other for Acme",
    });

    expect(result).toMatchObject({ baseResumeId: "other", name: "Other for Acme" });
  });
});
