import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './support/create-test-app.js';

describe('platform probes', () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('serves liveness at the root without a session', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('serves readiness at the root after checking the database', async () => {
    const response = await request(app.getHttpServer())
      .get('/ready')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('keeps probes out of the /api prefix', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(404);
    await request(app.getHttpServer()).get('/api/ready').expect(404);
  });
});
