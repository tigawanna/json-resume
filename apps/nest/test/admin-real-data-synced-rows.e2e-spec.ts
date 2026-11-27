import type { INestApplication } from "@nestjs/common";
import { resumeExperience, resumeExperienceBullet } from "@repo/db/postgres/schema/resume";
import { resume } from "@repo/db/postgres/schema/resume/resume";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { and, count, eq } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { encodeAdminRowKeyFromRow } from "../src/admin/tables/admin-row-key.js";
import { createRealDataApp } from "./support/create-real-data-app.js";
import { textValue } from "./support/row-value.js";

describe("admin synced row mutations against real résumé data", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  let adminId: string;
  let resumeRowId: string;
  let resumeRowKey: string;
  const admin = () => ({ "x-mock-user": adminId });

  beforeAll(async () => {
    const started = await createRealDataApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    adminId = started.admin.id;
    const [row] = (
      await db.$client.query({
        text: "select id from resume order by id desc limit 1",
        values: [],
      })
    ).rows;
    resumeRowKey = encodeAdminRowKeyFromRow({ row, columns: ["id"] });
    resumeRowId = textValue({ value: row.id });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("locks identity and ownership columns on a real synced row", async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/admin/tables/resume/rows/${resumeRowKey}`)
      .set(admin())
      .expect(200);
    expect(detail.body.mode).toBe("synced");
    expect(detail.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "id", editable: false }),
        expect.objectContaining({ name: "user_id", editable: false }),
        expect.objectContaining({ name: "name", editable: true }),
      ]),
    );
    for (const values of [{ id: "moved" }, { user_id: adminId }]) {
      await request(app.getHttpServer())
        .patch(`/api/admin/tables/resume/rows/${resumeRowKey}`)
        .set(admin())
        .send({ values })
        .expect(400);
    }
  });

  it("edits a real résumé and appends one projected admin event", async () => {
    const before = await db
      .select({ n: count() })
      .from(syncEvent)
      .where(eq(syncEvent.key, resumeRowId));
    const name = `Real data edit ${Date.now()}`;
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/tables/resume/rows/${resumeRowKey}`)
      .set(admin())
      .send({ values: { name } })
      .expect(200);
    expect(response.body).toEqual({ mode: "synced", changed: 1 });

    const [updated] = await db.select().from(resume).where(eq(resume.id, resumeRowId)).limit(1);
    expect(updated?.name).toBe(name);
    const after = await db.select().from(syncEvent).where(eq(syncEvent.key, resumeRowId));
    expect(after).toHaveLength(before[0].n + 1);
    const [event] = after.slice(-1);
    expect(event).toMatchObject({
      collectionId: "resume",
      type: "update",
      clientId: "server-admin",
      previous: null,
      schemaVersion: 1,
    });
    expect(event?.projectedAt).toBeInstanceOf(Date);
    expect(JSON.parse(event?.payload ?? "{}")).toMatchObject({
      id: resumeRowId,
      name,
      embedding: null,
    });
  });

  it("deletes a real experience with its bullets and writes an event for each", async () => {
    const [parent] = (
      await db.$client.query({
        text: `select e.id, e.user_id, count(b.id) as bullets
              from resume_experience e
              join resume_experience_bullet b on b.experience_id = e.id
              group by e.id order by e.id desc limit 1`,
        values: [],
      })
    ).rows;
    expect(parent).toBeDefined();
    const parentRowKey = encodeAdminRowKeyFromRow({
      row: parent,
      columns: ["id"],
    });
    const childIds = (
      await db
        .select({ id: resumeExperienceBullet.id })
        .from(resumeExperienceBullet)
        .where(eq(resumeExperienceBullet.experienceId, textValue({ value: parent.id })))
    ).map((row) => row.id);
    expect(childIds.length).toBe(Number(parent.bullets));

    const response = await request(app.getHttpServer())
      .delete(`/api/admin/tables/resume_experience/rows/${parentRowKey}`)
      .set(admin())
      .expect(200);
    expect(response.body).toEqual({
      mode: "synced",
      deletedReferences: childIds.length,
    });
    expect(
      await db
        .select()
        .from(resumeExperience)
        .where(eq(resumeExperience.id, textValue({ value: parent.id }))),
    ).toEqual([]);
    for (const key of [textValue({ value: parent.id }), ...childIds]) {
      const [event] = await db
        .select()
        .from(syncEvent)
        .where(and(eq(syncEvent.key, key), eq(syncEvent.type, "delete")));
      expect(event).toMatchObject({
        type: "delete",
        userId: textValue({ value: parent.user_id }),
        clientId: "server-admin",
      });
    }
  });
});
