import { Inject, Injectable } from '@nestjs/common';
import { user } from '@repo/db/postgres/schema/auth-schema';
import { resume } from '@repo/db/postgres/schema/resume/resume';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { getTableName, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { AdminUser } from './admin-users.dto.js';

@Injectable()
export class AdminUsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll(): Promise<AdminUser[]> {
    // Qualify the outer key because the inner tables also have an id column.
    const outerUserId = sql`${sql.identifier(getTableName(user))}.${sql.identifier('id')}`;
    const rows = await this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        banned: user.banned,
        createdAt: user.createdAt,
        // Correlated counts use the existing user_id indexes instead of grouping
        // the entire event and résumé tables for every dashboard request.
        events:
          sql<number>`(select count(*) from ${syncEvent} where ${syncEvent.userId} = ${outerUserId})`.mapWith(
            Number,
          ),
        resumes:
          sql<number>`(select count(*) from ${resume} where ${resume.userId} = ${outerUserId})`.mapWith(
            Number,
          ),
      })
      .from(user)
      .orderBy(user.name);
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.getTime() }));
  }
}
