import { Inject, Injectable } from '@nestjs/common';
import {
  resumeExperience,
  resumeExperienceBullet,
} from '@repo/db/postgres/schema/resume/resume-experience';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { LegacyImportListQueryDto } from '../dto/query.dto.js';
import {
  DEFAULT_PAGE_SIZE,
  pageRows,
  searchCondition,
} from '../queries/common.js';
import {
  experienceCursorCondition,
  parseExperienceCursor,
} from '../queries/experience-cursor.js';

@Injectable()
export class LegacyExperienceRepository {
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
        id: resumeExperience.id,
        company: resumeExperience.company,
        role: resumeExperience.role,
        startDate: resumeExperience.startDate,
        endDate: resumeExperience.endDate,
        location: resumeExperience.location,
        sortOrder: resumeExperience.sortOrder,
        createdAt: resumeExperience.createdAt,
        updatedAt: resumeExperience.updatedAt,
      })
      .from(resumeExperience)
      .where(
        and(
          eq(resumeExperience.userId, userId),
          searchCondition({
            keyword: query.keyword,
            columns: [
              resumeExperience.company,
              resumeExperience.role,
              resumeExperience.location,
            ],
          }),
          experienceCursorCondition({
            sortOrderColumn: resumeExperience.sortOrder,
            idColumn: resumeExperience.id,
            cursor: parseExperienceCursor(query.cursor),
            direction: query.direction,
          }),
        ),
      )
      .orderBy(
        query.direction === 'before'
          ? asc(resumeExperience.sortOrder)
          : desc(resumeExperience.sortOrder),
        query.direction === 'before'
          ? asc(resumeExperience.id)
          : desc(resumeExperience.id),
      )
      .limit(DEFAULT_PAGE_SIZE + 1);

    const page = pageRows({
      rows: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      cursor: query.cursor,
      direction: query.direction,
      getId: (row) => row.id,
    });
    if (page.items.length === 0) return page;

    const experienceIds = page.items.map((row) => row.id);
    const bullets = await this.db
      .select({
        id: resumeExperienceBullet.id,
        experienceId: resumeExperienceBullet.experienceId,
        text: resumeExperienceBullet.text,
        sortOrder: resumeExperienceBullet.sortOrder,
      })
      .from(resumeExperienceBullet)
      .innerJoin(
        resumeExperience,
        eq(resumeExperienceBullet.experienceId, resumeExperience.id),
      )
      .where(
        and(
          eq(resumeExperience.userId, userId),
          inArray(resumeExperienceBullet.experienceId, experienceIds),
        ),
      )
      .orderBy(
        asc(resumeExperienceBullet.sortOrder),
        asc(resumeExperienceBullet.id),
      );

    const byExperience = new Map<string, typeof bullets>();
    for (const bullet of bullets) {
      const current = byExperience.get(bullet.experienceId) ?? [];
      current.push(bullet);
      byExperience.set(bullet.experienceId, current);
    }
    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        bullets: (byExperience.get(item.id) ?? []).map(
          ({ experienceId: _experienceId, ...bullet }) => bullet,
        ),
      })),
    };
  }
}
