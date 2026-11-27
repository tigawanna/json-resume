import type { INestApplication } from '@nestjs/common';
import { CREDIT_POLICY } from '@repo/isomorphic/credits-policy';
import { creditLedger, creditWallet } from '@repo/db/schema/credits-schema';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';
import { seedSyncEvent } from './support/seed-sync-event.js';

describe('resume credit charging during projection', () => {
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

  it('charges one monthly credit for a new resume and never double-charges a replay', async () => {
    const payload = {
      id: 'charge-resume',
      name: 'Charge me',
      userId: personas.member.id,
      createdAt: Date.now(),
    };
    await seedSyncEvent({ db, userId: personas.member.id, key: 'charge-resume', payload });
    await request(app.getHttpServer())
      .post('/api/admin/event-log/projection')
      .set(admin())
      .expect(200);

    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, personas.member.id));
    expect(wallet?.monthlyBalance).toBe(CREDIT_POLICY.monthlyCredits - CREDIT_POLICY.resumeCost);

    await seedSyncEvent({ db, userId: personas.member.id, key: 'charge-resume', payload });
    await request(app.getHttpServer())
      .post('/api/admin/event-log/projection')
      .set(admin())
      .expect(200);
    const spends = await db
      .select()
      .from(creditLedger)
      .where(
        and(
          eq(creditLedger.userId, personas.member.id),
          eq(creditLedger.resumeId, 'charge-resume'),
        ),
      );
    expect(spends.filter((row) => row.type === 'resume_spend')).toHaveLength(1);
  });

  it('grandfathers a resume created before CREDITS_START_AT', async () => {
    await seedSyncEvent({
      db,
      userId: personas.member.id,
      key: 'legacy-resume',
      payload: {
        id: 'legacy-resume',
        name: 'Legacy',
        userId: personas.member.id,
        createdAt: new Date('2020-01-01T00:00:00.000Z').getTime(),
      },
    });
    await request(app.getHttpServer())
      .post('/api/admin/event-log/projection')
      .set(admin())
      .expect(200);
    const [entry] = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, 'resume:legacy-resume'));
    expect(entry).toMatchObject({
      type: 'resume_spend',
      amount: 0,
      reason: 'legacy-import',
    });
  });
});

describe('resume credit overdraft', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp({
      policy: { ...CREDIT_POLICY, monthlyCredits: 0 },
    });
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('records an overdraft instead of dropping a resume with no credits', async () => {
    await seedSyncEvent({
      db,
      userId: personas.member.id,
      key: 'overdraft-resume',
      payload: {
        id: 'overdraft-resume',
        name: 'Still projected',
        userId: personas.member.id,
        createdAt: Date.now(),
      },
    });
    await request(app.getHttpServer())
      .post('/api/admin/event-log/projection')
      .set('x-mock-user', personas.admin.id)
      .expect(200);
    const [entry] = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, 'resume:overdraft-resume'));
    expect(entry).toMatchObject({ type: 'resume_overdraft', amount: 0 });
  });
});
