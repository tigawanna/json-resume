import { Inject, Injectable } from '@nestjs/common';
import { resumeProject } from '@repo/db/postgres/schema/resume/resume-project';
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
export class LegacyProjectRepository {
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
        id: resumeProject.id,
        name: resumeProject.name,
        url: resumeProject.url,
        homepageUrl: resumeProject.homepageUrl,
        description: resumeProject.description,
        tech: resumeProject.tech,
        sortOrder: resumeProject.sortOrder,
        createdAt: resumeProject.createdAt,
        updatedAt: resumeProject.updatedAt,
      })
      .from(resumeProject)
      .where(
        and(
          eq(resumeProject.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [
              resumeProject.name,
              resumeProject.description,
              resumeProject.tech,
            ],
          }),
          idCursorCondition({
            column: resumeProject.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeProject.id)
          : asc(resumeProject.id),
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
