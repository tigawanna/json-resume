import { Inject, Injectable } from '@nestjs/common';
import { resumeLanguage } from '@repo/db/postgres/schema/resume/resume-language';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { LegacyImportListQueryDto } from '../dto/query.dto.js';
import {
  DEFAULT_PAGE_SIZE,
  idCursorCondition,
  pageRows,
  searchCondition,
} from '../queries/common.js';

@Injectable()
export class LegacyLanguageRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    const rows = await this.db
      .select({
        id: resumeLanguage.id,
        name: resumeLanguage.name,
        proficiency: resumeLanguage.proficiency,
        sortOrder: resumeLanguage.sortOrder,
        createdAt: resumeLanguage.createdAt,
        updatedAt: resumeLanguage.updatedAt,
      })
      .from(resumeLanguage)
      .where(
        and(
          eq(resumeLanguage.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [resumeLanguage.name, resumeLanguage.proficiency],
          }),
          idCursorCondition({
            column: resumeLanguage.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeLanguage.id)
          : asc(resumeLanguage.id),
      )
      .limit(DEFAULT_PAGE_SIZE + 1);

    return pageRows({
      rows: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      cursor: query.cursor,
      direction: query.direction,
      getId: (row) => row.id,
    });
  }
}
