import { Inject, Injectable } from '@nestjs/common';
import { job } from '@repo/db/postgres/schema/job-schema';
import { resume } from '@repo/db/postgres/schema/resume';
import { jobListLabel } from '@repo/isomorphic/agentic/job-view';
import { jobKeywords, rankResumes } from '@repo/isomorphic/agentic/rank';
import { resumeView } from '@repo/isomorphic/agentic/resume-view';
import { nextOffset, searchTerms } from '@repo/isomorphic/agentic/search-page';
import {
  getResumeToolInputSchema,
  listResumesToolInputSchema,
  rankResumesForJobToolInputSchema,
  type GetResumeToolInput,
  type GetResumeToolOutput,
  type ListResumesToolInput,
  type ListResumesToolOutput,
  type RankResumesForJobToolInput,
  type RankResumesForJobToolOutput,
} from '@repo/isomorphic/agentic/tool-schemas';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { LegacyImportService } from '../legacy-import/legacy-import.service.js';
import { AgenticJobService } from './agentic-job.service.js';

const MAX_RANKED_RESUMES = 100;

@Injectable()
export class AgenticResumeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly legacy: LegacyImportService,
    private readonly jobs: AgenticJobService,
  ) {}

  async listResumes({
    userId,
    input,
  }: {
    userId: string;
    input: ListResumesToolInput;
  }): Promise<ListResumesToolOutput> {
    const data = listResumesToolInputSchema.parse(input);
    const conditions: SQL[] = [eq(resume.userId, userId)];
    for (const term of searchTerms(data.keyword)) {
      const pattern = `%${term}%`;
      const match = or(
        ilike(resume.name, pattern),
        ilike(resume.fullName, pattern),
        ilike(resume.headline, pattern),
        ilike(resume.description, pattern),
        ilike(job.description, pattern),
        ilike(job.company, pattern),
        ilike(job.title, pattern),
      );
      if (match) conditions.push(match);
    }
    const where = and(...conditions);
    const jobJoin = and(eq(job.id, resume.jobId), eq(job.userId, userId));
    const [rows, [totals]] = await Promise.all([
      this.db
        .select({
          id: resume.id,
          name: resume.name,
          fullName: resume.fullName,
          headline: resume.headline,
          description: resume.description,
          templateId: resume.templateId,
          updatedAt: resume.updatedAt,
          jobId: job.id,
          jobCompany: job.company,
          jobTitle: job.title,
          jobDescriptionStart: sql<
            string | null
          >`left(${job.description}, 240)`,
        })
        .from(resume)
        .leftJoin(job, jobJoin)
        .where(where)
        .orderBy(desc(resume.updatedAt), desc(resume.id))
        .limit(data.limit)
        .offset(data.offset),
      this.db
        .select({ total: count() })
        .from(resume)
        .leftJoin(job, jobJoin)
        .where(where),
    ]);
    const total = totals?.total ?? 0;
    return {
      resumes: rows.map(
        ({ jobId, jobCompany, jobTitle, jobDescriptionStart, ...row }) => ({
          ...row,
          jobId,
          jobLabel: jobId
            ? jobListLabel({
                company: jobCompany ?? '',
                title: jobTitle ?? '',
                description: jobDescriptionStart ?? '',
              })
            : '',
          updatedAt: row.updatedAt.toISOString(),
        }),
      ),
      total,
      nextOffset: nextOffset(total, data.offset, rows.length),
    };
  }

  async getResume({
    userId,
    input,
  }: {
    userId: string;
    input: GetResumeToolInput;
  }): Promise<GetResumeToolOutput> {
    const data = getResumeToolInputSchema.parse(input);
    if (!data.resumeId)
      throw new ORPCError('BAD_REQUEST', {
        message: 'resumeId is required. Call list_resumes to find it.',
      });
    const detail = await this.legacy.getResume({ userId, id: data.resumeId });
    if (!detail)
      throw new ORPCError('NOT_FOUND', { message: 'Resume not found' });
    return { resume: resumeView(detail, data.sections) };
  }

  async rankResumes({
    userId,
    input,
  }: {
    userId: string;
    input: RankResumesForJobToolInput;
  }): Promise<RankResumesForJobToolOutput> {
    const data = rankResumesForJobToolInputSchema.parse(input);
    const target = await this.jobs.jobTarget({ userId, ...data });
    const rows = await this.db
      .select({ id: resume.id })
      .from(resume)
      .where(eq(resume.userId, userId))
      .orderBy(desc(resume.updatedAt))
      .limit(MAX_RANKED_RESUMES);
    const details = await Promise.all(
      rows.map((row) => this.legacy.getResume({ userId, id: row.id })),
    );
    const keywords = jobKeywords(target);
    return {
      jobId: target.id,
      keywords,
      results: rankResumes(
        keywords,
        details.filter(
          (detail): detail is NonNullable<typeof detail> => detail !== null,
        ),
        data.limit,
      ),
    };
  }
}
