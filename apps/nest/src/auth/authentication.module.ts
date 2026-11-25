import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { AppEnv } from '../config/env.schema.js';
import {
  DatabaseModule,
  DRIZZLE,
  type DrizzleDB,
} from '../database/database.module.js';

import { createAuth } from './better-auth/create-auth.js';
import { AppAuthGuard } from './helpers/app-auth.guard.js';
import { ADMIN_BYPASS_SECRET, MOCK_AUTH } from './helpers/auth.constants.js';
import { MeController } from './me/me.controller.js';
import { AdminController } from './admin/admin.controller.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [ConfigService, DRIZZLE],
      disableGlobalAuthGuard: true,
      isGlobal: true,
      useFactory: (config: ConfigService<AppEnv, true>, db: DrizzleDB) => ({
        auth: createAuth({
          db,
          env: {
            secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
            baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
            trustedOrigins: config.get('TRUSTED_ORIGINS', { infer: true }),
            githubClientId: config.get('GITHUB_CLIENT_ID', { infer: true }),
            githubClientSecret: config.get('GITHUB_CLIENT_SECRET', {
              infer: true,
            }),
          },
        }),
      }),
    }),
  ],
  controllers: [MeController, AdminController],
  providers: [
    AppAuthGuard,
    { provide: APP_GUARD, useExisting: AppAuthGuard },
    { provide: MOCK_AUTH, useValue: false },
    {
      provide: ADMIN_BYPASS_SECRET,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => {
        if (config.get('NODE_ENV', { infer: true }) === 'production') return undefined;
        return config.get('ADMIN_BYPASS_SECRET', { infer: true });
      },
    },
  ],
  exports: [AppAuthGuard],
})
export class AuthenticationModule {}
