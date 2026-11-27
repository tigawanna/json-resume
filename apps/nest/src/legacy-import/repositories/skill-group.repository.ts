import { Inject, Injectable } from '@nestjs/common';
import { resumeSkillGroup } from '@repo/db/postgres/schema/resume/resume-skill';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { LegacyImportListQueryDto } from '../dto/query.dto.js';
import {
  DEFAULT_PAGE_SIZE,
  idCursorCondition,
  pageRows,
  searchCondition,
} from '../queries/common.js';
import { skillNamesByGroup } from '../queries/skill-groups.js';

@Injectable()
export class LegacySkillGroupRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    const [groups, namesByGroup] = await Promise.all([
      this.db
        .select({
          id: resumeSkillGroup.id,
          name: resumeSkillGroup.name,
          sortOrder: resumeSkillGroup.sortOrder,
          createdAt: resumeSkillGroup.createdAt,
          updatedAt: resumeSkillGroup.updatedAt,
        })
        .from(resumeSkillGroup)
        .where(
          and(
            eq(resumeSkillGroup.userId, userId),
            searchCondition({
              keyword: query.keyword,
              columns: [resumeSkillGroup.name],
            }),
            idCursorCondition({
              column: resumeSkillGroup.id,
              cursor: query.cursor,
              direction: query.direction,
            }),
          ),
        )
        .orderBy(
          query.direction === 'before'
            ? desc(resumeSkillGroup.id)
            : asc(resumeSkillGroup.id),
        )
        .limit(DEFAULT_PAGE_SIZE + 1),
      skillNamesByGroup({ db: this.db, userId }),
    ]);

    return pageRows({
      rows: groups.map((group) => ({
        ...group,
        skills: JSON.stringify(namesByGroup.get(group.id) ?? []),
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      })),
      cursor: query.cursor,
      direction: query.direction,
      getId: (row) => row.id,
    });
  }
}
