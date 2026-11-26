import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

describe('admin mutation audit logs', () => {
  let app: INestApplication<App>;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('audits waitlist and credit mutations with the authenticated admin', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    let lines: string[] = [];
    try {
      const added = await request(app.getHttpServer())
        .post('/api/admin/waitlist')
        .set('x-mock-user', personas.admin.id)
        .send({ email: 'audited@example.com' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/admin/waitlist/${added.body.id}`)
        .set('x-mock-user', personas.admin.id)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/admin/credits/${personas.member.id}/adjustments`)
        .set('x-mock-user', personas.admin.id)
        .send({
          amount: 5,
          reason: 'Support grant',
          idempotencyKey: 'audit-test',
        })
        .expect(201);
      lines = log.mock.calls.map((call) => String(call[0]));
    } finally {
      log.mockRestore();
    }

    expect(
      lines.find((line) => line.includes('"action":"waitlist.admin-add"')),
    ).toContain('"outcome":"success"');
    expect(
      lines.find((line) => line.includes('"action":"waitlist.admin-remove"')),
    ).toContain('"outcome":"success"');
    const creditAudit = lines.find((line) =>
      line.includes('"action":"credits.admin-adjust"'),
    );
    expect(creditAudit).toContain('"outcome":"success"');
    expect(creditAudit).toContain(`"id":"${personas.admin.id}"`);
    expect(creditAudit).toContain('"email":"admin@example.com"');
  });
});
