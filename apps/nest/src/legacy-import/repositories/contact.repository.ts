import { Inject, Injectable } from '@nestjs/common';
import { resumeContact } from '@repo/db/postgres/schema/resume/resume-contact';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { LegacyImportListQueryDto } from '../dto/query.dto.js';
import { pageRows, searchCondition } from '../queries/common.js';
import { newestByKey } from '../queries/group-rows.js';

function contactIdentity(row: { type: string; value: string; label: string }) {
  return [
    row.type.trim().toLowerCase(),
    row.value.trim().toLowerCase(),
    row.label.trim(),
  ].join('\u001f');
}

@Injectable()
export class LegacyContactRepository {
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
        id: resumeContact.id,
        type: resumeContact.type,
        value: resumeContact.value,
        label: resumeContact.label,
        sortOrder: resumeContact.sortOrder,
        createdAt: resumeContact.createdAt,
        updatedAt: resumeContact.updatedAt,
      })
      .from(resumeContact)
      .where(
        and(
          eq(resumeContact.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [
              resumeContact.type,
              resumeContact.value,
              resumeContact.label,
            ],
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? desc(resumeContact.id)
          : asc(resumeContact.id),
      );

    const grouped = newestByKey({ rows, key: contactIdentity });
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
