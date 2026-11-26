import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { creditLedger, creditWallet, waitlistEntry } from '@repo/db/schema/credits-schema';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createRealDataApp } from './support/create-real-data-app.js';

describe('admin mutations against a copy of the local database', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => void;
  let adminId: string;
  let adminEmail: string;
  let memberId: string;
  const admin = () => ({ 'x-mock-user': adminId });

  beforeAll(async () => {
    const started = await createRealDataApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    adminId = started.admin.id;
    adminEmail = started.admin.email;
    memberId = started.member.id;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('adds and removes a real waitlist row with an audit trail', async () => {
    const email = `real-data-${Date.now()}@example.com`;
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    let lines: string[] = [];
    try {
      const added = await request(app.getHttpServer())
        .post('/api/admin/waitlist')
        .set(admin())
        .send({ email })
        .expect(201);
      const [stored] = await db
        .select()
        .from(waitlistEntry)
        .where(eq(waitlistEntry.email, email));
      expect(stored?.id).toBe(added.body.id);

      await request(app.getHttpServer())
        .delete(`/api/admin/waitlist/${added.body.id}`)
        .set(admin())
        .expect(200);
      const [removed] = await db
        .select()
        .from(waitlistEntry)
        .where(eq(waitlistEntry.email, email));
      expect(removed?.status).toBe('removed');
      lines = log.mock.calls.map((call) => String(call[0]));
    } finally {
      log.mockRestore();
    }

    for (const action of ['waitlist.admin-add', 'waitlist.admin-remove']) {
      const line = lines.find((entry) => entry.includes(`"action":"${action}"`));
      expect(line).toContain('"outcome":"success"');
      expect(line).toContain(`"id":"${adminId}"`);
      expect(line).toContain(`"email":"${adminEmail}"`);
    }
  });

  it('grants bonus credits to a real user and records the ledger entry', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/admin/credits/${memberId}`)
      .set(admin())
      .expect(200);
    const idempotencyKey = `real-data-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post(`/api/admin/credits/${memberId}/adjustments`)
      .set(admin())
      .send({ amount: 5, reason: 'Real DB test grant', idempotencyKey })
      .expect(201);
    expect(response.body.bonus).toBe(before.body.bonus + 5);

    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, memberId));
    expect(wallet?.bonusBalance).toBe(before.body.bonus + 5);
    const [entry] = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, `admin:${idempotencyKey}`));
    expect(entry).toMatchObject({ userId: memberId, amount: 5, bucket: 'bonus' });

    await request(app.getHttpServer())
      .post(`/api/admin/credits/${memberId}/adjustments`)
      .set(admin())
      .send({ amount: -1000, reason: 'Should fail', idempotencyKey: `${idempotencyKey}-bad` })
      .expect(400);
  });

  it('reflects a synced row edit in the dashboard stats', async () => {
    const readStats = () =>
      request(app.getHttpServer())
        .get('/api/admin/stats')
        .set(admin())
        .expect(200);
    const before = await readStats();
    const [row] = (
      await db.$client.execute({
        sql: 'select rowid from resume order by rowid desc limit 1',
        args: [],
      })
    ).rows;
    await request(app.getHttpServer())
      .patch(`/api/admin/tables/resume/rows/${Number(row.rowid)}`)
      .set(admin())
      .send({ values: { name: `Cross-check ${Date.now()}` } })
      .expect(200);
    const after = await readStats();

    expect(after.body.events).toBe(before.body.events + 1);
    expect(after.body.resumes).toBe(before.body.resumes);
    expect(after.body.users).toBe(before.body.users);
  });
});
