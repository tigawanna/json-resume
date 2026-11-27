import type { INestApplication } from '@nestjs/common';
import { resume } from '@repo/db/schema/resume';
import { syncEvent } from '@repo/db/schema/sync-schema';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';
import { seedSyncEvent } from './support/seed-sync-event.js';

describe('admin event log maintenance', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => void;
  const admin = () => ({ 'x-mock-user': personas.admin.id });

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

  it('projects a pending resume event and stamps it', async () => {
    await seedSyncEvent({ db, userId: personas.member.id, key: 'projected-resume' });
    const response = await request(app.getHttpServer())
      .post('/api/admin/event-log/projection')
      .set(admin())
      .expect(200);
    expect(response.body.projected).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(resume)
      .where(eq(resume.id, 'projected-resume'))
      .limit(1);
    expect(row).toMatchObject({
      userId: personas.member.id,
      name: 'Projected projected-resume',
    });
    const [event] = await db
      .select()
      .from(syncEvent)
      .where(eq(syncEvent.key, 'projected-resume'));
    expect(event?.projectedAt).toBeInstanceOf(Date);
  });

  it('rebuilds a user log from live rows with a reset marker', async () => {
    await db.insert(resume).values({
      id: 'rebuild-resume',
      userId: personas.member.id,
      name: 'Rebuild source',
    });
    const response = await request(app.getHttpServer())
      .post(`/api/admin/event-log/rebuild/${personas.member.id}`)
      .set(admin())
      .expect(200);
    expect(response.body).toMatchObject({
      previousEvents: expect.any(Number),
      insertedEvents: expect.any(Number),
      projectedFirst: expect.any(Number),
      byCollection: expect.objectContaining({ resume: expect.any(Number) }),
    });
    const marker = await db
      .select()
      .from(syncEvent)
      .where(
        and(
          eq(syncEvent.userId, personas.member.id),
          eq(syncEvent.collectionId, '__sync_reset__'),
        ),
      );
    expect(marker).toHaveLength(1);
  });

  it('squashes superseded events after the retention window', async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const now = new Date();
    await seedSyncEvent({
      db,
      userId: personas.member.id,
      key: 'squash-resume',
      serverTimestamp: old,
      projectedAt: old,
    });
    await seedSyncEvent({
      db,
      userId: personas.member.id,
      key: 'squash-resume',
      serverTimestamp: now,
      projectedAt: now,
    });

    const dryRun = await request(app.getHttpServer())
      .post('/api/admin/event-log/squash')
      .set(admin())
      .send({ dryRun: true, retentionMs: 60 * 60 * 1000 })
      .expect(200);
    expect(dryRun.body).toMatchObject({ users: expect.any(Number), removed: expect.any(Number) });

    const response = await request(app.getHttpServer())
      .post('/api/admin/event-log/squash')
      .set(admin())
      .send({ retentionMs: 60 * 60 * 1000 })
      .expect(200);
    expect(response.body.removed).toBeGreaterThan(0);
    const rows = await db
      .select()
      .from(syncEvent)
      .where(and(eq(syncEvent.userId, personas.member.id), eq(syncEvent.key, 'squash-resume')));
    expect(rows).toHaveLength(1);
  });
});
