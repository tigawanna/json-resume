import { Inject, Injectable } from '@nestjs/common';
import { resumeLink } from '@repo/db/postgres/schema/resume/resume-link';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { LegacyImportListQueryDto } from '../dto/query.dto.js';
import { pageRows, searchCondition } from '../queries/common.js';
import { newestByKey } from '../queries/group-rows.js';

function linkIdentity(row: {
  label: string;
  url: string;
  icon: string | null;
}) {
  return [
    row.label.trim().toLowerCase(),
    row.url.trim().toLowerCase(),
    row.icon?.trim() ?? '',
  ].join('\u001f');
}

@Injectable()
export class LegacyLinkRepository {
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
        id: resumeLink.id,
        label: resumeLink.label,
        url: resumeLink.url,
        icon: resumeLink.icon,
        sortOrder: resumeLink.sortOrder,
        createdAt: resumeLink.createdAt,
        updatedAt: resumeLink.updatedAt,
      })
      .from(resumeLink)
      .where(
        and(
          eq(resumeLink.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [resumeLink.label, resumeLink.url, resumeLink.icon],
          }),
        ),
      )
      .orderBy(
        query.direction === 'before' ? desc(resumeLink.id) : asc(resumeLink.id),
      );

    const grouped = newestByKey({ rows, key: linkIdentity });
    const cursor = query.cursor;
    const filtered = cursor
      ? grouped.filter((row) =>
          query.direction === 'before' ? row.id < cursor : row.id > cursor,
        )
      : grouped;

    return pageRows({
      rows: filtered.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      cursor,
      direction: query.direction,
      getId: (row) => row.id,
    });
  }
}
