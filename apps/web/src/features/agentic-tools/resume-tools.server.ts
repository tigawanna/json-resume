import "@tanstack/react-start/server-only";

import { getResumeDetail } from "@/data-access-layer/resume/resume.server";
import { db } from "@/lib/drizzle/client";
import { job, resume } from "@/lib/drizzle/scheam";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { resumeView } from "./shared/resume-view";
import { nextOffset, searchTerms } from "./shared/search-page";
import {
  getResumeToolInputSchema,
  listResumesToolInputSchema,
  type GetResumeToolInput,
  type GetResumeToolOutput,
  type ListResumesToolInput,
  type ListResumesToolOutput,
} from "./resume-tool-schemas";

type ToolContext = {
  userId: string;
};

export async function listResumesTool(
  ctx: ToolContext,
  input: ListResumesToolInput,
): Promise<ListResumesToolOutput> {
  const data = listResumesToolInputSchema.parse(input);
  const conditions = [eq(resume.userId, ctx.userId)];

  for (const term of searchTerms(data.keyword)) {
    const pattern = `%${term}%`;
    conditions.push(
      or(
        like(resume.name, pattern),
        like(resume.fullName, pattern),
        like(resume.headline, pattern),
        like(resume.description, pattern),
        like(job.description, pattern),
        like(job.company, pattern),
        like(job.title, pattern),
      )!,
    );
  }

  const where = and(...conditions);
  const jobJoin = and(eq(job.id, resume.jobId), eq(job.userId, ctx.userId));

  const [rows, [{ total }]] = await Promise.all([
    db
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
        jobDescriptionStart: sql<string | null>`substr(${job.description}, 1, 240)`,
      })
      .from(resume)
      .leftJoin(job, jobJoin)
      .where(where)
      .orderBy(desc(resume.updatedAt), desc(resume.id))
      .limit(data.limit)
      .offset(data.offset),
    db.select({ total: count() }).from(resume).leftJoin(job, jobJoin).where(where),
  ]);

  return {
    resumes: rows.map(({ jobId, jobCompany, jobTitle, jobDescriptionStart, ...row }) => ({
      ...row,
      jobId,
      jobLabel: jobId
        ? jobListLabel({
            company: jobCompany ?? "",
            title: jobTitle ?? "",
            description: jobDescriptionStart ?? "",
          })
        : "",
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}

/** Remote callers have no active résumé, so `resumeId` is required here even though the schema allows omitting it. */
export async function getResumeTool(
  ctx: ToolContext,
  input: GetResumeToolInput,
): Promise<GetResumeToolOutput> {
  const data = getResumeToolInputSchema.parse(input);
  if (!data.resumeId) {
    throw new Error("resumeId is required. Call list_resumes to find it.");
  }
  const detail = await getResumeDetail(data.resumeId, ctx.userId);
  if (!detail) {
    throw new Error("Resume not found");
  }
  return { resume: resumeView(detail, data.sections) };
}
