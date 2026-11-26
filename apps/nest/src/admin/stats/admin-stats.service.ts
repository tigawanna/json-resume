import { Inject, Injectable } from '@nestjs/common';
import { session, user } from '@repo/db/schema/auth-schema';
import { job } from '@repo/db/schema/job-schema';
import { publicResume } from '@repo/db/schema/resume/public-resume';
import { resume } from '@repo/db/schema/resume/resume';
import { syncBackend, syncEvent } from '@repo/db/schema/sync-schema';
import { count, gt, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { AdminStats } from './admin-stats.dto.js';

const DAY_MS = 86_400_000;

@Injectable()
export class AdminStatsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async read(): Promise<AdminStats> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const [
      [users],
      [admins],
      [resumes],
      [publicResumes],
      [jobs],
      [events],
      [unprojected],
      [eventsToday],
      [activeSessions],
      [backend],
    ] = await Promise.all([
      this.db.select({ n: count() }).from(user),
      this.db
        .select({ n: count() })
        .from(user)
        .where(
          sql`',' || replace(${user.role}, ' ', '') || ',' like '%,admin,%'`,
        ),
      this.db.select({ n: count() }).from(resume),
      this.db.select({ n: count() }).from(publicResume),
      this.db.select({ n: count() }).from(job),
      this.db.select({ n: count() }).from(syncEvent),
      this.db
        .select({ n: count() })
        .from(syncEvent)
        .where(isNull(syncEvent.projectedAt)),
      this.db
        .select({ n: count() })
        .from(syncEvent)
        .where(gt(syncEvent.serverTimestamp, dayAgo)),
      this.db
        .select({ n: count() })
        .from(session)
        .where(gt(session.expiresAt, now)),
      this.db
        .select({ lastProjectedSeq: syncBackend.lastProjectedSeq })
        .from(syncBackend)
        .limit(1),
    ]);

    return {
      users: users?.n ?? 0,
      admins: admins?.n ?? 0,
      resumes: resumes?.n ?? 0,
      publicResumes: publicResumes?.n ?? 0,
      jobs: jobs?.n ?? 0,
      events: events?.n ?? 0,
      unprojectedEvents: unprojected?.n ?? 0,
      eventsLast24h: eventsToday?.n ?? 0,
      activeSessions: activeSessions?.n ?? 0,
      lastProjectedSeq: backend?.lastProjectedSeq ?? null,
    };
  }
}
