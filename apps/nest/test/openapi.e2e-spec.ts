import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './support/create-test-app.js';

type Schema = {
  $ref?: string;
  items?: Schema;
};

type Operation = {
  operationId?: string;
  security?: unknown;
  tags?: string[];
  responses: Record<string, { content?: { 'application/json'?: { schema?: Schema } } }>;
};

describe('Nest OpenAPI contract', () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;
  let paths: Record<string, Record<string, Operation>>;

  beforeAll(async () => {
    const started = await createTestApp();
    app = started.app;
    closeDatabase = started.close;
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    paths = response.body.paths;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('gives every operation a unique operationId', () => {
    const operations = Object.values(paths).flatMap((methods) => Object.values(methods));
    expect(operations.every((operation) => Boolean(operation.operationId))).toBe(true);
    const ids = operations.map((operation) => operation.operationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('types waitlist and credit-ledger cursor page items', () => {
    const waitlist = paths['/admin/waitlist'].get.responses['200'].content?.[
      'application/json'
    ]?.schema;
    expect(waitlist?.$ref).toBe('#/components/schemas/AdminWaitlistPageDto');

    const ledger = paths['/admin/credits/{userId}/ledger'].get.responses['200'].content?.[
      'application/json'
    ]?.schema;
    expect(ledger?.$ref).toBe('#/components/schemas/AdminCreditLedgerPageDto');
  });

  it('documents typed 401 and 403 responses on protected product routes', () => {
    for (const path of ['/me', '/credits', '/admin/stats', '/admin/tables']) {
      const responses = paths[path].get.responses;
      expect(responses['401'].content?.['application/json']?.schema?.$ref).toBe(
        '#/components/schemas/ApiErrorDto',
      );
      expect(responses['403'].content?.['application/json']?.schema?.$ref).toBe(
        '#/components/schemas/ApiErrorDto',
      );
    }
  });

  it('types validation and domain errors instead of leaving them unknown', () => {
    const expected = [
      ['/admin/waitlist', 'get', '400'],
      ['/admin/waitlist', 'post', '409'],
      ['/admin/tables/{table}', 'get', '404'],
      ['/admin/credits/{userId}', 'get', '404'],
      ['/waitlist', 'post', '400'],
    ] as const;
    for (const [path, method, status] of expected) {
      const schema = paths[path][method].responses[status].content?.[
        'application/json'
      ]?.schema;
      expect(schema?.$ref).toBe('#/components/schemas/ApiErrorDto');
    }
  });

  it('documents the real sync push, pull, and compaction contract', () => {
    for (const [path, method] of [
      ['/sync/events', 'post'],
      ['/sync/events', 'get'],
      ['/sync/compact', 'post'],
    ] as const) {
      const operation = paths[path][method];
      expect(operation.operationId).toEqual(expect.any(String));
      expect(operation.responses['200'].content?.['application/json']?.schema).toBeDefined();
    }
    expect(paths['/sync']).toBeUndefined();
  });

  it('keeps the public waitlist join route anonymous', () => {
    expect(paths['/waitlist'].post.responses['401']).toBeUndefined();
    expect(paths['/waitlist'].post.security).toBeUndefined();
  });
});
