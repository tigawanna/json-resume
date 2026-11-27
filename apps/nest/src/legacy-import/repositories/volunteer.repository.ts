import { Inject, Injectable } from '@nestjs/common';
import { resumeVolunteer } from '@repo/db/postgres/schema/resume/resume-volunteer';
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
export class LegacyVolunteerRepository {
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
        id: resumeVolunteer.id,
        organization: resumeVolunteer.organization,
        role: resumeVolunteer.role,
        startDate: resumeVolunteer.startDate,
        endDate: resumeVolunteer.endDate,
        description: resumeVolunteer.description,
        sortOrder: resumeVolunteer.sortOrder,
        createdAt: resumeVolunteer.createdAt,
        updatedAt: resumeVolunteer.updatedAt,
      })
      .from(resumeVolunteer)
      .where(
        and(
          eq(resumeVolunteer.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [
              resumeVolunteer.organization,
              resumeVolunteer.role,
              resumeVolunteer.description,
            ],
          }),
          idCursorCondition({
            column: resumeVolunteer.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeVolunteer.id)
          : asc(resumeVolunteer.id),
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
