import {
  resumeEducation,
  resumeExperience,
  resumeProject,
  resumeSummary,
} from '@repo/db/postgres/schema/resume';
import {
  educationHit,
  experienceHit,
  projectHit,
  summaryHit,
} from '@repo/isomorphic/agentic/library-view';
import { and, count, desc, eq } from 'drizzle-orm';
import {
  excluded,
  termFilters,
  type SearchContext,
  type SectionResult,
} from './search-types.js';

export async function searchSummary(
  context: SearchContext,
): Promise<SectionResult> {
  const { db, userId, request } = context;
  const table = resumeSummary;
  const where = and(
    eq(table.userId, userId),
    ...termFilters(request.terms, [table.text]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({ id: table.id, text: table.text })
      .from(table)
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db.select({ total: count() }).from(table).where(where),
  ]);
  return { items: rows.map(summaryHit), total: totals?.total ?? 0 };
}

export async function searchExperience(
  context: SearchContext,
): Promise<SectionResult> {
  const { db, userId, request } = context;
  const table = resumeExperience;
  const where = and(
    eq(table.userId, userId),
    ...termFilters(request.terms, [table.company, table.role, table.location]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: table.id,
        company: table.company,
        role: table.role,
        startDate: table.startDate,
        endDate: table.endDate,
        location: table.location,
      })
      .from(table)
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db.select({ total: count() }).from(table).where(where),
  ]);
  return { items: rows.map(experienceHit), total: totals?.total ?? 0 };
}

export async function searchEducation(
  context: SearchContext,
): Promise<SectionResult> {
  const { db, userId, request } = context;
  const table = resumeEducation;
  const where = and(
    eq(table.userId, userId),
    ...termFilters(request.terms, [
      table.school,
      table.degree,
      table.field,
      table.description,
    ]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: table.id,
        school: table.school,
        degree: table.degree,
        field: table.field,
        startDate: table.startDate,
        endDate: table.endDate,
      })
      .from(table)
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db.select({ total: count() }).from(table).where(where),
  ]);
  return { items: rows.map(educationHit), total: totals?.total ?? 0 };
}

export async function searchProjects(
  context: SearchContext,
): Promise<SectionResult> {
  const { db, userId, request } = context;
  const table = resumeProject;
  const where = and(
    eq(table.userId, userId),
    ...termFilters(request.terms, [
      table.name,
      table.description,
      table.tech,
      table.url,
    ]),
    excluded(table.id, request.excludeIds),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: table.id,
        name: table.name,
        description: table.description,
        tech: table.tech,
      })
      .from(table)
      .where(where)
      .orderBy(desc(table.updatedAt), desc(table.id))
      .limit(request.limit)
      .offset(request.offset),
    db.select({ total: count() }).from(table).where(where),
  ]);
  return { items: rows.map(projectHit), total: totals?.total ?? 0 };
}
