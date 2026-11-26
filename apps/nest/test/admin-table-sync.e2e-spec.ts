import type { INestApplication } from '@nestjs/common';
import { resume } from '@repo/db/schema/resume';
import { syncEvent } from '@repo/db/schema/sync-schema';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';
import { adminTableRowidOf as rowidOf } from './support/admin-table-rowid.js';

describe('admin synced row reads and updates', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => void;
  const admin = { 'x-mock-user': personas.admin.id };

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('locks identity and ownership columns on synced rows', async () => {
    const [row] = await db
      .insert(resume)
      .values({
        id: 'resume-locked',
        userId: personas.member.id,
        name: 'Original',
      })
      .returning();
    const rowid = await rowidOf({ db, table: 'resume', id: row.id });
    const response = await request(app.getHttpServer())
      .get(`/api/admin/tables/resume/rows/${rowid}`)
      .set(admin)
      .expect(200);
    expect(response.body.mode).toBe('synced');
    expect(response.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', editable: false }),
        expect.objectContaining({ name: 'user_id', editable: false }),
        expect.objectContaining({ name: 'name', editable: true }),
      ]),
    );
    await request(app.getHttpServer())
      .patch(`/api/admin/tables/resume/rows/${rowid}`)
      .set(admin)
      .send({ values: { user_id: personas.admin.id } })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/admin/tables/resume/rows/${rowid}`)
      .set(admin)
      .send({ values: { id: 'moved' } })
      .expect(400);
  });

  it('updates a synced row and appends a projected update event in the same transaction', async () => {
    const [row] = await db
      .insert(resume)
      .values({
        id: 'resume-updated',
        userId: personas.member.id,
        name: 'Before',
        embedding: Buffer.from([1, 2, 3]),
      })
      .returning();
    const rowid = await rowidOf({ db, table: 'resume', id: row.id });
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/tables/resume/rows/${rowid}`)
      .set(admin)
      .send({ values: { name: 'After' } })
      .expect(200);
    expect(response.body).toEqual({ mode: 'synced', changed: 1 });
    const [updated] = await db
      .select()
      .from(resume)
      .where(eq(resume.id, row.id));
    expect(updated?.name).toBe('After');
    const [event] = await db
      .select()
      .from(syncEvent)
      .where(eq(syncEvent.key, row.id));
    expect(event).toMatchObject({
      userId: personas.member.id,
      collectionId: 'resume',
      type: 'update',
      key: row.id,
      previous: null,
      clientId: 'server-admin',
      schemaVersion: 1,
    });
    expect(event?.projectedAt).toBeInstanceOf(Date);
    expect(JSON.parse(event?.payload ?? '{}')).toMatchObject({
      id: row.id,
      name: 'After',
      embedding: null,
    });
  });
});
