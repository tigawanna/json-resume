import type { INestApplication } from "@nestjs/common";
import { job } from "@repo/db/postgres/schema/job-schema";
import { resume, resumeAiChat } from "@repo/db/postgres/schema/resume";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { count } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { createRealDataApp } from "./support/create-real-data-app.js";
import { textValue } from "./support/row-value.js";

describe("admin truncation against a copy of the local database", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  let adminId: string;
  const admin = () => ({ "x-mock-user": adminId });

  beforeAll(async () => {
    const started = await createRealDataApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    adminId = started.admin.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("truncates real jobs after confirmation and refuses blocked tables", async () => {
    const [jobs] = await db.select({ n: count() }).from(job);
    expect(jobs.n).toBeGreaterThan(0);
    const [eventsBefore] = await db.select({ n: count() }).from(syncEvent);

    const preview = await request(app.getHttpServer())
      .get("/api/admin/tables/job/truncate")
      .set(admin())
      .expect(200);
    expect(preview.body).toMatchObject({
      table: "job",
      mode: "synced",
      rows: jobs.n,
    });

    await request(app.getHttpServer())
      .post("/api/admin/tables/job/truncate")
      .set(admin())
      .send({ confirm: "jobs" })
      .expect(400);
    const truncated = await request(app.getHttpServer())
      .post("/api/admin/tables/job/truncate")
      .set(admin())
      .send({ confirm: "job" })
      .expect(200);
    expect(truncated.body).toEqual({
      mode: "synced",
      deleted: jobs.n,
      references: 0,
      events: jobs.n,
    });
    expect(await db.select().from(job)).toEqual([]);
    const [eventsAfter] = await db.select({ n: count() }).from(syncEvent);
    expect(eventsAfter.n).toBe(eventsBefore.n + jobs.n);

    const blocked = await request(app.getHttpServer())
      .get("/api/admin/tables/user/truncate")
      .set(admin())
      .expect(200);
    expect(blocked.body.blockedBy.length).toBeGreaterThan(0);
    await request(app.getHttpServer())
      .post("/api/admin/tables/user/truncate")
      .set(admin())
      .send({ confirm: "user" })
      .expect(400);
  });

  it("blocks synced truncation when local-only résumé AI rows reference it", async () => {
    const [row] = (
      await db.$client.query({
        text: "select id, user_id from resume order by id limit 1",
        values: [],
      })
    ).rows;
    await db.insert(resumeAiChat).values({
      userId: textValue({ value: row.user_id }),
      resumeId: textValue({ value: row.id }),
      messages: "[]",
    });

    const preview = await request(app.getHttpServer())
      .get("/api/admin/tables/resume/truncate")
      .set(admin())
      .expect(200);
    expect(preview.body.blockedBy).toEqual(
      expect.arrayContaining([expect.objectContaining({ table: "resume_ai_chat", rows: 1 })]),
    );
    expect(preview.body.cascades).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ table: "resume_ai_chat" })]),
    );
    await request(app.getHttpServer())
      .post("/api/admin/tables/resume/truncate")
      .set(admin())
      .send({ confirm: "resume" })
      .expect(400);
    expect(await db.select().from(resume)).not.toEqual([]);
  });
});
