import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { waitlistEntry } from '@repo/db/schema/credits-schema';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

describe('admin direct table mutations', () => {
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

  it('updates a direct row, stamps updated_at and redacts values from audit logs', async () => {
    await db.insert(waitlistEntry).values({
      email: 'audit@example.com',
      status: 'joined',
      source: 'admin',
      consentAt: new Date(),
    });
    const page = await request(app.getHttpServer())
      .get('/api/admin/tables/waitlist_entry')
      .query({ q: 'audit@example.com' })
      .set(admin)
      .expect(200);
    const rowid = Number(page.body.rows[0].rowid);
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/tables/waitlist_entry/rows/${rowid}`)
      .set(admin)
      .send({ values: { notes: 'do-not-log-this' } })
      .expect(200);
    const auditCalls = log.mock.calls.map((call) => String(call[0]));
    log.mockRestore();
    expect(response.body).toEqual({ mode: 'direct', changed: 1 });
    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, 'audit@example.com'));
    expect(row?.notes).toBe('do-not-log-this');
    expect(row?.updatedAt).toBeInstanceOf(Date);
    const audit = auditCalls.find((line) =>
      line.includes('"action":"update-row"'),
    );
    expect(audit).toContain('"columns":["notes"]');
    expect(audit).not.toContain('do-not-log-this');
  });

  it('rejects read-only and locked columns without writing', async () => {
    await request(app.getHttpServer())
      .patch('/api/admin/tables/sync_event/rows/1')
      .set(admin)
      .send({ values: { payload: 'changed' } })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/admin/tables/resume/rows/1')
      .set(admin)
      .send({ values: { user_id: personas.member.id } })
      .expect(400);
  });

  it('deletes a direct row', async () => {
    await db.insert(waitlistEntry).values({
      email: 'delete@example.com',
      status: 'joined',
      source: 'admin',
      consentAt: new Date(),
    });
    const page = await request(app.getHttpServer())
      .get('/api/admin/tables/waitlist_entry')
      .query({ q: 'delete@example.com' })
      .set(admin)
      .expect(200);
    const response = await request(app.getHttpServer())
      .delete(
        `/api/admin/tables/waitlist_entry/rows/${Number(page.body.rows[0].rowid)}`,
      )
      .set(admin)
      .expect(200);
    expect(response.body).toEqual({ mode: 'direct', deletedReferences: 0 });
    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, 'delete@example.com'));
    expect(row).toBeUndefined();
  });

  it('previews and performs a cutoff truncate with server-side confirmation', async () => {
    const oldDate = new Date(Date.now() - 86_400_000);
    await db.insert(waitlistEntry).values([
      {
        email: 'old@example.com',
        status: 'joined',
        source: 'admin',
        consentAt: oldDate,
        createdAt: oldDate,
      },
      {
        email: 'new@example.com',
        status: 'joined',
        source: 'admin',
        consentAt: new Date(),
      },
    ]);
    const cutoff = { column: 'created_at', before: Date.now() - 3_600_000 };
    const preview = await request(app.getHttpServer())
      .get('/api/admin/tables/waitlist_entry/truncate')
      .query(cutoff)
      .set(admin)
      .expect(200);
    expect(preview.body).toMatchObject({
      mode: 'direct',
      rows: 1,
      cutoffColumns: expect.arrayContaining(['created_at']),
    });
    await request(app.getHttpServer())
      .post('/api/admin/tables/waitlist_entry/truncate')
      .set(admin)
      .send({ confirm: 'wrong', cutoff })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post('/api/admin/tables/waitlist_entry/truncate')
      .set(admin)
      .send({ confirm: 'waitlist_entry', cutoff })
      .expect(200);
    expect(response.body).toEqual({
      mode: 'direct',
      deleted: 1,
      references: 0,
      events: 0,
    });
    const emails = await db
      .select({ email: waitlistEntry.email })
      .from(waitlistEntry);
    expect(emails.map((row) => row.email)).not.toContain('old@example.com');
    expect(emails.map((row) => row.email)).toContain('new@example.com');
  });

  it('backs up and empties the event log instead of deferring truncation', async () => {
    const preview = await request(app.getHttpServer())
      .get('/api/admin/tables/sync_event/truncate')
      .set(admin)
      .expect(200);
    expect(preview.body.mode).toBe('eventLog');
    const response = await request(app.getHttpServer())
      .post('/api/admin/tables/sync_event/truncate')
      .set(admin)
      .send({ confirm: 'sync_event', rebuild: true })
      .expect(200);
    expect(response.body).toMatchObject({
      mode: 'eventLog',
      backup: expect.any(String),
      deleted: expect.any(Number),
      references: 0,
      users: expect.any(Number),
    });
  });
});
