import { Inject, Injectable } from '@nestjs/common';
import { job } from '@repo/db/postgres/schema/job-schema';
import { resume } from '@repo/db/postgres/schema/resume';
import {
  jobDetailView,
  jobRowView,
  linkedResumesByJob,
} from '@repo/isomorphic/agentic/job-view';
import { nextOffset, searchTerms } from '@repo/isomorphic/agentic/search-page';
import {
  getJobToolInputSchema,
  listJobsToolInputSchema,
  type GetJobToolInput,
  type GetJobToolOutput,
  type ListJobsToolInput,
  type ListJobsToolOutput,
} from '@repo/isomorphic/agentic/tool-schemas/resume/job';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';

@Injectable()
export class AgenticJobService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listJobs({
    userId,
    input,
  }: {
    userId: string;
    input: ListJobsToolInput;
  }): Promise<ListJobsToolOutput> {
    const data = listJobsToolInputSchema.parse(input);
    const conditions: SQL[] = [eq(job.userId, userId)];
    if (data.status) conditions.push(eq(job.status, data.status));
    for (const term of searchTerms(data.keyword)) {
      const pattern = `%${term}%`;
      const match = or(
        ilike(job.company, pattern),
        ilike(job.title, pattern),
        ilike(job.location, pattern),
        ilike(job.payRate, pattern),
        ilike(job.url, pattern),
        ilike(job.notes, pattern),
        ilike(job.description, pattern),
      );
      if (match) conditions.push(match);
    }
    const where = and(...conditions);
    const [rows, [totals]] = await Promise.all([
      this.db
        .select()
        .from(job)
        .where(where)
        .orderBy(desc(job.updatedAt), desc(job.id))
        .limit(data.limit)
        .offset(data.offset),
      this.db.select({ total: count() }).from(job).where(where),
    ]);
    const links = await this.linkedResumeIds({
      userId,
      jobIds: rows.map((row) => row.id),
    });
    return {
      jobs: rows.map((row) => jobRowView(row, links.get(row.id) ?? [])),
      total: totals?.total ?? 0,
      nextOffset: nextOffset(totals?.total ?? 0, data.offset, rows.length),
    };
  }

  async getJob({
    userId,
    input,
  }: {
    userId: string;
    input: GetJobToolInput;
  }): Promise<GetJobToolOutput> {
    const data = getJobToolInputSchema.parse(input);
    const jobId = await this.resolveJobId({ userId, ...data });
    const [row] = await this.db
      .select()
      .from(job)
      .where(and(eq(job.id, jobId), eq(job.userId, userId)));
    if (!row) throw new ORPCError('NOT_FOUND', { message: 'Job not found' });
    const links = await this.linkedResumeIds({ userId, jobIds: [row.id] });
    return { job: jobDetailView(row, links.get(row.id) ?? []) };
  }

  async jobTarget({
    userId,
    jobId,
    jobText,
    resumeId,
  }: {
    userId: string;
    jobId?: string;
    jobText?: string;
    resumeId?: string;
  }) {
    if (jobText) return { id: null, title: '', description: jobText };
    const resolved = await this.resolveJobId({ userId, jobId, resumeId });
    const [row] = await this.db
      .select({ id: job.id, title: job.title, description: job.description })
      .from(job)
      .where(and(eq(job.id, resolved), eq(job.userId, userId)));
    if (!row) throw new ORPCError('NOT_FOUND', { message: 'Job not found' });
    return row;
  }

  private async resolveJobId({
    userId,
    jobId,
    resumeId,
  }: {
    userId: string;
    jobId?: string;
    resumeId?: string;
  }) {
    if (jobId) return jobId;
    if (!resumeId)
      throw new ORPCError('BAD_REQUEST', {
        message: 'Pass jobId, or resumeId to read the job a résumé targets.',
      });
    const [row] = await this.db
      .select({ jobId: resume.jobId })
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)));
    if (!row) throw new ORPCError('NOT_FOUND', { message: 'Resume not found' });
    if (!row.jobId)
      throw new ORPCError('BAD_REQUEST', {
        message: 'This résumé has no target job.',
      });
    return row.jobId;
  }

  private async linkedResumeIds({
    userId,
    jobIds,
  }: {
    userId: string;
    jobIds: string[];
  }) {
    if (jobIds.length === 0) return new Map<string, string[]>();
    const links = await this.db
      .select({ id: resume.id, jobId: resume.jobId })
      .from(resume)
      .where(and(eq(resume.userId, userId), inArray(resume.jobId, jobIds)))
      .orderBy(desc(resume.updatedAt));
    return linkedResumesByJob(links);
  }
}
