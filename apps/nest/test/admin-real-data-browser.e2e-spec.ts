import type { INestApplication } from '@nestjs/common';
import { account } from '@repo/db/schema/auth-schema';
import { resume } from '@repo/db/schema/resume/resume';
import { syncEvent } from '@repo/db/schema/sync-schema';
import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createRealDataApp } from './support/create-real-data-app.js';
import { textValue } from './support/row-value.js';

describe('admin table browser against a copy of the local database', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => void;
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
    closeDatabase();
  });

  it('lists physical rowid tables with real counts and no SQLite internals', async () => {
    const [events] = await db.select({ n: count() }).from(syncEvent);
    const response = await request(app.getHttpServer())
      .get('/api/admin/tables')
      .set(admin())
      .expect(200);
    const tables: Array<{ name: string; rowCount: number }> = response.body;
    const names = tables.map((table) => table.name);

    expect(names).toEqual(expect.arrayContaining(['user', 'resume', 'sync_event']));
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
    expect(page.body.rows[0].rowid).toEqual(expect.any(Number));

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
        await db.$client.execute({
          sql: `select rowid, account_id from account where ${column} is not null limit 1`,
          args: [],
        })
      ).rows;
      expect(staged).toBeDefined();
      const accountId = textValue({ value: staged.account_id });
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
        (entry: { rowid: number }) => Number(entry.rowid) === Number(staged.rowid),
      )?.cells;
      expect(cells?.[cell]).toBe('••••••');

      const detail = await request(app.getHttpServer())
        .get(`/api/admin/tables/account/rows/${Number(staged.rowid)}`)
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
});
