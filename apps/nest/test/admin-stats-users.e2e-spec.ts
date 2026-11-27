import type { INestApplication } from "@nestjs/common";
import { user } from "@repo/db/postgres/schema/auth-schema";
import { resume } from "@repo/db/postgres/schema/resume/resume";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas } from "./support/personas.js";

const endpoints = ["/api/admin/stats", "/api/admin/users"];

function expectedUsers() {
  return Object.values(personas)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((persona) => ({
      id: persona.id,
      name: persona.name,
      email: persona.email,
      role: persona.role,
      emailVerified: true,
      banned: persona.banned,
      createdAt: expect.any(Number),
      events: 0,
      resumes: 0,
    }));
}

async function seedActivity({ db }: { db: DrizzleDB }) {
  const now = new Date();
  await Promise.all([
    db.insert(resume).values([
      { id: "resume-member-1", userId: personas.member.id, name: "Member One" },
      { id: "resume-member-2", userId: personas.member.id, name: "Member Two" },
      {
        id: "resume-admin-1",
        userId: personas.adminWaitlisted.id,
        name: "Admin One",
      },
      {
        id: "resume-banned-1",
        userId: personas.bannedAdmin.id,
        name: "Banned One",
      },
    ]),
    db.insert(syncEvent).values([
      {
        eventId: "event-member-recent",
        userId: personas.member.id,
        collectionId: "resume",
        type: "insert",
        key: "resume-member-1",
        payload: "{}",
        txId: "tx-1",
        clientId: "client-1",
        clientTimestamp: now.getTime(),
        serverTimestamp: now,
      },
      {
        eventId: "event-admin-recent",
        userId: personas.adminWaitlisted.id,
        collectionId: "resume",
        type: "insert",
        key: "resume-admin-1",
        payload: "{}",
        txId: "tx-3",
        clientId: "client-2",
        clientTimestamp: now.getTime(),
        serverTimestamp: now,
        projectedAt: now,
      },
    ]),
  ]);
}

describe("admin stats and users", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("requires authentication for both endpoints", async () => {
    for (const endpoint of endpoints) {
      await request(app.getHttpServer()).get(endpoint).expect(401);
    }
  });

  it("forbids members, users without a role, and banned admins", async () => {
    for (const persona of [personas.member, personas.noRole, personas.bannedAdmin]) {
      for (const endpoint of endpoints) {
        await request(app.getHttpServer()).get(endpoint).set("x-mock-user", persona.id).expect(403);
      }
    }
  });

  it("allows admins and comma-separated admin roles", async () => {
    for (const persona of [personas.admin, personas.multiRole]) {
      for (const endpoint of endpoints) {
        await request(app.getHttpServer()).get(endpoint).set("x-mock-user", persona.id).expect(200);
      }
    }
  });

  it("returns the exact initial stats", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/stats")
      .set("x-mock-user", personas.admin.id)
      .expect(200);
    expect(response.body).toEqual({
      users: 8,
      admins: 4,
      resumes: 0,
      publicResumes: 0,
      jobs: 0,
      events: 0,
      unprojectedEvents: 0,
      eventsLast24h: 0,
      activeSessions: 0,
      lastProjectedSeq: null,
    });
  });

  it("returns every initial user in name order with only safe fields", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/users")
      .set("x-mock-user", personas.admin.id)
      .expect(200);
    expect(response.body).toEqual(expectedUsers());
  });

  it("counts seeded activity in SQL and retains banned and zero-count users", async () => {
    await seedActivity({ db });
    await db.update(user).set({ role: "user, admin" }).where(eq(user.id, personas.multiRole.id));
    const stats = await request(app.getHttpServer())
      .get("/api/admin/stats")
      .set("x-mock-user", personas.admin.id)
      .expect(200);
    expect(stats.body).toEqual({
      users: 8,
      admins: 4,
      resumes: 4,
      publicResumes: 0,
      jobs: 0,
      events: 2,
      unprojectedEvents: 1,
      eventsLast24h: 2,
      activeSessions: 0,
      lastProjectedSeq: null,
    });
    const users = await request(app.getHttpServer())
      .get("/api/admin/users")
      .set("x-mock-user", personas.multiRole.id)
      .expect(200);
    const activity: Record<string, { events: number; resumes: number }> = {
      [personas.member.id]: { events: 1, resumes: 2 },
      [personas.adminWaitlisted.id]: { events: 1, resumes: 1 },
      [personas.bannedAdmin.id]: { events: 0, resumes: 1 },
    };
    expect(users.body).toEqual(
      expectedUsers().map((row) => ({
        ...row,
        role: row.id === personas.multiRole.id ? "user, admin" : row.role,
        ...(activity[row.id] ?? { events: 0, resumes: 0 }),
      })),
    );
  });
});
