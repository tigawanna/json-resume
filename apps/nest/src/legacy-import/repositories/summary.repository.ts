import { Inject, Injectable } from '@nestjs/common';
import { resumeSummary } from '@repo/db/postgres/schema/resume/resume-summary';
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
export class LegacySummaryRepository {
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
        id: resumeSummary.id,
        text: resumeSummary.text,
        sortOrder: resumeSummary.sortOrder,
        createdAt: resumeSummary.createdAt,
        updatedAt: resumeSummary.updatedAt,
      })
      .from(resumeSummary)
      .where(
        and(
          eq(resumeSummary.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [resumeSummary.text],
          }),
          idCursorCondition({
            column: resumeSummary.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeSummary.id)
          : asc(resumeSummary.id),
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
