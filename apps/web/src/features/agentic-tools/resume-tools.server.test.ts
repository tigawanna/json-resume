// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMigratedTestDatabase, stubTestServerEnv, type TestDatabase } from "@/test/test-db";

vi.mock("@tanstack/react-start/server-only", () => ({}));

let testDatabase: TestDatabase;
let db: typeof import("@/lib/drizzle/client").db;
let schema: typeof import("@/lib/drizzle/scheam");
let tools: typeof import("./resume-tools.server");

const USER = "tools-user";
const OTHER_USER = "tools-other-user";

beforeAll(async () => {
  testDatabase = await createMigratedTestDatabase("ajr-tools-");
  stubTestServerEnv(testDatabase.databaseUrl);

  db = (await import("@/lib/drizzle/client")).db;
  schema = await import("@/lib/drizzle/scheam");
  tools = await import("./resume-tools.server");

  for (const id of [USER, OTHER_USER]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  }

  await db.insert(schema.job).values({
    id: "job-acme",
    userId: USER,
    company: "Acme",
    title: "Senior Backend Engineer",
    description: "Build Go services. Remote within the EU.",
  });

  const resumes = [
    { id: "r1", name: "Frontend CV", headline: "React engineer", jobId: null, at: 1_000 },
    { id: "r2", name: "Backend CV", headline: "Go engineer", jobId: "job-acme", at: 2_000 },
    { id: "r3", name: "Data CV", headline: "Python engineer", jobId: null, at: 3_000 },
  ];
  for (const row of resumes) {
    await db.insert(schema.resume).values({
      id: row.id,
      userId: USER,
      name: row.name,
      fullName: "Dana Doe",
      headline: row.headline,
      jobId: row.jobId,
      updatedAt: new Date(row.at),
    });
  }
  await db.insert(schema.resume).values({
    id: "other-r1",
    userId: OTHER_USER,
    name: "Backend CV",
    fullName: "Someone Else",
    headline: "Go engineer",
  });
});

afterAll(() => {
  vi.unstubAllEnvs();
  testDatabase.cleanup();
});

describe("listResumesTool", () => {
  it("lists the user's resumes newest first with paging metadata", async () => {
    const result = await tools.listResumesTool({ userId: USER }, {});

    expect(result.resumes.map((row) => row.id)).toEqual(["r3", "r2", "r1"]);
    expect(result.total).toBe(3);
    expect(result.nextOffset).toBeNull();
  });

  it("pages with offset and reports the next offset", async () => {
    const first = await tools.listResumesTool({ userId: USER }, { limit: 2 });
    expect(first.resumes.map((row) => row.id)).toEqual(["r3", "r2"]);
    expect(first).toMatchObject({ total: 3, nextOffset: 2 });

    const second = await tools.listResumesTool({ userId: USER }, { limit: 2, offset: 2 });
    expect(second.resumes.map((row) => row.id)).toEqual(["r1"]);
    expect(second).toMatchObject({ total: 3, nextOffset: null });
  });

  it("requires every keyword, matching across resume and job fields", async () => {
    const result = await tools.listResumesTool({ userId: USER }, { keyword: "go remote" });

    expect(result.resumes.map((row) => row.id)).toEqual(["r2"]);
    expect(result.total).toBe(1);
    expect((await tools.listResumesTool({ userId: USER }, { keyword: "react remote" })).total).toBe(
      0,
    );
  });

  it("labels the linked job", async () => {
    const result = await tools.listResumesTool({ userId: USER }, { keyword: "backend" });
    const row = result.resumes.find((item) => item.id === "r2");

    expect(row).toMatchObject({ jobId: "job-acme", jobLabel: "Acme — Senior Backend Engineer" });
    expect(result.resumes.find((item) => item.id === "r1")).toBeUndefined();
  });

  it("never returns another user's resumes", async () => {
    const result = await tools.listResumesTool({ userId: USER }, { keyword: "backend" });

    expect(result.resumes.map((row) => row.id)).not.toContain("other-r1");
  });
});

describe("getResumeTool", () => {
  it("returns the shared view with the linked job", async () => {
    const { resume } = await tools.getResumeTool({ userId: USER }, { resumeId: "r2" });

    expect(resume).toMatchObject({
      id: "r2",
      name: "Backend CV",
      job: { id: "job-acme", company: "Acme", description: expect.stringContaining("Go") },
      header: { fullName: "Dana Doe", headline: "Go engineer" },
    });
  });

  it("limits the payload to the requested sections", async () => {
    const { resume } = await tools.getResumeTool(
      { userId: USER },
      { resumeId: "r2", sections: ["summary"] },
    );

    expect(resume.header).toBeUndefined();
    expect(resume.summary).toEqual([]);
    expect(resume.job?.description).toBeUndefined();
  });

  it("requires a resumeId and never reads another user's resume", async () => {
    await expect(tools.getResumeTool({ userId: USER }, {})).rejects.toThrow(/list_resumes/);
    await expect(tools.getResumeTool({ userId: USER }, { resumeId: "other-r1" })).rejects.toThrow(
      "Resume not found",
    );
  });
});
