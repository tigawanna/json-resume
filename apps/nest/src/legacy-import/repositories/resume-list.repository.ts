import { Inject, Injectable } from '@nestjs/common';
import { resume } from '@repo/db/postgres/schema/resume/resume';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { LegacyImportResumeListQueryDto } from '../dto/query.dto.js';
import { searchCondition } from '../queries/common.js';

@Injectable()
export class LegacyResumeListRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportResumeListQueryDto;
  }) {
    const rows = await this.db
      .select({
        id: resume.id,
        name: resume.name,
        fullName: resume.fullName,
        headline: resume.headline,
        description: resume.description,
        templateId: resume.templateId,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      })
      .from(resume)
      .where(
        and(
          eq(resume.userId, userId),
          query.id ? eq(resume.id, query.id) : undefined,
          searchCondition({
            keyword: query.keyword,
            columns: [
              resume.name,
              resume.fullName,
              resume.headline,
              resume.description,
            ],
          }),
        ),
      )
      .orderBy(desc(resume.updatedAt));

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }
}
