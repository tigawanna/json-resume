import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import {
  attachJobToResume,
  findJobByDescription,
  insertJob,
  updateJob,
} from "@/data-access-layer/event-sourced/job-rows";
import type { Job } from "@/data-access-layer/event-sourced/schemas";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  attachJobToolInputSchema,
  getJobToolInputSchema,
  listJobsToolInputSchema,
  saveJobToolInputSchema,
  updateJobToolInputSchema,
  type AttachJobToolInput,
  type AttachJobToolOutput,
  type GetJobToolInput,
  type GetJobToolOutput,
  type JobStatusTool,
  type ListJobsToolInput,
  type ListJobsToolOutput,
  type SaveJobToolInput,
  type SaveJobToolOutput,
  type UpdateJobToolInput,
  type UpdateJobToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import {
  jobDetailView,
  jobRowView,
  linkedResumesByJob,
} from "@/features/agentic-tools/shared/job-view";
import { nextOffset, searchTerms } from "@/features/agentic-tools/shared/search-page";
import { count, eq, inArray, queryOnce, type InitialQueryBuilder } from "@tanstack/db";
import { orIlike } from "../../-utils/list-query";

async function linkedResumeIds(db: AppDb, jobIds: string[]) {
  if (jobIds.length === 0) return new Map<string, string[]>();
  const links = await queryOnce((q) =>
    q
      .from({ resume: db.collections.resume })
      .where(({ resume }) => inArray(resume.jobId, jobIds))
      .orderBy(({ resume }) => resume.updatedAt, "desc")
      .select(({ resume }) => ({ id: resume.id, jobId: resume.jobId })),
  );
  return linkedResumesByJob(links);
}

async function jobRow(db: AppDb, job: Job) {
  const links = await linkedResumeIds(db, [job.id]);
  return jobRowView(job, links.get(job.id) ?? []);
}

export function requireJob(db: AppDb, jobId: string): Job {
  const job = db.collections.job.get(jobId);
  if (!job) throw new Error(`Job ${jobId} was not found. Use list_jobs to find its id.`);
  return job;
}

/** The posting a rank tool scores against: pasted text, the given job, or the active résumé's job. */
export function resolveJobTarget(
  ctx: LocalToolContext,
  input: { jobId?: string; jobText?: string },
): { id: string | null; title: string; description: string } {
  if (input.jobText) return { id: null, title: "", description: input.jobText };
  const jobId = input.jobId || ctx.db.collections.resume.get(ctx.getActiveResumeId())?.jobId;
  if (!jobId) throw new Error("Pass jobId or jobText; the active résumé has no target job.");
  return requireJob(ctx.db, jobId);
}

function requireResumeId(db: AppDb, resumeId: string) {
  if (!db.collections.resume.has(resumeId)) {
    throw new Error(`Resume ${resumeId} was not found. Use list_resumes to find its id.`);
  }
  return resumeId;
}

export async function saveLocalJob(
  ctx: LocalToolContext,
  input: SaveJobToolInput,
): Promise<SaveJobToolOutput> {
  const data = saveJobToolInputSchema.parse(input);
  const attachTo = data.attachToResumeId ? requireResumeId(ctx.db, data.attachToResumeId) : null;
  const existing = findJobByDescription(ctx.db, data.description);
  const fields = {
    company: data.company,
    title: data.title,
    url: data.url,
    location: data.location,
    status: data.status,
    notes: data.notes,
  };

  const job = existing
    ? updateJob(ctx.db, existing.id, fields)
    : insertJob(ctx.db, ctx.userId, { ...fields, description: data.description });
  if (attachTo) attachJobToResume(ctx.db, attachTo, job.id);

  return { job: await jobRow(ctx.db, job), created: !existing, attachedToResumeId: attachTo };
}

export async function updateLocalJob(
  ctx: LocalToolContext,
  input: UpdateJobToolInput,
): Promise<UpdateJobToolOutput> {
  const { jobId, ...fields } = updateJobToolInputSchema.parse(input);
  requireJob(ctx.db, jobId);
  return { job: await jobRow(ctx.db, updateJob(ctx.db, jobId, fields)) };
}

export async function getLocalJob(
  ctx: LocalToolContext,
  input: GetJobToolInput,
): Promise<GetJobToolOutput> {
  const data = getJobToolInputSchema.parse(input);
  let jobId = data.jobId;
  if (!jobId) {
    const resumeId = data.resumeId || ctx.getActiveResumeId();
    jobId = ctx.db.collections.resume.get(resumeId)?.jobId ?? undefined;
    if (!jobId) {
      throw new Error(
        `Resume ${resumeId} has no target job. Use list_jobs or save_job, then attach_job.`,
      );
    }
  }
  const job = requireJob(ctx.db, jobId);
  const links = await linkedResumeIds(ctx.db, [job.id]);
  return { job: jobDetailView(job, links.get(job.id) ?? []) };
}

/** Jobs with the given status where every term matches some job field. */
function matchingJobs(
  q: InitialQueryBuilder,
  db: AppDb,
  terms: ReadonlyArray<string>,
  status: JobStatusTool | undefined,
) {
  let query = q.from({ job: db.collections.job });
  if (status) query = query.where(({ job }) => eq(job.status, status));
  for (const term of terms) {
    query = query.where(({ job }) =>
      orIlike(term, job.company, job.title, job.location, job.url, job.notes, job.description),
    );
  }
  return query;
}

export async function listLocalJobs(
  ctx: LocalToolContext,
  input: ListJobsToolInput,
): Promise<ListJobsToolOutput> {
  const data = listJobsToolInputSchema.parse(input);
  const terms = searchTerms(data.keyword);

  const [rows, totals] = await Promise.all([
    queryOnce((q) =>
      matchingJobs(q, ctx.db, terms, data.status)
        .orderBy(({ job }) => job.updatedAt, "desc")
        .orderBy(({ job }) => job.id, "desc")
        .offset(data.offset)
        .limit(data.limit),
    ),
    queryOnce((q) =>
      matchingJobs(q, ctx.db, terms, data.status).select(({ job }) => ({ total: count(job.id) })),
    ),
  ]);
  const total = totals[0]?.total ?? 0;
  const links = await linkedResumeIds(
    ctx.db,
    rows.map((job) => job.id),
  );

  return {
    jobs: rows.map((job) => jobRowView(job, links.get(job.id) ?? [])),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}

export async function attachLocalJob(
  ctx: LocalToolContext,
  input: AttachJobToolInput,
): Promise<AttachJobToolOutput> {
  const data = attachJobToolInputSchema.parse(input);
  const resumeId = requireResumeId(ctx.db, data.resumeId || ctx.getActiveResumeId());
  const job = data.jobId ? requireJob(ctx.db, data.jobId) : null;
  attachJobToResume(ctx.db, resumeId, job?.id ?? null);
  return { resumeId, job: job ? await jobRow(ctx.db, job) : null };
}
