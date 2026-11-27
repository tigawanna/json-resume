import type { INestApplication } from '@nestjs/common';
import { createDefaultResume } from '@repo/isomorphic/resume/schema';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

const baseDocument = createDefaultResume();
const document = {
  ...baseDocument,
  header: {
    ...baseDocument.header,
    fullName: 'Ada Lovelace',
    headline: 'Staff Engineer',
  },
};

describe('public résumé API', () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;
  const member = () => ({ 'x-mock-user': personas.member.id });

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('returns 404 for an anonymous missing snapshot', async () => {
    await request(app.getHttpServer())
      .get('/api/public-resumes/missing')
      .expect(404);
  });

  it('publishes and reads a snapshot without authentication', async () => {
    const published = await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set(member())
      .send({ sourceResumeId: 'resume-public', title: 'Ada résumé', document })
      .expect(201);

    expect(published.body).toMatchObject({
      sourceResumeId: 'resume-public',
      title: 'Ada résumé',
      document: {
        header: { fullName: 'Ada Lovelace', headline: 'Staff Engineer' },
      },
      publishedAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    await request(app.getHttpServer())
      .get(`/api/public-resumes/${published.body.id}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(published.body.id);
        expect(response.body.document.header.fullName).toBe('Ada Lovelace');
      });
  });

  it('updates the same source snapshot instead of duplicating it', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set(member())
      .send({ sourceResumeId: 'resume-upsert', title: 'First', document })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set(member())
      .send({ sourceResumeId: 'resume-upsert', title: 'Second', document })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.title).toBe('Second');
  });

  it("lists and searches only the signed-in user's snapshots", async () => {
    await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set(member())
      .send({ sourceResumeId: 'resume-search', title: 'Searchable', document })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set({ 'x-mock-user': personas.admin.id })
      .send({ sourceResumeId: 'admin-private', title: 'Other user', document })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/public-resumes')
      .query({ keyword: 'staff engineer', limit: 20, offset: 0 })
      .set(member())
      .expect(200);

    expect(response.body.total).toBeGreaterThan(0);
    expect(
      response.body.items.every(
        (item: { title: string }) => item.title !== 'Other user',
      ),
    ).toBe(true);
    expect(response.body.items[0]).toMatchObject({
      headline: 'Staff Engineer',
      publishedAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("finds, renames, and unpublishes the owner's snapshot", async () => {
    const published = await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set(member())
      .send({ sourceResumeId: 'resume-rename', title: 'Before', document })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/public-resumes/mine')
      .query({ sourceResumeId: 'resume-rename' })
      .set(member())
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(published.body.id));

    await request(app.getHttpServer())
      .patch(`/api/public-resumes/${published.body.id}`)
      .set(member())
      .send({ title: 'After' })
      .expect(200)
      .expect((response) => expect(response.body.title).toBe('After'));

    await request(app.getHttpServer())
      .post(`/api/public-resumes/${published.body.id}/unpublish`)
      .set(member())
      .expect(200)
      .expect({ success: true });
    await request(app.getHttpServer())
      .get(`/api/public-resumes/${published.body.id}`)
      .expect(404);
  });

  it('does not let another user rename a snapshot', async () => {
    const published = await request(app.getHttpServer())
      .post('/api/public-resumes')
      .set(member())
      .send({ sourceResumeId: 'resume-owned', title: 'Owned', document })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/public-resumes/${published.body.id}`)
      .set({ 'x-mock-user': personas.admin.id })
      .send({ title: 'Stolen' })
      .expect(404);
  });
});
