import type { INestApplication } from '@nestjs/common';
import { account } from '@repo/db/postgres/schema/auth-schema';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { DrizzleDB } from '../src/database/database.module.js';
import { createTestApp } from './support/create-test-app.js';
import { personas } from './support/personas.js';

const repository = {
  id: 1,
  name: 'resume',
  full_name: 'octocat/resume',
  private: false,
  html_url: 'https://github.com/octocat/resume',
  description: 'Resume builder',
  fork: false,
  homepage: null,
  language: 'TypeScript',
  stargazers_count: 42,
  forks_count: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  visibility: 'public',
  topics: ['resume'],
};

describe('GitHub repository API', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    db = started.db;
    closeDatabase = started.close;
    await db.insert(account).values({
      id: 'github-account',
      accountId: 'octocat',
      providerId: 'github',
      userId: personas.member.id,
      accessToken: 'github-token',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/github/repos').expect(401);
  });

  it('returns an empty result when GitHub is not linked', async () => {
    await request(app.getHttpServer())
      .get('/api/github/repos')
      .set('x-mock-user', personas.noRole.id)
      .expect(200)
      .expect({ repos: [], hasToken: false });
  });

  it('lists repositories with the server-side GitHub token', async () => {
    const fetchMock = mockFetch([repository]);
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app.getHttpServer())
      .get('/api/github/repos')
      .set('x-mock-user', personas.member.id)
      .expect(200);

    expect(response.body).toEqual({ repos: [repository], hasToken: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer github-token',
    });
  });

  it('searches repositories and omits best-match sorting', async () => {
    const fetchMock = mockFetch({ login: 'octocat' }, {
      items: [repository],
      total_count: 1,
      incomplete_results: false,
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app.getHttpServer())
      .get('/api/github/repos/search')
      .query({
        query: 'resume',
        fork: 'fork',
        archived: 'active',
        sort: 'best-match',
      })
      .set('x-mock-user', personas.member.id)
      .expect(200);

    expect(response.body).toEqual({
      repos: [repository],
      totalCount: 1,
      incompleteResults: false,
      hasToken: true,
    });
    const searchUrl = new URL(requestUrl(fetchMock.mock.calls[1]?.[0]));
    expect(searchUrl.searchParams.get('q')).toBe(
      'user:octocat resume fork:only archived:false',
    );
    expect(searchUrl.searchParams.has('sort')).toBe(false);
  });

  it('rejects invalid search filters', async () => {
    await request(app.getHttpServer())
      .get('/api/github/repos/search')
      .query({ fork: 'unknown' })
      .set('x-mock-user', personas.member.id)
      .expect(400);
  });
});

function requestUrl(input: RequestInfo | URL | undefined) {
  if (!input) throw new Error("Expected a request URL");
  return input instanceof Request ? input.url : String(input);
}

function mockFetch(...responses: unknown[]) {
  let index = 0;
  return vi.fn<typeof fetch>(async () => {
    const body = responses[index] ?? responses.at(-1);
    index += 1;
    return Response.json(body, { status: 200 });
  });
}
