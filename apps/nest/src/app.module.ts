import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthenticationModule } from './auth/authentication.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { CreditsModule } from './credits/credits.module.js';
import { DatabaseModule } from './database/database.module.js';
import { GithubModule } from './github/github.module.js';
import { HealthModule } from './health/health.module.js';
import { PublicResumeModule } from './public-resumes/public-resume.module.js';
import { SyncModule } from './sync/sync.module.js';
import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import type { AppEnv } from './config/env.schema.js';
import { AdminModule } from './admin/admin.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    GithubModule,
    PublicResumeModule,
    AuthenticationModule,
    RateLimitModule,
    CreditsModule,
    WaitlistModule,
    SyncModule,
    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => {
        const appKey = config.get('OBSERVE_APP_KEY', { infer: true });
        const appSecret = config.get('OBSERVE_APP_SECRET', { infer: true });
        return {
          // Turns on by itself in production once the keys are linked.
          enabled:
            config.get('NODE_ENV', { infer: true }) === 'production' &&
            Boolean(appKey && appSecret),
          appKey,
          appSecret,
          serviceId: 'nest',
          http: { ignore: ['/health', '/ready'] },
        };
      },
    }),
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
