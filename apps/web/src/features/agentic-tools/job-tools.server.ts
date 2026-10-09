import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { job, resume } from "@/lib/drizzle/scheam";
import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";
import type { RemoteToolContext } from "./definitions/tool-context";
import {
  getJobToolInputSchema,
  listJobsToolInputSchema,
  type GetJobToolInput,
  type GetJobToolOutput,
  type ListJobsToolInput,
  type ListJobsToolOutput,
} from "./resume-tool-schemas";
import { jobDetailView, jobRowView, linkedResumesByJob } from "./shared/job-view";
import { nextOffset, searchTerms } from "./shared/search-page";

async function linkedResumeIds(userId: string, jobIds: string[]) {
  if (jobIds.length === 0) return new Map<string, string[]>();
  const links = await db
    .select({ id: resume.id, jobId: resume.jobId })
    .from(resume)
    .where(and(eq(resume.userId, userId), inArray(resume.jobId, jobIds)))
    .orderBy(desc(resume.updatedAt));
  return linkedResumesByJob(links);
}

export async function listJobsTool(
  ctx: RemoteToolContext,
  input: ListJobsToolInput,
): Promise<ListJobsToolOutput> {
  const data = listJobsToolInputSchema.parse(input);
  const conditions = [eq(job.userId, ctx.userId)];
  if (data.status) conditions.push(eq(job.status, data.status));
  for (const term of searchTerms(data.keyword)) {
    const pattern = `%${term}%`;
    conditions.push(
      or(
        like(job.company, pattern),
        like(job.title, pattern),
        like(job.location, pattern),
        like(job.url, pattern),
        like(job.notes, pattern),
        like(job.description, pattern),
      )!,
    );
  }
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(job)
      .where(where)
      .orderBy(desc(job.updatedAt), desc(job.id))
      .limit(data.limit)
      .offset(data.offset),
    db.select({ total: count() }).from(job).where(where),
  ]);
  const links = await linkedResumeIds(
    ctx.userId,
    rows.map((row) => row.id),
  );

  return {
    jobs: rows.map((row) => jobRowView(row, links.get(row.id) ?? [])),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}

/** Remote callers have no active résumé, so either `jobId` or `resumeId` is required. */
export async function getJobTool(
  ctx: RemoteToolContext,
  input: GetJobToolInput,
): Promise<GetJobToolOutput> {
  const data = getJobToolInputSchema.parse(input);
  let jobId = data.jobId;
  if (!jobId) {
    if (!data.resumeId) {
      throw new Error("Pass jobId, or resumeId to read the job a résumé targets.");
    }
    const [row] = await db
      .select({ jobId: resume.jobId })
      .from(resume)
      .where(and(eq(resume.id, data.resumeId), eq(resume.userId, ctx.userId)));
    if (!row) throw new Error("Resume not found");
    if (!row.jobId) throw new Error("This résumé has no target job.");
    jobId = row.jobId;
  }

  const [row] = await db
    .select()
    .from(job)
    .where(and(eq(job.id, jobId), eq(job.userId, ctx.userId)));
  if (!row) throw new Error("Job not found");
  const links = await linkedResumeIds(ctx.userId, [row.id]);
  return { job: jobDetailView(row, links.get(row.id) ?? []) };
}
