import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { CreditsModule } from "../credits/credits.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { WAITLIST_CLAIM_RATE_LIMIT } from "./waitlist.constants.js";
import { WaitlistController } from "./waitlist.controller.js";
import { WaitlistService } from "./waitlist.service.js";

@Module({
  imports: [
    DatabaseModule,
    CreditsModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: WAITLIST_CLAIM_RATE_LIMIT.ttlMs, limit: WAITLIST_CLAIM_RATE_LIMIT.limit }],
      getTracker: (req) => `ip:${req.ip ?? "unknown"}`,
    }),
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
