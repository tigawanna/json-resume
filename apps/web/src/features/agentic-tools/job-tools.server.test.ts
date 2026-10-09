// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMigratedTestDatabase, stubTestServerEnv, type TestDatabase } from "@/test/test-db";

vi.mock("@tanstack/react-start/server-only", () => ({}));

let testDatabase: TestDatabase;
let tools: typeof import("./job-tools.server");

const USER = "jobs-user";
const OTHER_USER = "jobs-other-user";

beforeAll(async () => {
  testDatabase = await createMigratedTestDatabase("ajr-job-tools-");
  stubTestServerEnv(testDatabase.databaseUrl);

  const { db } = await import("@/lib/drizzle/client");
  const schema = await import("@/lib/drizzle/scheam");
  tools = await import("./job-tools.server");

  for (const id of [USER, OTHER_USER]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  }
  await db.insert(schema.job).values([
    {
      id: "job-acme",
      userId: USER,
      company: "Acme",
      title: "Backend Engineer",
      description: "Build Go services. Remote.",
      status: "applied",
      updatedAt: new Date(1_000),
    },
    {
      id: "job-globex",
      userId: USER,
      company: "Globex",
      title: "Frontend Engineer",
      description: "React and TypeScript.",
      updatedAt: new Date(2_000),
    },
    {
      id: "job-other",
      userId: OTHER_USER,
      company: "Acme",
      title: "Backend Engineer",
      description: "Build Go services. Remote.",
    },
  ]);
  await db.insert(schema.resume).values([
    { id: "r1", userId: USER, name: "Backend CV", fullName: "Dana", jobId: "job-acme" },
    { id: "r2", userId: USER, name: "Go CV", fullName: "Dana", jobId: "job-acme" },
  ]);
});

afterAll(() => {
  vi.unstubAllEnvs();
  testDatabase.cleanup();
});

describe("listJobsTool", () => {
  it("lists only the user's jobs, newest first, with linked résumés", async () => {
    const result = await tools.listJobsTool({ userId: USER }, {});

    expect(result.jobs.map((job) => job.id)).toEqual(["job-globex", "job-acme"]);
    expect(result.jobs[1]?.linkedResumeIds.sort()).toEqual(["r1", "r2"]);
    expect(result).toMatchObject({ total: 2, nextOffset: null });
  });

  it("filters by every keyword and by status", async () => {
    const byKeyword = await tools.listJobsTool({ userId: USER }, { keyword: "go remote" });
    const byStatus = await tools.listJobsTool({ userId: USER }, { status: "applied" });

    expect(byKeyword.jobs.map((job) => job.id)).toEqual(["job-acme"]);
    expect(byStatus.jobs.map((job) => job.id)).toEqual(["job-acme"]);
  });
});

describe("getJobTool", () => {
  it("reads a job by id or through the résumé that targets it", async () => {
    const byId = await tools.getJobTool({ userId: USER }, { jobId: "job-globex" });
    const byResume = await tools.getJobTool({ userId: USER }, { resumeId: "r1" });

    expect(byId.job.description).toBe("React and TypeScript.");
    expect(byResume.job).toMatchObject({ id: "job-acme", status: "applied" });
  });

  it("never returns another user's job and needs an id", async () => {
    await expect(tools.getJobTool({ userId: USER }, { jobId: "job-other" })).rejects.toThrow(
      "Job not found",
    );
    await expect(tools.getJobTool({ userId: USER }, {})).rejects.toThrow(/jobId/);
  });
});
