// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openTestAppDb } from "@/data-access-layer/event-sourced/app-test-db";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { listLocalResumes, type EventSourcedResumeAiContext } from "./local-resume-tools";

const embeddable = { searchableText: "", embedding: null, embeddingModel: null };

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

function context(): EventSourcedResumeAiContext {
  return { db, resumeId: "", userId: "u1", navigateToResume: () => {} };
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

function insertResume(id: string, updatedAt: number, fields: { name?: string; jobId?: string }) {
  db.collections.resume.insert({
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
