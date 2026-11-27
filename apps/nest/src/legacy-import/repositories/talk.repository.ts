import { Injectable, Inject } from '@nestjs/common';
import { resumeTalk } from '@repo/db/postgres/schema/resume/resume-talk';
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
export class LegacyTalkRepository {
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
        id: resumeTalk.id,
        title: resumeTalk.title,
        event: resumeTalk.event,
        date: resumeTalk.date,
        description: resumeTalk.description,
        links: resumeTalk.links,
        sortOrder: resumeTalk.sortOrder,
        createdAt: resumeTalk.createdAt,
        updatedAt: resumeTalk.updatedAt,
      })
      .from(resumeTalk)
      .where(
        and(
          eq(resumeTalk.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [
              resumeTalk.title,
              resumeTalk.event,
              resumeTalk.description,
            ],
          }),
          idCursorCondition({
            column: resumeTalk.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before' ? desc(resumeTalk.id) : asc(resumeTalk.id),
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
