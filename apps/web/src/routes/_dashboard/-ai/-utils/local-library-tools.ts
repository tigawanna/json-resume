import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { currentLayout, editLayout } from "@/data-access-layer/event-sourced/resume-layout-rows";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  attachLibraryItemsToolInputSchema,
  librarySectionSchema,
  rankLibraryForJobToolInputSchema,
  searchLibraryToolInputSchema,
  type AttachableSection,
  type AttachLibraryItemsToolInput,
  type AttachLibraryItemsToolOutput,
  type LibrarySection,
  type RankLibraryForJobToolInput,
  type RankLibraryForJobToolOutput,
  type SearchLibraryToolInput,
  type SearchLibraryToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
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
} from "@/features/agentic-tools/shared/library-view";
import { jobKeywords } from "@/features/agentic-tools/shared/rank";
import { nextOffset, searchTerms } from "@/features/agentic-tools/shared/search-page";
import { layoutReferencedIds, setExperienceBullets } from "@/features/resume/resume-layout";
import {
  count,
  ilike,
  inArray,
  not,
  queryOnce,
  type Collection,
  type InitialQueryBuilder,
} from "@tanstack/db";
import { keywordPattern, orIlike } from "../../-utils/list-query";
import { openWorkspace } from "./local-resume-edit-tools";
import { resolveJobTarget } from "./local-job-tools";

/** Ranking scores every candidate row, so it reads up to this many per section. */
const MAX_RANKED_ROWS = 2_000;

type LibraryRow = { id: string; updatedAt: number };
type IlikeField = Parameters<typeof ilike>[0];

function fromLibrary<T extends LibraryRow>(
  q: InitialQueryBuilder,
  collection: Collection<T, string>,
) {
  return q.from({ row: collection });
}

type RowRef<T extends LibraryRow> = Parameters<
  Parameters<ReturnType<typeof fromLibrary<T>>["where"]>[0]
>[0]["row"];

type SearchFields<T extends LibraryRow> = (row: RowRef<T>) => [IlikeField, ...IlikeField[]];

type PageRequest = {
  terms: ReadonlyArray<string>;
  excludeIds: ReadonlyArray<string>;
  offset: number;
  limit: number;
};

function anyFieldMatches(term: string, [first, second, ...rest]: [IlikeField, ...IlikeField[]]) {
  return second ? orIlike(term, first, second, ...rest) : ilike(first, keywordPattern(term));
}

/** Library rows where every term matches one of `fields`, minus `excludeIds`. */
function matchingRows<T extends LibraryRow>(
  q: InitialQueryBuilder,
  collection: Collection<T, string>,
  fields: SearchFields<T>,
  request: PageRequest,
) {
  let query = fromLibrary(q, collection);
  for (const term of request.terms) {
    query = query.where(({ row }) => anyFieldMatches(term, fields(row)));
  }
  if (request.excludeIds.length > 0) {
    query = query.where(({ row }) => not(inArray(row.id, [...request.excludeIds])));
  }
  return query;
}

async function pageRows<T extends LibraryRow>(
  collection: Collection<T, string>,
  fields: SearchFields<T>,
  request: PageRequest,
) {
  const [rows, totals] = await Promise.all([
    queryOnce((q) =>
      matchingRows(q, collection, fields, request)
        .orderBy(({ row }) => row.updatedAt, "desc")
        .orderBy(({ row }) => row.id, "desc")
        .offset(request.offset)
        .limit(request.limit),
    ),
    queryOnce((q) =>
      matchingRows(q, collection, fields, request).select(({ row }) => ({
        total: count(row.id),
      })),
    ),
  ]);
  return { rows, total: totals[0]?.total ?? 0 };
}

async function searchSection(
  db: AppDb,
  section: LibrarySection,
  request: PageRequest,
): Promise<{ items: LibraryHitBase[]; total: number }> {
  const c = db.collections;
  switch (section) {
    case "summary": {
      const { rows, total } = await pageRows(c.resumeSummary, (row) => [row.text], request);
      return { items: rows.map(summaryHit), total };
    }
    case "experience": {
      const { rows, total } = await pageRows(
        c.resumeExperience,
        (row) => [row.company, row.role, row.location],
        request,
      );
      return { items: rows.map(experienceHit), total };
    }
    case "experience_bullet": {
      const { rows, total } = await pageRows(
        c.resumeExperienceBullet,
        (row) => [row.text],
        request,
      );
      return {
        items: rows.map((row) => bulletHit(row, c.resumeExperience.get(row.experienceId))),
        total,
      };
    }
    case "education": {
      const { rows, total } = await pageRows(
        c.resumeEducation,
        (row) => [row.school, row.degree, row.field, row.description],
        request,
      );
      return { items: rows.map(educationHit), total };
    }
    case "projects": {
      const { rows, total } = await pageRows(
        c.resumeProject,
        (row) => [row.name, row.description, row.tech, row.url],
        request,
      );
      return { items: rows.map(projectHit), total };
    }
    case "talks": {
      const { rows, total } = await pageRows(
        c.resumeTalk,
        (row) => [row.title, row.event, row.description],
        request,
      );
      return { items: rows.map(talkHit), total };
    }
    case "skills": {
      const { rows, total } = await pageRows(c.resumeSkill, (row) => [row.name], request);
      return { items: rows.map(skillHit), total };
    }
  }
}

/** Library ids the résumé shows (items, bullets and skills). */
function idsOnResume(db: AppDb, resumeId: string): Set<string> {
  if (!db.collections.resume.has(resumeId)) {
    throw new Error(`Resume ${resumeId} was not found. Use list_resumes to find its id.`);
  }
  return layoutReferencedIds(currentLayout(db, resumeId));
}

export async function searchLocalLibrary(
  ctx: LocalToolContext,
  input: SearchLibraryToolInput,
): Promise<SearchLibraryToolOutput> {
  const data = searchLibraryToolInputSchema.parse(input);
  const resumeId = data.resumeId || ctx.getActiveResumeId();
  const onResume = idsOnResume(ctx.db, resumeId);
  const { items, total } = await searchSection(ctx.db, data.section, {
    terms: searchTerms(data.keyword),
    excludeIds: data.notOnResume ? [...onResume] : [],
    offset: data.offset,
    limit: data.limit,
  });
  return {
    section: data.section,
    resumeId,
    items: items.map((hit) => withOnResume(hit, onResume)),
    total,
    nextOffset: nextOffset(total, data.offset, items.length),
  };
}

const ATTACH_KEY = {
  experience: "experiences",
  education: "education",
  projects: "projects",
  talks: "talks",
} as const satisfies Record<Exclude<AttachableSection, "experience_bullet">, string>;

function libraryHas(db: AppDb, section: AttachableSection, id: string) {
  const c = db.collections;
  switch (section) {
    case "experience":
      return c.resumeExperience.has(id);
    case "experience_bullet":
      return c.resumeExperienceBullet.has(id);
    case "education":
      return c.resumeEducation.has(id);
    case "projects":
      return c.resumeProject.has(id);
    case "talks":
      return c.resumeTalk.has(id);
  }
}

export async function attachLocalLibraryItems(
  ctx: LocalToolContext,
  input: AttachLibraryItemsToolInput,
): Promise<AttachLibraryItemsToolOutput> {
  const data = attachLibraryItemsToolInputSchema.parse(input);
  const { resumeId, workspace } = openWorkspace(ctx, data.resumeId);
  const ids = [...new Set(data.ids)];
  const missing = ids.filter((id) => !libraryHas(ctx.db, data.section, id));
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(", ")} not found in the ${data.section} library. Find ids with search_library.`,
    );
  }

  const onResume = idsOnResume(ctx.db, resumeId);
  const alreadyOnResume = ids.filter((id) => onResume.has(id));
  const attachedIds = ids.filter((id) => !onResume.has(id));

  if (data.section === "experience_bullet") {
    for (const id of attachedIds) {
      const bullet = ctx.db.collections.resumeExperienceBullet.get(id);
      if (!bullet) continue;
      editLayout(ctx.db, resumeId, (layout) => {
        const entry = layout.experiences.find((item) => item.id === bullet.experienceId);
        return setExperienceBullets(layout, bullet.experienceId, [...(entry?.bullets ?? []), id]);
      });
    }
  } else {
    await workspace.attachLibraryRows(ATTACH_KEY[data.section], attachedIds);
  }
  return { resumeId, section: data.section, attachedIds, alreadyOnResume };
}

export async function rankLocalLibraryForJob(
  ctx: LocalToolContext,
  input: RankLibraryForJobToolInput,
): Promise<RankLibraryForJobToolOutput> {
  const data = rankLibraryForJobToolInputSchema.parse(input);
  const job = resolveJobTarget(ctx, data);
  const resumeId = data.resumeId || ctx.getActiveResumeId();
  const onResume = idsOnResume(ctx.db, resumeId);
  const keywords = jobKeywords(job);

  const request = {
    terms: [],
    excludeIds: data.includeOnResume ? [] : [...onResume],
    offset: 0,
    limit: MAX_RANKED_ROWS,
  };
  const perSection = await Promise.all(
    (data.sections ?? librarySectionSchema.options).map(async (section) => {
      const { items } = await searchSection(ctx.db, section, request);
      return items.map((hit) => ({ ...withOnResume(hit, onResume), section }));
    }),
  );
  const items = perSection.flat();
  return {
    jobId: job.id,
    resumeId,
    keywords,
    results: rankLibraryItems(keywords, items, data.limit),
  };
}
