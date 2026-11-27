import { Inject, Injectable } from '@nestjs/common';
import { resumeCertification } from '@repo/db/postgres/schema/resume/resume-certification';
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
export class LegacyCertificationRepository {
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
        id: resumeCertification.id,
        name: resumeCertification.name,
        issuer: resumeCertification.issuer,
        date: resumeCertification.date,
        url: resumeCertification.url,
        sortOrder: resumeCertification.sortOrder,
        createdAt: resumeCertification.createdAt,
        updatedAt: resumeCertification.updatedAt,
      })
      .from(resumeCertification)
      .where(
        and(
          eq(resumeCertification.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [resumeCertification.name, resumeCertification.issuer],
          }),
          idCursorCondition({
            column: resumeCertification.id,
            cursor: query.cursor,
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeCertification.id)
          : asc(resumeCertification.id),
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
