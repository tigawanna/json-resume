import {
  resumeExperience,
  resumeExperienceBullet,
} from '@repo/db/postgres/schema/resume';
import { bulletHit } from '@repo/isomorphic/agentic/library-view';
import { and, count, desc, eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../database/database.module.js';
import {
  excluded,
  termFilters,
  type PageRequest,
  type SectionResult,
} from './search-types.js';

export async function searchExperienceBullets({
  db,
  userId,
  request,
}: {
  db: DrizzleDB;
  userId: string;
  request: PageRequest;
}): Promise<SectionResult> {
  const table = resumeExperienceBullet;
  const where = and(
    eq(resumeExperience.userId, userId),
    ...termFilters(request.terms, [table.text]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: table.id,
        text: table.text,
        experienceId: table.experienceId,
        company: resumeExperience.company,
        role: resumeExperience.role,
      })
      .from(table)
      .innerJoin(resumeExperience, eq(table.experienceId, resumeExperience.id))
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db
      .select({ total: count() })
      .from(table)
      .innerJoin(resumeExperience, eq(table.experienceId, resumeExperience.id))
      .where(where),
  ]);
  return {
    items: rows.map((row) => bulletHit(row, row)),
    total: totals?.total ?? 0,
  };
}
