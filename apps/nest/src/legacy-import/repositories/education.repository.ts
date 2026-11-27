import { Inject, Injectable } from '@nestjs/common';
import { resumeEducation } from '@repo/db/postgres/schema/resume/resume-education';
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
export class LegacyEducationRepository {
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
        id: resumeEducation.id,
        school: resumeEducation.school,
        degree: resumeEducation.degree,
        field: resumeEducation.field,
        startDate: resumeEducation.startDate,
        endDate: resumeEducation.endDate,
        description: resumeEducation.description,
        sortOrder: resumeEducation.sortOrder,
        createdAt: resumeEducation.createdAt,
        updatedAt: resumeEducation.updatedAt,
      })
      .from(resumeEducation)
      .where(
        and(
          eq(resumeEducation.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [
              resumeEducation.school,
              resumeEducation.degree,
              resumeEducation.field,
              resumeEducation.description,
            ],
          }),
          idCursorCondition({
            column: resumeEducation.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeEducation.id)
          : asc(resumeEducation.id),
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
