import { Pool } from "pg";
import type { NestNodeApplication } from "@nestjs/platform-node";
import { Test, type TestingModuleBuilder } from "@nestjs/testing";
import { schema } from "@repo/db/postgres";
import { postgresMigrationsFolder } from "@repo/db/postgres/migrations";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppModule } from "../../src/app.module.js";
import { ADMIN_BYPASS_SECRET, MOCK_AUTH } from "../../src/auth/helpers/auth.constants.js";
import { configureApp } from "../../src/bootstrap/configure-app.js";
import { createHttpAdapter, nestHttpOptions } from "../../src/bootstrap/http-adapter.js";
import type { CreditsPolicy } from "../../src/credits/allocate.js";
import { CREDITS_POLICY } from "../../src/credits/credits.service.js";
import { DRIZZLE, type DrizzleDB } from "../../src/database/database.module.js";
import { seedPersonas } from "./personas.js";

export type TestDatabase = { db: DrizzleDB; close: () => Promise<void> };

function requireTestUrl() {
  const url = process.env.NEST_TEST_POSTGRES_URL;
  if (!url) throw new Error("NEST_TEST_POSTGRES_URL must point to a Postgres admin/test database");
  return url;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = requireTestUrl();
  const databaseName = `nest_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const url = new URL(adminUrl);
    url.pathname = `/${databaseName}`;
    pool = new Pool({ connectionString: url.toString(), max: 2 });
    const db = drizzle({ client: pool, schema });
    await migrate(db, { migrationsFolder: postgresMigrationsFolder });
    const activePool = pool;
    return {
      db,
      async close() {
        await activePool.end();
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
        await admin.end();
      },
    };
  } catch (error: unknown) {
    await pool?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
    throw error;
  }
}

export async function createTestApp({
  policy,
  adminBypassSecret,
  throttle = false,
  mockAuth = true,
  database: suppliedDatabase,
  override,
}: {
  policy?: CreditsPolicy;
  adminBypassSecret?: string;
  throttle?: boolean;
  /** False exercises the real Better Auth cookie path. */
  mockAuth?: boolean;
  /** Supply a pre-migrated Postgres test database. */
  database?: TestDatabase;
  /** Replace providers before compiling, for isolated orchestration tests. */
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
} = {}) {
  const database = suppliedDatabase ?? (await createTestDatabase());
  const db = database.db;
  if (!suppliedDatabase) await seedPersonas({ db });
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DRIZZLE)
    .useValue(db)
    .overrideProvider(MOCK_AUTH)
    .useValue(mockAuth)
    .overrideProvider(ADMIN_BYPASS_SECRET)
    .useValue(adminBypassSecret);
  if (!throttle) {
    builder = builder.overrideProvider(ThrottlerGuard).useValue({ canActivate: () => true });
  }
  const configuredBuilder = override ? override(builder) : builder;
  const moduleRef = await (
    policy ? configuredBuilder.overrideProvider(CREDITS_POLICY).useValue(policy) : configuredBuilder
  ).compile();
  const app = moduleRef.createNestApplication<NestNodeApplication>(
    createHttpAdapter(),
    nestHttpOptions,
  );
  await configureApp({ app });
  await app.init();
  return { app, db, close: () => database.close() };
}
