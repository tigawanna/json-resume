import type { INestApplication } from '@nestjs/common';
import { account } from '@repo/db/schema/auth-schema';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

describe('admin table browser reads', () => {
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

  it('requires an unbanned admin on every table route', async () => {
    await request(app.getHttpServer()).get('/api/admin/tables').expect(401);
    await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set('x-mock-user', personas.member.id)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set('x-mock-user', personas.noRole.id)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set('x-mock-user', personas.bannedAdmin.id)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set('x-mock-user', personas.multiRole.id)
      .expect(200);
  });

  it('lists physical rowid tables with columns and counts', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set(admin)
      .expect(200);
    const users = response.body.find(
      (table: { name: string }) => table.name === 'user',
    );
    expect(users).toMatchObject({ name: 'user', rowCount: 8 });
    expect(users.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'email', notNull: true }),
        expect.objectContaining({ name: 'role', notNull: false }),
      ]),
    );
    expect(
      response.body.some((table: { name: string }) =>
        table.name.startsWith('sqlite_'),
      ),
    ).toBe(false);
  });

  it('masks secret cells in pages and row details', async () => {
    await db.insert(account).values({
      id: 'account-secret',
      accountId: 'secret-search',
      providerId: 'credential',
      userId: personas.member.id,
      accessToken: 'access-value',
      password: 'password-value',
      updatedAt: new Date(),
    });
    const page = await request(app.getHttpServer())
      .get('/api/admin/tables/account')
      .query({ q: 'secret-search', page: 0, pageSize: 50 })
      .set(admin)
      .expect(200);
    expect(page.body.total).toBe(1);
    expect(page.body.rows[0].cells).toMatchObject({
      access_token: '••••••',
      password: '••••••',
    });
    const rowid = Number(page.body.rows[0].rowid);
    const row = await request(app.getHttpServer())
      .get(`/api/admin/tables/account/rows/${rowid}`)
      .set(admin)
      .expect(200);
    expect(row.body.mode).toBe('direct');
    expect(row.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'password',
          value: null,
          kind: 'secret',
          editable: false,
        }),
        expect.objectContaining({
          name: 'access_token',
          value: null,
          kind: 'secret',
          editable: false,
        }),
      ]),
    );
  });

  it('validates table names and pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/tables/missing')
      .set(admin)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/admin/tables/user')
      .query({ page: -1 })
      .set(admin)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/admin/tables/user')
      .query({ pageSize: 201 })
      .set(admin)
      .expect(400);
  });
});
