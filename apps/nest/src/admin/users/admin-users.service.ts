import { Inject, Injectable } from '@nestjs/common';
import { user } from '@repo/db/schema/auth-schema';
import { resume } from '@repo/db/schema/resume/resume';
import { syncEvent } from '@repo/db/schema/sync-schema';
import { count, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { AdminUser } from './admin-users.dto.js';

@Injectable()
export class AdminUsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll(): Promise<AdminUser[]> {
    const eventCounts = this.db
      .select({ userId: syncEvent.userId, events: count().as('events') })
      .from(syncEvent)
      .groupBy(syncEvent.userId)
      .as('event_counts');
    const resumeCounts = this.db
      .select({ userId: resume.userId, resumes: count().as('resumes') })
      .from(resume)
      .groupBy(resume.userId)
      .as('resume_counts');
    return this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        banned: user.banned,
        createdAt: sql<number>`${user.createdAt}`.mapWith(Number),
        events: sql<number>`coalesce(${eventCounts.events}, 0)`.mapWith(Number),
        resumes: sql<number>`coalesce(${resumeCounts.resumes}, 0)`.mapWith(
          Number,
        ),
      })
      .from(user)
      .leftJoin(eventCounts, eq(user.id, eventCounts.userId))
      .leftJoin(resumeCounts, eq(user.id, resumeCounts.userId))
      .orderBy(user.name);
  }
}
