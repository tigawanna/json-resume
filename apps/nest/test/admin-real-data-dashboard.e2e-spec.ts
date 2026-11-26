import type { INestApplication } from '@nestjs/common';
import { user } from '@repo/db/schema/auth-schema';
import { job } from '@repo/db/schema/job-schema';
import { publicResume } from '@repo/db/schema/resume/public-resume';
import { resume } from '@repo/db/schema/resume/resume';
import { syncBackend, syncEvent } from '@repo/db/schema/sync-schema';
import { count, eq, isNull } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createRealDataApp } from './support/create-real-data-app.js';

describe('admin dashboard against a copy of the local database', () => {
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

  it('reports counts computed from the real tables', async () => {
    const [[users], [resumes], [published], [jobs], [events], [unprojected], [backend]] =
      await Promise.all([
        db.select({ n: count() }).from(user),
        db.select({ n: count() }).from(resume),
        db.select({ n: count() }).from(publicResume),
        db.select({ n: count() }).from(job),
        db.select({ n: count() }).from(syncEvent),
        db.select({ n: count() }).from(syncEvent).where(isNull(syncEvent.projectedAt)),
        db.select({ seq: syncBackend.lastProjectedSeq }).from(syncBackend).limit(1),
      ]);
    const response = await request(app.getHttpServer())
      .get('/api/admin/stats')
      .set(admin())
      .expect(200);

    expect(response.body).toMatchObject({
      users: users.n,
      resumes: resumes.n,
      publicResumes: published.n,
      jobs: jobs.n,
      events: events.n,
      unprojectedEvents: unprojected.n,
      lastProjectedSeq: backend?.seq ?? null,
    });
    expect(response.body.admins).toBeGreaterThanOrEqual(1);
    expect(response.body.activeSessions).toBeGreaterThanOrEqual(0);
    expect(typeof response.body.eventsLast24h).toBe('number');
  });

  it('lists every real user with counts and no credential fields', async () => {
    const users = await db.select({ id: user.id }).from(user);
    const response = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set(admin())
      .expect(200);

    expect(response.body).toHaveLength(users.length);
    const row = response.body.find((entry: { id: string }) => entry.id === adminId);
    expect(row).toMatchObject({ id: adminId, email: adminEmail, banned: false });
    expect(row.resumes).toBeGreaterThan(0);
    expect(row.events).toBeGreaterThan(0);
    expect(Object.keys(row).sort()).toEqual(
      [
        'banned',
        'createdAt',
        'email',
        'emailVerified',
        'events',
        'id',
        'name',
        'resumes',
        'role',
      ].sort(),
    );
  });

  it('counts admin roles with the same whitespace rules as authorization', async () => {
    const before = await request(app.getHttpServer())
      .get('/api/admin/stats')
      .set(admin())
      .expect(200);
    const id = crypto.randomUUID();
    await db.insert(user).values({
      id,
      name: 'Whitespace admin',
      email: `${id}@example.com`,
      emailVerified: true,
      role: ' user,\tadmin\n',
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    try {
      const after = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set(admin())
        .expect(200);
      expect(after.body.admins).toBe(before.body.admins + 1);
      expect(after.body.users).toBe(before.body.users + 1);
    } finally {
      await db.delete(user).where(eq(user.id, id));
    }
  });

  it('probes the real admin session and refuses unsigned, member and banned users', async () => {
    const probe = await request(app.getHttpServer())
      .get('/api/admin/session')
      .set(admin())
      .expect(200);
    expect(probe.body).toMatchObject({ id: adminId, email: adminEmail });

    await request(app.getHttpServer()).get('/api/admin/session').expect(401);
    await request(app.getHttpServer())
      .get('/api/admin/session')
      .set('x-mock-user', memberId)
      .expect(403);

    try {
      await db.update(user).set({ banned: true }).where(eq(user.id, adminId));
      await request(app.getHttpServer())
        .get('/api/admin/session')
        .set(admin())
        .expect(403);
    } finally {
      await db.update(user).set({ banned: false }).where(eq(user.id, adminId));
    }
  });
});
