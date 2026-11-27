import type { INestApplication } from "@nestjs/common";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { DrizzleDB } from "../src/database/database.module.js";
import { createTestApp } from "./support/create-test-app.js";
import { personas } from "./support/personas.js";
import { seedSyncEvent } from "./support/seed-sync-event.js";

describe("admin event log backups", () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  let admin = () => ({ "x-mock-user": personas.admin.id });
  let backupTable = "";

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    admin = () => ({ "x-mock-user": personas.admin.id });
    await seedSyncEvent({ db, userId: personas.member.id, key: "backup-resume" });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("creates, lists, restores, and drops a backup", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/admin/event-log/backups")
      .set(admin())
      .expect(200);
    expect(created.body).toMatchObject({
      backup: expect.stringMatching(/^sync_event_backup_\d{14}$/),
      rows: 1,
    });
    backupTable = created.body.backup;

    const listed = await request(app.getHttpServer())
      .get("/api/admin/event-log/backups")
      .set(admin())
      .expect(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: backupTable, rows: 1, createdAt: expect.any(Number) }),
      ]),
    );

    await db.delete(syncEvent).where(eq(syncEvent.key, "backup-resume"));
    const restored = await request(app.getHttpServer())
      .post(`/api/admin/event-log/backups/${backupTable}/restore`)
      .set(admin())
      .expect(200);
    expect(restored.body).toEqual({ restored: 1 });

    await request(app.getHttpServer())
      .post(`/api/admin/event-log/backups/${backupTable}/drop`)
      .set(admin())
      .send({ table: backupTable, confirm: "wrong" })
      .expect(400);
    const dropped = await request(app.getHttpServer())
      .post(`/api/admin/event-log/backups/${backupTable}/drop`)
      .set(admin())
      .send({ table: backupTable, confirm: backupTable })
      .expect(200);
    expect(dropped.body).toEqual({ dropped: backupTable });
  });

  it("backs up and empties the event log through table truncation", async () => {
    const preview = await request(app.getHttpServer())
      .get("/api/admin/tables/sync_event/truncate")
      .set(admin())
      .expect(200);
    expect(preview.body.mode).toBe("eventLog");
    expect(preview.body.rows).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post("/api/admin/tables/sync_event/truncate")
      .set(admin())
      .send({ confirm: "sync_event", rebuild: true })
      .expect(200)
      .then((response) => {
        expect(response.body).toMatchObject({
          mode: "eventLog",
          deleted: expect.any(Number),
          backup: expect.stringMatching(/^sync_event_backup_\d{14}$/),
          references: 0,
          users: expect.any(Number),
        });
      });
    const events = await db.select().from(syncEvent);
    expect(events.some((event) => event.collectionId === "__sync_reset__")).toBe(true);
    const rebuiltResume = events.find((event) => event.key === "backup-resume");
    expect(rebuiltResume?.clientId).toBe("server-rebuild");
  });
});
