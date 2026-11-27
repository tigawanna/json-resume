import type { INestApplication } from '@nestjs/common';
import {
  COMPACTION_REQUEST_COLLECTION,
  compactionRequestSchema,
} from '@repo/isomorphic/sync/compaction-protocol';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { desc, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

describe('admin events and library actions', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  const admin = () => ({ 'x-mock-user': personas.admin.id });

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    await db.insert(syncEvent).values([
      event({
        userId: personas.member.id,
        collectionId: 'resume',
        key: 'resume-1',
      }),
      event({
        userId: personas.member.id,
        collectionId: 'job',
        key: 'job-1',
        projected: true,
      }),
      event({
        userId: personas.admin.id,
        collectionId: 'resume',
        key: 'resume-2',
      }),
    ]);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('requires an admin for event browsing', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/events')
      .query({ sort: 'seq-desc', page: 0, pageSize: 20 })
      .set({ 'x-mock-user': personas.member.id })
      .expect(403);
  });

  it('lists events with epoch timestamps, filters, and pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/events')
      .query({
        sort: 'seq-desc',
        page: 0,
        pageSize: 20,
        userId: personas.member.id,
        applied: 'no',
      })
      .set(admin())
      .expect(200);

    expect(response.body).toMatchObject({
      total: 1,
      unprojected: 1,
      page: 0,
      pageSize: 20,
    });
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0]).toMatchObject({
      collectionId: 'resume',
      key: 'resume-1',
      serverTimestamp: expect.any(Number),
      projectedAt: null,
      userEmail: personas.member.email,
    });
  });

  it('aggregates collections and users', async () => {
    const collections = await request(app.getHttpServer())
      .get('/api/admin/events/collections')
      .set(admin())
      .expect(200);
    expect(collections.body).toEqual(
      expect.arrayContaining([
        { collectionId: 'resume', total: 2, unprojected: 2 },
        { collectionId: 'job', total: 1, unprojected: 0 },
      ]),
    );

    const users = await request(app.getHttpServer())
      .get('/api/admin/events/users')
      .set(admin())
      .expect(200);
    expect(users.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: personas.member.id,
          events: 2,
          unprojected: 1,
          lastEventAt: expect.any(Number),
        }),
      ]),
    );
  });

  it('appends compaction requests for the selected users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/library/compact')
      .set(admin())
      .send({})
      .expect(200);
    expect(response.body.users).toBe(2);

    const rows = await db
      .select()
      .from(syncEvent)
      .where(eq(syncEvent.collectionId, COMPACTION_REQUEST_COLLECTION))
      .orderBy(desc(syncEvent.globalSeq));
    expect(rows).toHaveLength(2);
    expect(
      compactionRequestSchema.parse(JSON.parse(rows[0]?.payload ?? 'null')),
    ).toEqual({
      requestId: expect.any(String),
      prune: false,
    });
  });

  it('backs up the log before appending prune requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/library/prune')
      .set(admin())
      .send({ userId: personas.member.id })
      .expect(200);
    expect(response.body).toMatchObject({
      users: 1,
      backup: expect.any(String),
    });

    const [row] = await db
      .select()
      .from(syncEvent)
      .where(eq(syncEvent.collectionId, COMPACTION_REQUEST_COLLECTION))
      .orderBy(desc(syncEvent.globalSeq))
      .limit(1);
    expect(
      compactionRequestSchema.parse(JSON.parse(row?.payload ?? 'null')),
    ).toEqual({
      requestId: expect.any(String),
      prune: true,
    });
  });
});

function event({
  userId,
  collectionId,
  key,
  projected = false,
}: {
  userId: string;
  collectionId: string;
  key: string;
  projected?: boolean;
}) {
  const timestamp = new Date();
  return {
    eventId: crypto.randomUUID(),
    userId,
    collectionId,
    type: 'insert' as const,
    key,
    payload: JSON.stringify({ id: key }),
    previous: null,
    txId: crypto.randomUUID(),
    clientId: 'test',
    schemaVersion: 1,
    clientTimestamp: timestamp.getTime(),
    serverTimestamp: timestamp,
    projectedAt: projected ? timestamp : null,
  };
}
