import { createClient } from '@libsql/client';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { migrationsFolder } from '@repo/db/migrations';
import { schema } from '@repo/db/schema/index';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { MOCK_AUTH } from '../../src/auth/helpers/auth.constants.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import type { CreditsPolicy } from '../../src/credits/allocate.js';
import { CREDITS_POLICY } from '../../src/credits/credits.service.js';
import { DRIZZLE } from '../../src/database/database.module.js';
import { seedPersonas } from './personas.js';

export async function createMemoryDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'nest-db-'));
  const client = createClient({ url: `file:${join(directory, 'test.db')}` });
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  return {
    db,
    close() {
      client.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export async function createTestApp({
  policy,
}: { policy?: CreditsPolicy } = {}) {
  const database = await createMemoryDatabase();
  const db = database.db;
  await seedPersonas({ db });
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DRIZZLE)
    .useValue(db)
    .overrideProvider(MOCK_AUTH)
    .useValue(true);
  const moduleRef = await (
    policy ? builder.overrideProvider(CREDITS_POLICY).useValue(policy) : builder
  ).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    bodyParser: false,
  });
  configureApp({ app });
  await app.init();
  return { app, db, close: () => database.close() };
}
