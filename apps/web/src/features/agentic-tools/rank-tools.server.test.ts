// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMigratedTestDatabase, stubTestServerEnv, type TestDatabase } from "@/test/test-db";

vi.mock("@tanstack/react-start/server-only", () => ({}));

let testDatabase: TestDatabase;
let tools: typeof import("./rank-tools.server");

const USER = "rank-user";
const OTHER_USER = "rank-other-user";

beforeAll(async () => {
  testDatabase = await createMigratedTestDatabase("ajr-rank-tools-");
  stubTestServerEnv(testDatabase.databaseUrl);

  const { db } = await import("@/lib/drizzle/client");
  const schema = await import("@/lib/drizzle/scheam");
  tools = await import("./rank-tools.server");

  for (const id of [USER, OTHER_USER]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  }
  await db.insert(schema.job).values([
    {
      id: "job-go",
      userId: USER,
      company: "Acme",
      title: "Go Engineer",
      description: "Build Go services on Kubernetes with Postgres.",
    },
    {
      id: "job-other",
      userId: OTHER_USER,
      company: "Acme",
      title: "Go Engineer",
      description: "Go.",
    },
  ]);
  await db.insert(schema.resume).values([
    {
      id: "r-go",
      userId: USER,
      name: "Go CV",
      fullName: "Dana",
      headline: "Go engineer, Kubernetes and Postgres",
      updatedAt: new Date(1_000),
    },
    {
      id: "r-react",
      userId: USER,
      name: "React CV",
      fullName: "Dana",
      headline: "React engineer",
      updatedAt: new Date(2_000),
    },
    {
      id: "r-foreign",
      userId: OTHER_USER,
      name: "Foreign Go CV",
      fullName: "Eve",
      headline: "Go engineer, Kubernetes and Postgres",
    },
  ]);
});

afterAll(() => {
  vi.unstubAllEnvs();
  testDatabase.cleanup();
});

describe("rankResumesForJobTool", () => {
  it("ranks the caller's résumés by coverage of a tracked job", async () => {
    const result = await tools.rankResumesForJobTool(
      { userId: USER },
      { jobId: "job-go", limit: 5 },
    );

    expect(result.jobId).toBe("job-go");
    expect(result.keywords).toContain("kubernetes");
    expect(result.results.map((row) => row.resumeId)).toEqual(["r-go", "r-react"]);
    expect(result.results[0]?.matchedTerms).toEqual(expect.arrayContaining(["go", "postgres"]));
  });

  it("ranks against pasted posting text", async () => {
    const result = await tools.rankResumesForJobTool(
      { userId: USER },
      { jobText: "React engineer needed", limit: 1 },
    );

    expect(result.jobId).toBeNull();
    expect(result.results.map((row) => row.resumeId)).toEqual(["r-react"]);
  });

  it("rejects another user's job and a missing target", async () => {
    await expect(
      tools.rankResumesForJobTool({ userId: USER }, { jobId: "job-other" }),
    ).rejects.toThrow("Job not found");
    await expect(tools.rankResumesForJobTool({ userId: USER }, {})).rejects.toThrow("Pass jobId");
  });
});
