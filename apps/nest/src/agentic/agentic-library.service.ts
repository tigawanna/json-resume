import { Inject, Injectable } from '@nestjs/common';
import { resume } from '@repo/db/postgres/schema/resume';
import {
  emptyResumeLayout,
  layoutReferencedIds,
  resumeLayoutSchema,
} from '@repo/isomorphic/resume/layout';
import {
  rankLibraryItems,
  withOnResume,
} from '@repo/isomorphic/agentic/library-view';
import { jobKeywords } from '@repo/isomorphic/agentic/rank';
import { nextOffset, searchTerms } from '@repo/isomorphic/agentic/search-page';
import {
  librarySectionSchema,
  rankLibraryForJobToolInputSchema,
  searchLibraryToolInputSchema,
  type RankLibraryForJobToolInput,
  type RankLibraryForJobToolOutput,
  type SearchLibraryToolInput,
  type SearchLibraryToolOutput,
} from '@repo/isomorphic/agentic/tool-schemas/resume/library';
import { and, eq } from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { AgenticJobService } from './agentic-job.service.js';
import { searchLibrarySection } from './library/search-library.js';

const MAX_RANKED_ROWS = 2_000;

@Injectable()
export class AgenticLibraryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jobs: AgenticJobService,
  ) {}

  async searchLibrary({
    userId,
    input,
  }: {
    userId: string;
    input: SearchLibraryToolInput;
  }): Promise<SearchLibraryToolOutput> {
    const data = searchLibraryToolInputSchema.parse(input);
    const resumeId = data.resumeId || undefined;
    const onResume = await this.idsOnResume({ userId, resumeId });
    const { items, total } = await searchLibrarySection({
      db: this.db,
      userId,
      section: data.section,
      request: {
        terms: searchTerms(data.keyword),
        excludeIds: data.notOnResume ? [...onResume] : [],
        offset: data.offset,
        limit: data.limit,
      },
    });
    return {
      section: data.section,
      resumeId: resumeId ?? null,
      items: items.map((hit) => withOnResume(hit, onResume)),
      total,
      nextOffset: nextOffset(total, data.offset, items.length),
    };
  }

  async rankLibraryForJob({
    userId,
    input,
  }: {
    userId: string;
    input: RankLibraryForJobToolInput;
  }): Promise<RankLibraryForJobToolOutput> {
    const data = rankLibraryForJobToolInputSchema.parse(input);
    const resumeId = data.resumeId || undefined;
    const [target, onResume] = await Promise.all([
      this.jobs.jobTarget({ userId, ...data }),
      this.idsOnResume({ userId, resumeId }),
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
        const { items } = await searchLibrarySection({
          db: this.db,
          userId,
          section,
          request,
        });
        return items.map((hit) => ({
          ...withOnResume(hit, onResume),
          section,
        }));
      }),
    );
    return {
      jobId: target.id,
      resumeId: resumeId ?? null,
      keywords,
      results: rankLibraryItems(keywords, perSection.flat(), data.limit),
    };
  }

  private async idsOnResume({
    userId,
    resumeId,
  }: {
    userId: string;
    resumeId?: string;
  }) {
    if (!resumeId) return new Set<string>();
    const [row] = await this.db
      .select({ layout: resume.layout })
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)));
    if (!row) throw new ORPCError('NOT_FOUND', { message: 'Resume not found' });
    const parsed = resumeLayoutSchema.safeParse(row.layout);
    return layoutReferencedIds(
      parsed.success ? parsed.data : emptyResumeLayout(),
    );
  }
}
