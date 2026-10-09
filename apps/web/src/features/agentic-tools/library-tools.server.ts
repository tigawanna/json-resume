import "@tanstack/react-start/server-only";

import {
  emptyResumeLayout,
  layoutReferencedIds,
  resumeLayoutSchema,
} from "@/features/resume/resume-layout";
import { db } from "@/lib/drizzle/client";
import {
  resume,
  resumeEducation,
  resumeExperience,
  resumeExperienceBullet,
  resumeProject,
  resumeSkill,
  resumeSummary,
  resumeTalk,
} from "@/lib/drizzle/scheam";
import { and, count, desc, eq, like, notInArray, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { RemoteToolContext } from "./definitions/tool-context";
import { remoteJobTarget } from "./rank-tools.server";
import {
  librarySectionSchema,
  rankLibraryForJobToolInputSchema,
  searchLibraryToolInputSchema,
  type LibrarySection,
  type RankLibraryForJobToolInput,
  type RankLibraryForJobToolOutput,
  type SearchLibraryToolInput,
  type SearchLibraryToolOutput,
} from "./resume-tool-schemas";
import {
  bulletHit,
  educationHit,
  experienceHit,
  projectHit,
  rankLibraryItems,
  skillHit,
  summaryHit,
  talkHit,
  withOnResume,
  type LibraryHitBase,
} from "./shared/library-view";
import { jobKeywords } from "./shared/rank";
import { nextOffset, searchTerms } from "./shared/search-page";

/** Ranking scores every candidate row, so it reads up to this many per section. */
const MAX_RANKED_ROWS = 2_000;

type PageRequest = {
  terms: ReadonlyArray<string>;
  excludeIds: ReadonlyArray<string>;
  offset: number;
  limit: number;
};

/** One condition per term: the term must appear in at least one of `columns`. */
function termFilters(terms: ReadonlyArray<string>, columns: ReadonlyArray<SQLiteColumn>) {
  return terms.map((term) => or(...columns.map((column) => like(column, `%${term}%`))));
}

function excluded(id: SQLiteColumn, excludeIds: ReadonlyArray<string>): SQL | undefined {
  return excludeIds.length > 0 ? notInArray(id, [...excludeIds]) : undefined;
}

async function searchSection(
  userId: string,
  section: LibrarySection,
  request: PageRequest,
): Promise<{ items: LibraryHitBase[]; total: number }> {
  const { terms, excludeIds, offset, limit } = request;
  switch (section) {
    case "summary": {
      const t = resumeSummary;
      const where = and(
        eq(t.userId, userId),
        ...termFilters(terms, [t.text]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({ id: t.id, text: t.text })
          .from(t)
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(t).where(where),
      ]);
      return { items: rows.map(summaryHit), total };
    }
    case "experience": {
      const t = resumeExperience;
      const where = and(
        eq(t.userId, userId),
        ...termFilters(terms, [t.company, t.role, t.location]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: t.id,
            company: t.company,
            role: t.role,
            startDate: t.startDate,
            endDate: t.endDate,
            location: t.location,
          })
          .from(t)
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(t).where(where),
      ]);
      return { items: rows.map(experienceHit), total };
    }
    case "experience_bullet": {
      const t = resumeExperienceBullet;
      const where = and(
        eq(resumeExperience.userId, userId),
        ...termFilters(terms, [t.text]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: t.id,
            text: t.text,
            experienceId: t.experienceId,
            company: resumeExperience.company,
            role: resumeExperience.role,
          })
          .from(t)
          .innerJoin(resumeExperience, eq(t.experienceId, resumeExperience.id))
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(t)
          .innerJoin(resumeExperience, eq(t.experienceId, resumeExperience.id))
          .where(where),
      ]);
      return { items: rows.map((row) => bulletHit(row, row)), total };
    }
    case "education": {
      const t = resumeEducation;
      const where = and(
        eq(t.userId, userId),
        ...termFilters(terms, [t.school, t.degree, t.field, t.description]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: t.id,
            school: t.school,
            degree: t.degree,
            field: t.field,
            startDate: t.startDate,
            endDate: t.endDate,
          })
          .from(t)
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(t).where(where),
      ]);
      return { items: rows.map(educationHit), total };
    }
    case "projects": {
      const t = resumeProject;
      const where = and(
        eq(t.userId, userId),
        ...termFilters(terms, [t.name, t.description, t.tech, t.url]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({ id: t.id, name: t.name, description: t.description, tech: t.tech })
          .from(t)
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(t).where(where),
      ]);
      return { items: rows.map(projectHit), total };
    }
    case "talks": {
      const t = resumeTalk;
      const where = and(
        eq(t.userId, userId),
        ...termFilters(terms, [t.title, t.event, t.description]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: t.id,
            title: t.title,
            event: t.event,
            date: t.date,
            description: t.description,
          })
          .from(t)
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(t).where(where),
      ]);
      return { items: rows.map(talkHit), total };
    }
    case "skills": {
      const t = resumeSkill;
      const where = and(
        eq(t.userId, userId),
        ...termFilters(terms, [t.name]),
        excluded(t.id, excludeIds),
      );
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({ id: t.id, name: t.name })
          .from(t)
          .where(where)
          .orderBy(desc(t.updatedAt), desc(t.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(t).where(where),
      ]);
      return { items: rows.map(skillHit), total };
    }
  }
}

/** Library ids the caller's résumé shows; empty when no résumé is named. */
async function idsOnResume(userId: string, resumeId: string | undefined): Promise<Set<string>> {
  if (!resumeId) return new Set();
  const [row] = await db
    .select({ layout: resume.layout })
    .from(resume)
    .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)));
  if (!row) throw new Error("Resume not found");
  const parsed = resumeLayoutSchema.safeParse(row.layout);
  return layoutReferencedIds(parsed.success ? parsed.data : emptyResumeLayout());
}

export async function searchLibraryTool(
  ctx: RemoteToolContext,
  input: SearchLibraryToolInput,
): Promise<SearchLibraryToolOutput> {
  const data = searchLibraryToolInputSchema.parse(input);
  const resumeId = data.resumeId || undefined;
  const onResume = await idsOnResume(ctx.userId, resumeId);
  const { items, total } = await searchSection(ctx.userId, data.section, {
    terms: searchTerms(data.keyword),
    excludeIds: data.notOnResume ? [...onResume] : [],
    offset: data.offset,
    limit: data.limit,
  });
  return {
    section: data.section,
    resumeId: resumeId ?? null,
    items: items.map((hit) => withOnResume(hit, onResume)),
    total,
    nextOffset: nextOffset(total, data.offset, items.length),
  };
}

/** Remote callers have no active résumé: pass `jobId` or `jobText`, or a `resumeId` that targets a job. */
export async function rankLibraryForJobTool(
  ctx: RemoteToolContext,
  input: RankLibraryForJobToolInput,
): Promise<RankLibraryForJobToolOutput> {
  const data = rankLibraryForJobToolInputSchema.parse(input);
  const resumeId = data.resumeId || undefined;
  const [target, onResume] = await Promise.all([
    remoteJobTarget(ctx, { ...data, resumeId }),
    idsOnResume(ctx.userId, resumeId),
  ]);
  const keywords = jobKeywords(target);
  const request = {
    terms: [],
    excludeIds: data.includeOnResume ? [] : [...onResume],
    offset: 0,
    limit: MAX_RANKED_ROWS,
  };
  const perSection = await Promise.all(
    (data.sections ?? librarySectionSchema.options).map(async (section) => {
      const { items } = await searchSection(ctx.userId, section, request);
      return items.map((hit) => ({ ...withOnResume(hit, onResume), section }));
    }),
  );
  return {
    jobId: target.id,
    resumeId: resumeId ?? null,
    keywords,
    results: rankLibraryItems(keywords, perSection.flat(), data.limit),
  };
}
