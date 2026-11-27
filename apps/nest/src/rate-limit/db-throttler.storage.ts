import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { rateLimitCounter } from '@repo/db/schema/rate-limit-schema';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';

type StorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/** Throttler counters in the shared database, not per-process memory. */
@Injectable()
export class DbThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<StorageRecord> {
    const now = Date.now();
    const expired = sql`(${rateLimitCounter.blockedUntil} > 0 and ${rateLimitCounter.blockedUntil} <= ${now})
      or (${rateLimitCounter.blockedUntil} = 0 and ${rateLimitCounter.expiresAt} <= ${now})`;
    const [row] = await this.db
      .insert(rateLimitCounter)
      .values({ key, hits: 1, expiresAt: now + ttl, blockedUntil: 0 })
      .onConflictDoUpdate({
        target: rateLimitCounter.key,
        set: {
          hits: sql`case when ${expired} then 1 else ${rateLimitCounter.hits} + 1 end`,
          expiresAt: sql`case when ${expired} then ${now + ttl} else ${rateLimitCounter.expiresAt} end`,
          blockedUntil: sql`case when ${expired} then 0 else ${rateLimitCounter.blockedUntil} end`,
        },
      })
      .returning();
    const hits = row?.hits ?? 1;
    const expiresAt = row?.expiresAt ?? now + ttl;
    let blockedUntil = row?.blockedUntil ?? 0;
    let isBlocked = blockedUntil > now;
    if (!isBlocked && blockDuration > 0 && hits > limit) {
      blockedUntil = now + blockDuration;
      isBlocked = true;
      await this.db
        .update(rateLimitCounter)
        .set({ blockedUntil })
        .where(eq(rateLimitCounter.key, key));
    }
    return {
      totalHits: hits,
      timeToExpire: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
      isBlocked,
      timeToBlockExpire: isBlocked
        ? Math.max(0, Math.ceil((blockedUntil - now) / 1000))
        : 0,
    };
  }
}
