import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './support/create-test-app.js';

describe('auth viewer', () => {
  let app: INestApplication<App>;
  let closeDatabase: () => void;

  beforeAll(async () => {
    const started = await createTestApp({ mockAuth: false });
    app = started.app;
    closeDatabase = started.close;
  });

  afterAll(async () => {
    await app.close();
    closeDatabase();
  });

  it('returns the full signed-in Better Auth payload', async () => {
    const email = `viewer-${Date.now()}@example.com`;
    const signUp = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'password123', name: 'Viewer User' })
      .expect(200);
    const setCookie = signUp.headers['set-cookie'];
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie)
      .split(';')[0];
    expect(cookie).toContain('better-auth.session_token=');

    const response = await request(app.getHttpServer())
      .get('/api/viewer')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.user).toMatchObject({
      email,
      name: 'Viewer User',
      emailVerified: false,
      role: 'user',
    });
    expect(response.body.session).toMatchObject({
      userId: response.body.user.id,
      userAgent: expect.any(String),
    });
    for (const field of ['createdAt', 'updatedAt']) {
      expect(typeof response.body.user[field]).toBe('string');
    }
    expect(
      response.body.user.banExpires === null ||
        typeof response.body.user.banExpires === 'string',
    ).toBe(true);
    for (const field of ['expiresAt', 'createdAt', 'updatedAt']) {
      expect(typeof response.body.session[field]).toBe('string');
    }
  });

  it('rejects a request without a session cookie', async () => {
    await request(app.getHttpServer()).get('/api/viewer').expect(401);
  });
});
