import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HTTP_RATE_LIMIT } from "./rate-limit.constants.js";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: HTTP_RATE_LIMIT.ttlMs, limit: HTTP_RATE_LIMIT.limit }],
      getTracker: (req) => {
        const userId = (req as { user?: { id?: string } }).user?.id;
        if (userId) return `user:${userId}`;
        return `ip:${req.ip ?? "unknown"}`;
      },
    }),
  ],
  providers: [
    ThrottlerGuard,
    { provide: APP_GUARD, useExisting: ThrottlerGuard },
  ],
})
export class RateLimitModule {}
