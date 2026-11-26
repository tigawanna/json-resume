import { createClient } from '@libsql/client';
import type { NestNodeApplication } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { migrationsFolder } from '@repo/db/migrations';
import { schema } from '@repo/db/schema/index';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module.js';
import { ADMIN_BYPASS_SECRET, MOCK_AUTH } from '../../src/auth/helpers/auth.constants.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import { createHttpAdapter, nestHttpOptions } from '../../src/bootstrap/http-adapter.js';
import type { CreditsPolicy } from '../../src/credits/allocate.js';
import { CREDITS_POLICY } from '../../src/credits/credits.service.js';
import { DRIZZLE, type DrizzleDB } from '../../src/database/database.module.js';
import { seedPersonas } from './personas.js';

export type TestDatabase = { db: DrizzleDB; close: () => void };

export async function createMemoryDatabase(): Promise<TestDatabase> {
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
  adminBypassSecret,
  throttle = false,
  database: suppliedDatabase,
}: {
  policy?: CreditsPolicy;
  adminBypassSecret?: string;
  throttle?: boolean;
  /** Supply a snapshot (see copyLocalDatabase) to reuse real data without mocks. */
  database?: TestDatabase;
} = {}) {
  const database = suppliedDatabase ?? (await createMemoryDatabase());
  const db = database.db;
  if (!suppliedDatabase) await seedPersonas({ db });
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DRIZZLE)
    .useValue(db)
    .overrideProvider(MOCK_AUTH)
    .useValue(true)
    .overrideProvider(ADMIN_BYPASS_SECRET)
    .useValue(adminBypassSecret);
  if (!throttle) {
    builder = builder.overrideProvider(ThrottlerGuard).useValue({ canActivate: () => true });
  }
  const moduleRef = await (
    policy ? builder.overrideProvider(CREDITS_POLICY).useValue(policy) : builder
  ).compile();
  const app = moduleRef.createNestApplication<NestNodeApplication>(
    createHttpAdapter(),
    nestHttpOptions,
  );
  await configureApp({ app });
  await app.init();
  return { app, db, close: () => database.close() };
}
