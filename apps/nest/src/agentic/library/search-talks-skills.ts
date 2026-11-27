import { resumeSkill, resumeTalk } from '@repo/db/postgres/schema/resume';
import { skillHit, talkHit } from '@repo/isomorphic/agentic/library-view';
import { and, count, desc, eq } from 'drizzle-orm';
import {
  excluded,
  termFilters,
  type SearchContext,
  type SectionResult,
} from './search-types.js';

export async function searchTalks(
  context: SearchContext,
): Promise<SectionResult> {
  const { db, userId, request } = context;
  const table = resumeTalk;
  const where = and(
    eq(table.userId, userId),
    ...termFilters(request.terms, [
      table.title,
      table.event,
      table.description,
    ]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: table.id,
        title: table.title,
        event: table.event,
        date: table.date,
        description: table.description,
      })
      .from(table)
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db.select({ total: count() }).from(table).where(where),
  ]);
  return { items: rows.map(talkHit), total: totals?.total ?? 0 };
}

export async function searchSkills(
  context: SearchContext,
): Promise<SectionResult> {
  const { db, userId, request } = context;
  const table = resumeSkill;
  const where = and(
    eq(table.userId, userId),
    ...termFilters(request.terms, [table.name]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({ id: table.id, name: table.name })
      .from(table)
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db.select({ total: count() }).from(table).where(where),
  ]);
  return { items: rows.map(skillHit), total: totals?.total ?? 0 };
}
