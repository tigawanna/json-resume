import type { INestApplication } from '@nestjs/common';
import { resume } from '@repo/db/postgres/schema/resume';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

describe('sync event ownership', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof createTestApp>>['db'];
  let closeDatabase: () => Promise<void>;

  const event = ({
    collectionId = 'resume',
    type,
    key,
    payload,
  }: {
    collectionId?: string;
    type: 'insert' | 'update' | 'delete';
    key: string;
    payload: Record<string, unknown>;
  }) => ({
    eventId: crypto.randomUUID(),
    collectionId,
    type,
    key,
    payload,
    previous: null,
    txId: crypto.randomUUID(),
    clientId: 'ownership-test',
    schemaVersion: 1,
    timestamp: Date.now(),
  });

  const push = (userId: string, events: ReturnType<typeof event>[]) =>
    request(app.getHttpServer())
      .post('/api/sync/events')
      .set('x-mock-user', userId)
      .send(events)
      .expect(200);

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    await db.insert(resume).values({
      id: 'victim-resume',
      userId: personas.admin.id,
      name: 'Victim',
    });
    await db.insert(resume).values({
      id: 'own-resume',
      userId: personas.member.id,
      name: 'Mine',
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('does not overwrite another user row even when the payload carries a userId', async () => {
    await push(
      personas.member.id,
      [
        event({
          type: 'update',
          key: 'victim-resume',
          payload: { id: 'victim-resume', userId: personas.member.id, name: 'Taken over' },
        }),
      ],
    );

    const [row] = await db
      .select()
      .from(resume)
      .where(eq(resume.id, 'victim-resume'))
      .limit(1);
    expect(row).toMatchObject({ userId: personas.admin.id, name: 'Victim' });
  });

  it('does not delete another user row', async () => {
    await push(personas.member.id, [
      event({ type: 'delete', key: 'victim-resume', payload: {} }),
    ]);

    const [row] = await db
      .select()
      .from(resume)
      .where(eq(resume.id, 'victim-resume'))
      .limit(1);
    expect(row?.userId).toBe(personas.admin.id);
  });

  it('does not let a poison event block later events', async () => {
    const bad = event({
      type: 'insert',
      key: 'bad-resume',
      payload: { id: 'bad-resume', userId: personas.member.id, layout: { nested: true } },
    });
    const good = event({
      type: 'insert',
      key: 'good-resume',
      payload: { id: 'good-resume', userId: personas.member.id, name: 'Good' },
    });
    await push(personas.member.id, [bad, good]);

    const [row] = await db.select().from(resume).where(eq(resume.id, 'good-resume')).limit(1);
    expect(row?.name).toBe('Good');
  });

  it('still projects the owner own updates', async () => {
    await push(personas.member.id, [
      event({
        type: 'update',
        key: 'own-resume',
        payload: { id: 'own-resume', userId: personas.member.id, name: 'Updated' },
      }),
    ]);

    const [row] = await db.select().from(resume).where(eq(resume.id, 'own-resume')).limit(1);
    expect(row).toMatchObject({ userId: personas.member.id, name: 'Updated' });
  });
});
