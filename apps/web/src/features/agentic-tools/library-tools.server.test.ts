// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import { createMigratedTestDatabase, stubTestServerEnv, type TestDatabase } from "@/test/test-db";

vi.mock("@tanstack/react-start/server-only", () => ({}));

let testDatabase: TestDatabase;
let tools: typeof import("./library-tools.server");

const USER = "library-user";
const OTHER_USER = "library-other-user";

beforeAll(async () => {
  testDatabase = await createMigratedTestDatabase("ajr-library-tools-");
  stubTestServerEnv(testDatabase.databaseUrl);

  const { db } = await import("@/lib/drizzle/client");
  const schema = await import("@/lib/drizzle/scheam");
  tools = await import("./library-tools.server");

  for (const id of [USER, OTHER_USER]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  }
  await db.insert(schema.resumeExperience).values([
    { id: "exp1", userId: USER, company: "Initech", role: "Engineer" },
    { id: "exp-other", userId: OTHER_USER, company: "Initech", role: "Engineer" },
  ]);
  await db.insert(schema.resumeExperienceBullet).values([
    { id: "b1", experienceId: "exp1", text: "Shipped billing in Go", updatedAt: new Date(1_000) },
    {
      id: "b2",
      experienceId: "exp1",
      text: "Led Kubernetes migration",
      updatedAt: new Date(2_000),
    },
    { id: "b-other", experienceId: "exp-other", text: "Led Kubernetes migration" },
  ]);
  await db.insert(schema.job).values({
    id: "job-platform",
    userId: USER,
    company: "Acme",
    title: "Platform Engineer",
    description: "Kubernetes and Go.",
  });
  await db.insert(schema.resume).values({
    id: "cv",
    userId: USER,
    name: "CV",
    fullName: "Dana",
    jobId: "job-platform",
    layout: { ...emptyResumeLayout(), experiences: [{ id: "exp1", bullets: ["b1"] }] },
  });
});

afterAll(() => {
  vi.unstubAllEnvs();
  testDatabase.cleanup();
});

describe("searchLibraryTool", () => {
  it("searches only the caller's rows, newest first", async () => {
    const result = await tools.searchLibraryTool(
      { userId: USER },
      { section: "experience_bullet" },
    );

    expect(result.items.map((item) => item.id)).toEqual(["b2", "b1"]);
    expect(result).toMatchObject({ resumeId: null, total: 2, nextOffset: null });
    expect(result.items[0]).toMatchObject({ detail: "Engineer at Initech", experienceId: "exp1" });
  });

  it("flags and can skip rows the named résumé shows", async () => {
    const flagged = await tools.searchLibraryTool(
      { userId: USER },
      { section: "experience_bullet", resumeId: "cv", keyword: "billing" },
    );
    expect(flagged.items).toMatchObject([{ id: "b1", onResume: true }]);

    const missing = await tools.searchLibraryTool(
      { userId: USER },
      { section: "experience_bullet", resumeId: "cv", notOnResume: true },
    );
    expect(missing.items.map((item) => item.id)).toEqual(["b2"]);
  });

  it("never reads another user's résumé", async () => {
    await expect(
      tools.searchLibraryTool({ userId: OTHER_USER }, { section: "summary", resumeId: "cv" }),
    ).rejects.toThrow("Resume not found");
  });
});

describe("rankLibraryForJobTool", () => {
  it("ranks rows the résumé does not show against the résumé's job", async () => {
    const result = await tools.rankLibraryForJobTool(
      { userId: USER },
      { resumeId: "cv", sections: ["experience_bullet"] },
    );

    expect(result.jobId).toBe("job-platform");
    expect(result.results.map((item) => item.id)).toEqual(["b2"]);
    expect(result.results[0]?.matchedTerms).toContain("kubernetes");
  });

  it("needs a job when no résumé points at one", async () => {
    await expect(tools.rankLibraryForJobTool({ userId: USER }, {})).rejects.toThrow("Pass jobId");
  });
});
