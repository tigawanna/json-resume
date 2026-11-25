import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createObserveModule } from "@nestjs/observe";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthenticationModule } from "./auth/authentication.module.js";
import { AppConfigModule } from "./config/app-config.module.js";
import { CreditsModule } from "./credits/credits.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { SyncModule } from "./sync/sync.module.js";
import { RateLimitModule } from "./rate-limit/rate-limit.module.js";
import { WaitlistModule } from "./waitlist/waitlist.module.js";
import type { AppEnv } from "./config/env.schema.js";

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthenticationModule,
    RateLimitModule,
    CreditsModule,
    WaitlistModule,
    SyncModule,
    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => ({
        enabled: false,
        appKey: config.get("OBSERVE_APP_KEY", { infer: true }),
        appSecret: config.get("OBSERVE_APP_SECRET", { infer: true }),
        serviceId: "nest",
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
