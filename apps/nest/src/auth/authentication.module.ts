import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import type { AppEnv } from "../config/env.schema.js";
import { DatabaseModule, DRIZZLE, type DrizzleDB } from "../database/database.module.js";
import { AdminController } from "./admin.controller.js";
import { AppAuthGuard } from "./app-auth.guard.js";
import { MOCK_AUTH } from "./auth.constants.js";
import { createAuth } from "./create-auth.js";
import { MeController } from "./me.controller.js";

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
            secret: config.get("BETTER_AUTH_SECRET", { infer: true }),
            baseURL: config.get("BETTER_AUTH_URL", { infer: true }),
            trustedOrigins: config.get("TRUSTED_ORIGINS", { infer: true }),
            githubClientId: config.get("GITHUB_CLIENT_ID", { infer: true }),
            githubClientSecret: config.get("GITHUB_CLIENT_SECRET", { infer: true }),
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
  ],
  exports: [AppAuthGuard],
})
export class AuthenticationModule {}
