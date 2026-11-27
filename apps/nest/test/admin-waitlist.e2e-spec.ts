import type { INestApplication } from "@nestjs/common";
import { waitlistEntry } from "@repo/db/postgres/schema/credits-schema";
import { asc } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas } from "./support/personas.js";

describe("admin waitlist operations", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  const admin = () => ({ "x-mock-user": personas.admin.id });

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

  it("lists entries with search, filters, and linked account emails", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/waitlist")
      .query({ q: "memberwaitlisted", page: 1, perPage: 20 })
      .set(admin())
      .expect(200);
    expect(response.body.pagination).toMatchObject({ page: 1, perPage: 20 });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      email: personas.memberWaitlisted.email,
      userId: personas.memberWaitlisted.id,
    });

    const unlinked = await request(app.getHttpServer())
      .get("/api/admin/waitlist")
      .query({ hasAccount: "false" })
      .set(admin())
      .expect(200);
    expect(
      unlinked.body.items.every((item: { userId: string | null }) => item.userId === null),
    ).toBe(true);
  });

  it("returns joined, linked, and removed counts", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/waitlist/stats")
      .set(admin())
      .expect(200);
    expect(response.body).toEqual({ joined: 2, linked: 2, removed: 0 });
  });

  it("updates notes and links an entry to an existing account", async () => {
    const [entry] = await db
      .select({ id: waitlistEntry.id })
      .from(waitlistEntry)
      .orderBy(asc(waitlistEntry.id))
      .limit(1);
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/waitlist/entries/${entry.id}`)
      .set(admin())
      .send({ notes: "Called and interested", userId: personas.member.id })
      .expect(200);
    expect(response.body.entry).toMatchObject({
      id: entry.id,
      notes: "Called and interested",
      userId: personas.member.id,
    });
    await request(app.getHttpServer())
      .patch(`/api/admin/waitlist/entries/${entry.id}`)
      .set(admin())
      .send({ userId: null })
      .expect(200);
  });

  it("exports every entry as quoted CSV", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/waitlist/export")
      .set(admin())
      .expect(200);
    expect(response.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="waitlist.csv"');
    const [header, ...rows] = response.text.split("\n");
    expect(header).toBe("email,name,status,source,userId,userEmail,consentAt,createdAt");
    expect(rows).toHaveLength(2);
  });
});
