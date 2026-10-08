// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import { createMigratedTestDatabase, stubTestServerEnv, type TestDatabase } from "@/test/test-db";

let testDatabase: TestDatabase;
let db: typeof import("@/lib/drizzle/client").db;
let schema: typeof import("@/lib/drizzle/scheam");
let resumeDal: typeof import("./resume.server");

async function createUser(input: { id: string; email: string; role?: string }): Promise<void> {
  await db.insert(schema.user).values({
    id: input.id,
    name: input.id,
    email: input.email,
    role: input.role,
  });
}

async function createResume(input: {
  id: string;
  userId: string;
  name: string;
  layout?: ResumeLayout;
}): Promise<void> {
  await db.insert(schema.resume).values({
    id: input.id,
    userId: input.userId,
    name: input.name,
    fullName: input.name,
    layout: input.layout,
  });
}

beforeAll(async () => {
  testDatabase = await createMigratedTestDatabase("ajr-dal-");
  stubTestServerEnv(testDatabase.databaseUrl);

  const dbModule = await import("@/lib/drizzle/client");
  const schemaModule = await import("@/lib/drizzle/scheam");
  const resumeDalModule = await import("./resume.server");

  db = dbModule.db;
  schema = schemaModule;
  resumeDal = resumeDalModule;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  testDatabase.cleanup();
});

describe("resume data access ownership", () => {
  it("does not list another user's resume even when the id is supplied", async () => {
    await createUser({ id: "list-user-a", email: "list-a@example.com" });
    await createUser({ id: "list-user-b", email: "list-b@example.com" });
    await createResume({ id: "list-resume-a", userId: "list-user-a", name: "Alice Resume" });
    await createResume({ id: "list-resume-b", userId: "list-user-b", name: "Bob Resume" });

    const visible = await resumeDal.listResumesForUser({ userId: "list-user-a" });
    const guessed = await resumeDal.listResumesForUser({
      userId: "list-user-a",
      id: "list-resume-b",
    });

    expect(visible.map((item) => item.id)).toContain("list-resume-a");
    expect(visible.map((item) => item.id)).not.toContain("list-resume-b");
    expect(guessed).toEqual([]);
  });

  it("does not let admin role bypass personal resume ownership", async () => {
    await createUser({ id: "role-admin", email: "role-admin@example.com", role: "admin" });
    await createUser({ id: "role-owner", email: "role-owner@example.com" });
    await createResume({ id: "role-owner-resume", userId: "role-owner", name: "Owner Resume" });

    await expect(
      resumeDal.assertResumeBelongsToUser("role-owner-resume", "role-admin"),
    ).rejects.toThrow("Resume not found");
    await expect(resumeDal.getResumeDetail("role-owner-resume", "role-admin")).resolves.toBeNull();
  });
});

describe("getResumeDetail", () => {
  it("renders the stored layout in its order with the chosen bullets and skills", async () => {
    await createUser({ id: "detail-user", email: "detail@example.com" });
    await db.insert(schema.resumeExperience).values([
      { id: "exp-1", userId: "detail-user", company: "Acme", role: "Engineer" },
      { id: "exp-2", userId: "detail-user", company: "Beta", role: "Lead" },
    ]);
    await db.insert(schema.resumeExperienceBullet).values([
      { id: "b-1", experienceId: "exp-1", text: "Shipped A", sortOrder: 0 },
      { id: "b-2", experienceId: "exp-1", text: "Shipped B", sortOrder: 1 },
      { id: "b-3", experienceId: "exp-2", text: "Led C", sortOrder: 0 },
    ]);
    await db
      .insert(schema.resumeSkillGroup)
      .values({ id: "g-1", userId: "detail-user", name: "Frontend" });
    await db.insert(schema.resumeSkill).values([
      { id: "s-1", userId: "detail-user", name: "React" },
      { id: "s-2", userId: "detail-user", name: "Vue" },
    ]);
    await createResume({
      id: "detail-resume",
      userId: "detail-user",
      name: "Detail",
      layout: {
        ...emptyResumeLayout(),
        experiences: [
          { id: "exp-2", bullets: ["b-3"] },
          { id: "exp-1", bullets: ["b-2"] },
        ],
        skillGroups: [{ id: "g-1", skills: ["s-2", "s-1"] }],
      },
    });

    const detail = await resumeDal.getResumeDetail("detail-resume", "detail-user");

    expect(detail?.experiences.map((row) => [row.company, row.bullets.map((b) => b.text)])).toEqual(
      [
        ["Beta", ["Led C"]],
        ["Acme", ["Shipped B"]],
      ],
    );
    expect(detail?.skillGroups).toEqual([
      expect.objectContaining({
        name: "Frontend",
        skills: [
          expect.objectContaining({ name: "Vue", sortOrder: 0 }),
          expect.objectContaining({ name: "React", sortOrder: 1 }),
        ],
      }),
    ]);
  });

  it("skips ids that point at another user's library rows", async () => {
    await createUser({ id: "victim", email: "victim@example.com" });
    await createUser({ id: "prober", email: "prober@example.com" });
    await db
      .insert(schema.resumeSummary)
      .values({ id: "victim-summary", userId: "victim", text: "Private summary" });
    await createResume({
      id: "prober-resume",
      userId: "prober",
      name: "Prober",
      layout: { ...emptyResumeLayout(), summaries: ["victim-summary"] },
    });

    const detail = await resumeDal.getResumeDetail("prober-resume", "prober");

    expect(detail?.summaries).toEqual([]);
  });
});
