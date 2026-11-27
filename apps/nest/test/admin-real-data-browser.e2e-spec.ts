import type { INestApplication } from '@nestjs/common';
import { account, user } from '@repo/db/postgres/schema/auth-schema';
import { resume } from '@repo/db/postgres/schema/resume/resume';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { encodeAdminRowKeyFromRow } from '../src/admin/tables/admin-row-key.js';
import { createRealDataApp } from './support/create-real-data-app.js';
import { textValue } from './support/row-value.js';

describe('admin table browser against a copy of the local database', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;
  let adminId: string;
  const admin = () => ({ 'x-mock-user': adminId });

  beforeAll(async () => {
    const started = await createRealDataApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    adminId = started.admin.id;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('lists Postgres tables with real counts and no SQLite internals', async () => {
    const [events] = await db.select({ n: count() }).from(syncEvent);
    const response = await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set(admin())
      .expect(200);
    const tables: Array<{ name: string; rowCount: number }> = response.body;
    const names = tables.map((table) => table.name);

    expect(names).toEqual(
      expect.arrayContaining(['user', 'resume', 'sync_event']),
    );
    expect(names.some((name) => name.startsWith('sqlite_'))).toBe(false);
    expect(tables.find((table) => table.name === 'sync_event')?.rowCount).toBe(
      events.n,
    );
  });

  it('pages and searches real résumés without loading every row', async () => {
    const [resumes] = await db.select({ n: count() }).from(resume);
    const page = await request(app.getHttpServer())
      .get('/api/admin/tables/resume')
      .query({ page: 0, pageSize: 5 })
      .set(admin())
      .expect(200);
    expect(page.body).toMatchObject({
      table: 'resume',
      total: resumes.n,
      page: 0,
      pageSize: 5,
    });
    expect(page.body.rows).toHaveLength(5);
    expect(page.body.rows[0].rowKey).toEqual(expect.any(String));

    const search = await request(app.getHttpServer())
      .get('/api/admin/tables/resume')
      .query({ q: 'React', pageSize: 200 })
      .set(admin())
      .expect(200);
    expect(search.body.total).toBeGreaterThan(0);
    expect(search.body.total).toBeLessThanOrEqual(resumes.n);
    expect(
      search.body.rows.some((row: { cells: { name: string } }) =>
        String(row.cells.name).toLowerCase().includes('react'),
      ),
    ).toBe(true);
  });

  it('masks real password and token cells in a page and a row detail', async () => {
    for (const { column, cell } of [
      { column: 'password', cell: 'password' },
      { column: 'access_token', cell: 'access_token' },
    ]) {
      const [staged] = (
        await db.$client.query({
          text: `select id, account_id from account where "${column}" is not null limit 1`,
          values: [],
        })
      ).rows;
      expect(staged).toBeDefined();
      const accountId = textValue({ value: staged.account_id });
      const rowKey = encodeAdminRowKeyFromRow({
        row: staged,
        columns: ['id'],
      });
      const [row] = await db
        .select()
        .from(account)
        .where(eq(account.accountId, accountId))
        .limit(1);
      expect(row).toBeDefined();

      const page = await request(app.getHttpServer())
        .get('/api/admin/tables/account')
        .query({ q: accountId })
        .set(admin())
        .expect(200);
      const cells = page.body.rows.find(
        (entry: { rowKey: string }) => entry.rowKey === rowKey,
      )?.cells;
      expect(cells?.[cell]).toBe('••••••');

      const detail = await request(app.getHttpServer())
        .get(`/api/admin/tables/account/rows/${rowKey}`)
        .set(admin())
        .expect(200);
      expect(detail.body.mode).toBe('direct');
      expect(detail.body.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: cell,
            kind: 'secret',
            value: null,
            editable: false,
          }),
        ]),
      );
    }
  });

  it('accepts boolean text and rejects a client-supplied updated_at', async () => {
    const [row] = (
      await db.$client.query({
        text: 'select id, email_verified from "user" order by id limit 1',
        values: [],
      })
    ).rows;
    expect(row).toBeDefined();
    const original = row.email_verified === true;
    const rowKey = encodeAdminRowKeyFromRow({ row, columns: ['id'] });
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/tables/user/rows/${rowKey}`)
      .set(admin())
      .send({ values: { email_verified: original ? 'false' : 'true' } })
      .expect(200);
    expect(response.body).toEqual({ mode: 'direct', changed: 1 });

    const [updated] = await db
      .select()
      .from(user)
      .where(eq(user.id, textValue({ value: row.id })));
    expect(updated?.emailVerified).toBe(!original);

    const detail = await request(app.getHttpServer())
      .get(`/api/admin/tables/user/rows/${rowKey}`)
      .set(admin())
      .expect(200);
    expect(detail.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'updated_at', editable: false }),
      ]),
    );
    await request(app.getHttpServer())
      .patch(`/api/admin/tables/user/rows/${rowKey}`)
      .set(admin())
      .send({ values: { updated_at: '0' } })
      .expect(400);
  });
});
