// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useLocalToolDb } from "./local-tool-fixtures";
import {
  attachLocalJob,
  getLocalJob,
  listLocalJobs,
  saveLocalJob,
  updateLocalJob,
} from "./local-job-tools";

const fixture = useLocalToolDb();
const { context, insertJob, insertResume } = fixture;

function seed() {
  insertJob("acme", {
    company: "Acme",
    title: "Backend Engineer",
    description: "Build Go services.\nRemote.",
    status: "applied",
    updatedAt: 1,
  });
  insertJob("globex", {
    company: "Globex",
    title: "Frontend Engineer",
    description: "React and TypeScript.",
    updatedAt: 2,
  });
  insertResume("cv", 1, { name: "CV", jobId: "acme" });
  insertResume("other", 2, { name: "Other" });
}

describe("save_job", () => {
  it("saves without attaching unless attachToResumeId is given", async () => {
    seed();

    const saved = await saveLocalJob(context("other"), {
      description: "Platform role at Initech.",
      company: "Initech",
    });

    expect(saved).toMatchObject({ created: true, attachedToResumeId: null });
    expect(saved.job.linkedResumeIds).toEqual([]);
    expect(fixture.db().collections.resume.get("other")?.jobId).toBeNull();
  });

  it("updates the job with the same posting text instead of duplicating it", async () => {
    seed();

    const saved = await saveLocalJob(context("other"), {
      description: "  Build Go services. Remote. ",
      notes: "Recruiter reached out",
      attachToResumeId: "other",
    });

    expect(saved.created).toBe(false);
    expect(saved.job).toMatchObject({
      id: "acme",
      company: "Acme",
      notes: "Recruiter reached out",
    });
    expect(saved.job.linkedResumeIds.sort()).toEqual(["cv", "other"]);
    expect(fixture.db().collections.job.size).toBe(2);
  });

  it("rejects an unknown résumé before writing anything", async () => {
    seed();

    await expect(
      saveLocalJob(context("cv"), { description: "New role", attachToResumeId: "nope" }),
    ).rejects.toThrow(/list_resumes/);
    expect(fixture.db().collections.job.size).toBe(2);
  });
});

describe("update_job", () => {
  it("changes only the fields passed", async () => {
    seed();

    const { job } = await updateLocalJob(context("cv"), {
      jobId: "globex",
      status: "interviewing",
    });

    expect(job).toMatchObject({ status: "interviewing", company: "Globex" });
  });
});

describe("get_job", () => {
  it("reads the active résumé's job when no id is given", async () => {
    seed();

    const { job } = await getLocalJob(context("cv"), {});

    expect(job).toMatchObject({ id: "acme", linkedResumeIds: ["cv"] });
    expect(job.description).toContain("Build Go services.");
  });

  it("explains when the résumé has no job", async () => {
    seed();

    await expect(getLocalJob(context("other"), {})).rejects.toThrow(/save_job/);
  });
});

describe("list_jobs", () => {
  it("pages newest first and filters by keyword and status", async () => {
    seed();

    const page = await listLocalJobs(context("cv"), { limit: 1 });
    expect(page.jobs.map((job) => job.id)).toEqual(["globex"]);
    expect(page).toMatchObject({ total: 2, nextOffset: 1 });

    expect(
      (await listLocalJobs(context("cv"), { keyword: "go remote" })).jobs.map((job) => job.id),
    ).toEqual(["acme"]);
    expect(
      (await listLocalJobs(context("cv"), { status: "applied" })).jobs.map((job) => job.id),
    ).toEqual(["acme"]);
  });
});

describe("attach_job", () => {
  it("attaches, then detaches with null", async () => {
    seed();

    const attached = await attachLocalJob(context("other"), { jobId: "globex" });
    expect(attached.job?.linkedResumeIds).toEqual(["other"]);

    const detached = await attachLocalJob(context("other"), { jobId: null });
    expect(detached).toEqual({ resumeId: "other", job: null });
    expect(fixture.db().collections.resume.get("other")?.jobId).toBeNull();
  });

  it("validates the job before touching the résumé", async () => {
    seed();

    await expect(attachLocalJob(context("cv"), { jobId: "nope" })).rejects.toThrow(/list_jobs/);
    expect(fixture.db().collections.resume.get("cv")?.jobId).toBe("acme");
  });
});
