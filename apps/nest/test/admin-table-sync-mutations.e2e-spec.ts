import type { INestApplication } from "@nestjs/common";
import {
  resumeEducation,
  resumeEducationBullet,
  resumeExperience,
  resumeExperienceBullet,
} from "@repo/db/postgres/schema/resume";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas } from "./support/personas.js";
import { adminTableKeyOf as rowKeyOf } from "./support/admin-table-key.js";

describe("admin synced table deletes and truncation", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  const admin = { "x-mock-user": personas.admin.id };

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

  it("deletes owned children first and writes delete events for every removed row", async () => {
    const [experience] = await db
      .insert(resumeExperience)
      .values({
        id: "experience-delete",
        userId: personas.member.id,
        company: "Before",
        role: "Engineer",
      })
      .returning();
    const [bullet] = await db
      .insert(resumeExperienceBullet)
      .values({
        id: "bullet-delete",
        experienceId: experience.id,
        text: "Shipped work",
      })
      .returning();
    const rowKey = await rowKeyOf({
      db,
      table: "resume_experience",
      id: experience.id,
    });
    const response = await request(app.getHttpServer())
      .delete(`/api/admin/tables/resume_experience/rows/${rowKey}`)
      .set(admin)
      .expect(200);
    expect(response.body).toEqual({ mode: "synced", deletedReferences: 1 });
    expect(
      await db.select().from(resumeExperience).where(eq(resumeExperience.id, experience.id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(resumeExperienceBullet)
        .where(eq(resumeExperienceBullet.id, bullet.id)),
    ).toEqual([]);
    const events = await db.select().from(syncEvent);
    expect(
      events
        .filter((event) => event.type === "delete")
        .map((event) => event.key)
        .sort(),
    ).toEqual([bullet.id, experience.id].sort());
  });

  it("resolves education bullet ownership through its parent", async () => {
    const [education] = await db
      .insert(resumeEducation)
      .values({
        id: "education-parent",
        userId: personas.member.id,
        school: "University",
      })
      .returning();
    await db.insert(resumeEducationBullet).values({
      id: "education-bullet",
      educationId: education.id,
      text: "Degree work",
    });
    const rowKey = await rowKeyOf({
      db,
      table: "resume_education",
      id: education.id,
    });
    await request(app.getHttpServer())
      .delete(`/api/admin/tables/resume_education/rows/${rowKey}`)
      .set(admin)
      .expect(200);
    const events = await db.select().from(syncEvent);
    const bulletEvent = events.find((event) => event.key === "education-bullet");
    expect(bulletEvent).toMatchObject({
      type: "delete",
      userId: personas.member.id,
      collectionId: "resumeEducationBullet",
    });
  });

  it("truncates old synced rows with delete events while keeping newer rows", async () => {
    const oldDate = new Date(Date.now() - 86_400_000);
    await db.insert(resumeExperience).values([
      {
        id: "experience-old",
        userId: personas.member.id,
        company: "Old",
        role: "Engineer",
        createdAt: oldDate,
      },
      {
        id: "experience-new",
        userId: personas.member.id,
        company: "New",
        role: "Engineer",
      },
    ]);
    await db.insert(resumeExperienceBullet).values({
      id: "experience-old-bullet",
      experienceId: "experience-old",
      text: "Old work",
    });
    const cutoff = { column: "created_at", before: Date.now() - 3_600_000 };
    const preview = await request(app.getHttpServer())
      .get("/api/admin/tables/resume_experience/truncate")
      .query(cutoff)
      .set(admin)
      .expect(200);
    expect(preview.body).toMatchObject({
      mode: "synced",
      rows: 1,
      references: [{ table: "resume_experience_bullet", rows: 1 }],
    });
    const response = await request(app.getHttpServer())
      .post("/api/admin/tables/resume_experience/truncate")
      .set(admin)
      .send({ confirm: "resume_experience", cutoff })
      .expect(200);
    expect(response.body).toEqual({
      mode: "synced",
      deleted: 1,
      references: 1,
      events: 2,
    });
    const ids = await db.select({ id: resumeExperience.id }).from(resumeExperience);
    expect(ids.map((row) => row.id)).toContain("experience-new");
    expect(ids.map((row) => row.id)).not.toContain("experience-old");
    const bullets = await db
      .select({ id: resumeExperienceBullet.id })
      .from(resumeExperienceBullet)
      .where(eq(resumeExperienceBullet.id, "experience-old-bullet"));
    expect(bullets).toEqual([]);
    const [event] = await db.select().from(syncEvent).where(eq(syncEvent.key, "experience-old"));
    expect(event).toMatchObject({
      type: "delete",
      collectionId: "resumeExperience",
      userId: personas.member.id,
    });
  });
});
