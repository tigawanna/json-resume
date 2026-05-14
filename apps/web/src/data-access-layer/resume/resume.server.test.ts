// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { sql } from "drizzle-orm";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDefaultResume, type ResumeDocumentV1 } from "@/features/resume/resume-schema";

const tempDir = mkdtempSync(join(tmpdir(), "ajr-dal-"));
const databasePath = join(tempDir, "test.sqlite");
const databaseUrl = `file:${databasePath}`;

let db: typeof import("@/lib/drizzle/client").db;
let schema: typeof import("@/lib/drizzle/scheam");
let resumeDal: typeof import("./resume.server");

async function runMigrations(client: Client): Promise<void> {
  const migrationDir = new URL("../../../drizzle/migrations/", import.meta.url);
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const migration = readFileSync(new URL(file, migrationDir), "utf8");
    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }
  }
}

async function createUser(input: { id: string; email: string; role?: string }): Promise<void> {
  await db.insert(schema.user).values({
    id: input.id,
    name: input.id,
    email: input.email,
    role: input.role,
  });
}

async function createResume(input: { id: string; userId: string; name: string }): Promise<void> {
  await db.insert(schema.resume).values({
    id: input.id,
    userId: input.userId,
    name: input.name,
    fullName: input.name,
  });
}

async function createLink(input: {
  id: string;
  userId: string;
  resumeId: string;
  label: string;
}): Promise<void> {
  await db.insert(schema.resumeLink).values({
    id: input.id,
    userId: input.userId,
    label: input.label,
    url: `https://example.com/${input.id}`,
    sortOrder: 0,
  });
  await db.insert(schema.resumeLinkItem).values({
    resumeId: input.resumeId,
    linkId: input.id,
    sortOrder: 0,
  });
}

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.stubEnv("DATABASE_AUTH_TOKEN", "");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("FRONTEND_URL", "http://localhost:3040");

  const client = createClient({ url: databaseUrl });
  await runMigrations(client);
  client.close();

  const dbModule = await import("@/lib/drizzle/client");
  const schemaModule = await import("@/lib/drizzle/scheam");
  const resumeDalModule = await import("./resume.server");

  db = dbModule.db;
  schema = schemaModule;
  resumeDal = resumeDalModule;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("resume data access ownership", () => {
  it("does not list another user's resume even when the id is supplied", async () => {
    await createUser({ id: "list-user-a", email: "list-a@example.com" });
    await createUser({ id: "list-user-b", email: "list-b@example.com" });
    await createResume({
      id: "list-resume-a",
      userId: "list-user-a",
      name: "Alice Resume",
    });
    await createResume({
      id: "list-resume-b",
      userId: "list-user-b",
      name: "Bob Resume",
    });

    const visible = await resumeDal.listResumesForUser({ userId: "list-user-a" });
    const guessed = await resumeDal.listResumesForUser({
      userId: "list-user-a",
      id: "list-resume-b",
    });

    expect(visible.map((item) => item.id)).toContain("list-resume-a");
    expect(visible.map((item) => item.id)).not.toContain("list-resume-b");
    expect(guessed).toEqual([]);
  });

  it("rejects cross-owner child ids", async () => {
    await createUser({ id: "child-user-a", email: "child-a@example.com" });
    await createUser({ id: "child-user-b", email: "child-b@example.com" });
    await createResume({
      id: "child-resume-a",
      userId: "child-user-a",
      name: "Child A",
    });
    await createResume({
      id: "child-resume-b",
      userId: "child-user-b",
      name: "Child B",
    });
    await createLink({
      id: "child-link-b",
      userId: "child-user-b",
      resumeId: "child-resume-b",
      label: "Private Link",
    });

    await expect(resumeDal.assertLinkBelongsToUser("child-link-b", "child-user-a")).rejects.toThrow(
      "Link not found",
    );
  });

  it("does not let admin role bypass personal resume ownership", async () => {
    await createUser({
      id: "role-admin",
      email: "role-admin@example.com",
      role: "admin",
    });
    await createUser({ id: "role-owner", email: "role-owner@example.com" });
    await createResume({
      id: "role-owner-resume",
      userId: "role-owner",
      name: "Owner Resume",
    });

    await expect(
      resumeDal.assertResumeBelongsToUser("role-owner-resume", "role-admin"),
    ).rejects.toThrow("Resume not found");
  });

  it("does not replace another user's resume content or delete its children", async () => {
    await createUser({ id: "replace-owner", email: "replace-owner@example.com" });
    await createUser({ id: "replace-attacker", email: "replace-attacker@example.com" });
    await createResume({
      id: "replace-owner-resume",
      userId: "replace-owner",
      name: "Keep Me",
    });
    await createLink({
      id: "replace-owner-link",
      userId: "replace-owner",
      resumeId: "replace-owner-resume",
      label: "Keep Link",
    });

    const replacement: ResumeDocumentV1 = {
      ...createDefaultResume(),
      header: {
        ...createDefaultResume().header,
        fullName: "Unexpected Replacement",
        links: [],
      },
    };

    await expect(
      resumeDal.replaceResumeContent("replace-owner-resume", "replace-attacker", replacement),
    ).rejects.toThrow("Resume not found");

    const [resumeAfter] = await db
      .select({ fullName: schema.resume.fullName })
      .from(schema.resume)
      .where(sql`${schema.resume.id} = ${"replace-owner-resume"}`)
      .limit(1);
    const [linkAfter] = await db
      .select({ id: schema.resumeLink.id })
      .from(schema.resumeLink)
      .where(sql`${schema.resumeLink.id} = ${"replace-owner-link"}`)
      .limit(1);

    expect(resumeAfter?.fullName).toBe("Keep Me");
    expect(linkAfter?.id).toBe("replace-owner-link");
  });
});
