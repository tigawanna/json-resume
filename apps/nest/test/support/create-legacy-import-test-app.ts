import type { INestApplication } from '@nestjs/common';
import type { NestNodeApplication } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AuthenticationModule } from '../../src/auth/authentication.module.js';
import {
  ADMIN_BYPASS_SECRET,
  MOCK_AUTH,
} from '../../src/auth/helpers/auth.constants.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import {
  createHttpAdapter,
  nestHttpOptions,
} from '../../src/bootstrap/http-adapter.js';
import { AppConfigModule } from '../../src/config/app-config.module.js';
import { DRIZZLE, type DrizzleDB } from '../../src/database/database.module.js';
import { LegacyImportModule } from '../../src/legacy-import/legacy-import.module.js';
import { createTestDatabase } from './create-test-app.js';
import { seedPersonas } from './personas.js';

export async function createLegacyImportTestApp(): Promise<{
  app: INestApplication<App>;
  db: DrizzleDB;
  close: () => Promise<void>;
}> {
  const database = await createTestDatabase();
  await seedPersonas({ db: database.db });
  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule, AuthenticationModule, LegacyImportModule],
  })
    .overrideProvider(DRIZZLE)
    .useValue(database.db)
    .overrideProvider(MOCK_AUTH)
    .useValue(true)
    .overrideProvider(ADMIN_BYPASS_SECRET)
    .useValue(undefined)
    .compile();
  const app = moduleRef.createNestApplication<NestNodeApplication>(
    createHttpAdapter(),
    nestHttpOptions,
  );
  await configureApp({ app });
  await app.init();
  return {
    app,
    db: database.db,
    close: async () => {
      await app.close();
      await database.close();
    },
  };
}

export const legacyImportRequest = (app: INestApplication<App>) =>
  request(app.getHttpServer());
