import type { INestApplication } from '@nestjs/common';
import { resume } from '@repo/db/postgres/schema/resume';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { eq, max } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

describe('managed sync events', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  const eventId = crypto.randomUUID();
  const event = {
    eventId,
    collectionId: 'resume',
    type: 'insert',
    key: 'sync-http-resume',
    payload: { id: 'sync-http-resume', userId: personas.member.id, name: 'Sync HTTP' },
    previous: null,
    txId: 'sync-http-tx',
    clientId: 'test-client',
    schemaVersion: 1,
    timestamp: Date.now(),
  };

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

  it('pushes, projects, deduplicates, and pulls an event', async () => {
    const pushed = await request(app.getHttpServer())
      .post('/api/sync/events')
      .set('x-mock-user', personas.member.id)
      .send([event])
      .expect(200);
    expect(pushed.body.confirmed).toEqual([
      { eventId, globalSeq: expect.any(Number) },
    ]);
    expect(pushed.body.failed).toBeUndefined();

    const [row] = await db
      .select()
      .from(resume)
      .where(eq(resume.id, 'sync-http-resume'))
      .limit(1);
    expect(row).toMatchObject({ userId: personas.member.id, name: 'Sync HTTP' });

    const duplicate = await request(app.getHttpServer())
      .post('/api/sync/events')
      .set('x-mock-user', personas.member.id)
      .send([event])
      .expect(200);
    expect(duplicate.body.confirmed[0]).toEqual(pushed.body.confirmed[0]);

    const pulled = await request(app.getHttpServer())
      .get('/api/sync/events')
      .query({ since: 0 })
      .set('x-mock-user', personas.member.id)
      .expect(200);
    expect(pulled.body.events[0]).toMatchObject({
      eventId,
      collectionId: 'resume',
      key: 'sync-http-resume',
      cursor: String(pulled.body.events[0].globalSeq),
    });
    expect(pulled.body.backendId).toEqual(expect.any(String));
  });

  it('acks local-only events and rejects reserved reset markers', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/sync/events')
      .set('x-mock-user', personas.member.id)
      .send([
        {
          ...event,
          eventId: crypto.randomUUID(),
          collectionId: 'resumeAiChat',
          key: 'local-only',
        },
        {
          ...event,
          eventId: crypto.randomUUID(),
          collectionId: '__sync_reset__',
          key: personas.member.id,
        },
      ])
      .expect(200);
    expect(response.body.confirmed).toEqual([
      { eventId: expect.any(String), globalSeq: 0 },
    ]);
    expect(response.body.failed).toEqual([
      {
        eventId: expect.any(String),
        message: expect.any(String),
        code: 'RESERVED_COLLECTION',
        retryable: false,
      },
    ]);
  });

  it('accepts a fresh compaction proposal and rejects a stale one', async () => {
    const [current] = await db
      .select({ seq: max(syncEvent.globalSeq) })
      .from(syncEvent)
      .where(eq(syncEvent.userId, personas.member.id));
    const proposal = {
      compactionId: crypto.randomUUID(),
      baseSeq: current?.seq ?? 0,
      prune: false,
      merged: { resume: 1 },
      pruned: {},
      ops: [
        {
          collectionId: 'resume',
          type: 'update',
          id: 'sync-http-resume',
          row: {
            id: 'sync-http-resume',
            userId: personas.member.id,
            name: 'Compacted sync HTTP',
          },
        },
      ],
    };
    const accepted = await request(app.getHttpServer())
      .post('/api/sync/compact')
      .set('x-mock-user', personas.member.id)
      .send(proposal)
      .expect(200);
    expect(accepted.body).toEqual({ status: 'accepted', events: 1 });

    const stale = await request(app.getHttpServer())
      .post('/api/sync/compact')
      .set('x-mock-user', personas.member.id)
      .send(proposal)
      .expect(200);
    expect(stale.body).toEqual({ status: 'stale' });
  });
});
