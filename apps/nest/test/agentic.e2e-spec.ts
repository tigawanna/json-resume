import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Auth } from '../src/auth/better-auth/create-auth.js';
import { createTestApp } from './support/create-test-app.js';
import { seedLegacyImportRows } from './support/legacy-import-fixtures.js';
import { personas } from './support/personas.js';

describe('external agentic API', () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;
  let apiKey: string;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
    await seedLegacyImportRows({ db: started.db });
    const auth = app.get<AuthService<Auth>>(AuthService);
    const created = await auth.api.createApiKey({
      body: {
        userId: personas.member.id,
        name: 'agentic-test',
        permissions: { resumes: ['read'] },
      },
    });
    apiKey = created.key;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('serves the external OpenAPI document and UI', async () => {
    const spec = await request(app.getHttpServer())
      .get('/api/agentic/openapi/json')
      .expect(200);
    expect(spec.body.paths).toMatchObject({
      '/resumes/list': expect.any(Object),
      '/library/search': expect.any(Object),
      '/jobs/get': expect.any(Object),
    });
    await request(app.getHttpServer())
      .get('/api/agentic/openapi')
      .expect(200)
      .expect((response) =>
        expect(response.text).toContain('Agentic JSON Resume API'),
      );
  });

  it('rejects OpenAPI calls without an API key', async () => {
    await request(app.getHttpServer())
      .post('/api/agentic/resumes/list')
      .send({})
      .expect(401);
  });

  it('lists resumes through the OpenAPI transport', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/agentic/resumes/list')
      .set('x-api-key', apiKey)
      .send({ limit: 20, offset: 0 })
      .expect(200);
    expect(response.body.resumes).toEqual([
      expect.objectContaining({
        id: 'resume-owner',
        jobLabel: 'Analytical Engines — Engineer',
      }),
    ]);
    expect(response.body.total).toBe(1);
  });

  it('reads résumé detail and linked jobs', async () => {
    const resume = await request(app.getHttpServer())
      .post('/api/agentic/resumes/get')
      .set('x-api-key', apiKey)
      .send({ resumeId: 'resume-owner', sections: ['experience', 'job'] })
      .expect(200);
    expect(resume.body.resume.experience).toEqual([
      expect.objectContaining({
        id: 'experience-owner',
        company: 'Analytical Engines',
      }),
    ]);
    expect(resume.body.resume.job).toMatchObject({
      id: 'job-owner',
      description: 'Build the Difference Engine',
    });

    const job = await request(app.getHttpServer())
      .post('/api/agentic/jobs/get')
      .set('x-api-key', apiKey)
      .send({ resumeId: 'resume-owner' })
      .expect(200);
    expect(job.body.job).toMatchObject({
      id: 'job-owner',
      linkedResumeIds: ['resume-owner'],
    });
  });

  it('searches and ranks owner-scoped library rows', async () => {
    const search = await request(app.getHttpServer())
      .post('/api/agentic/library/search')
      .set('x-api-key', apiKey)
      .send({
        section: 'experience',
        keyword: 'analytical',
        resumeId: 'resume-owner',
        limit: 20,
        offset: 0,
      })
      .expect(200);
    expect(search.body.items).toEqual([
      expect.objectContaining({ id: 'experience-owner', onResume: true }),
    ]);

    const ranked = await request(app.getHttpServer())
      .post('/api/agentic/library/rank-for-job')
      .set('x-api-key', apiKey)
      .send({
        jobId: 'job-owner',
        resumeId: 'resume-owner',
        sections: ['experience'],
        includeOnResume: true,
      })
      .expect(200);
    expect(ranked.body.results[0]).toMatchObject({
      id: 'experience-owner',
      section: 'experience',
    });
  });

  it('preserves the RPC transport', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/agentic/rpc/resumes/list')
      .set('x-api-key', apiKey)
      .send({ json: {} })
      .expect(200);
    expect(response.body.json.resumes).toEqual([
      expect.objectContaining({ id: 'resume-owner' }),
    ]);
  });
});
