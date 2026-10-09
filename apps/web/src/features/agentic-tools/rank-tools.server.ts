import "@tanstack/react-start/server-only";

import { getResumeDetail } from "@/data-access-layer/resume/resume.server";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { db } from "@/lib/drizzle/client";
import { job, resume } from "@/lib/drizzle/scheam";
import { and, desc, eq } from "drizzle-orm";
import type { RemoteToolContext } from "./definitions/tool-context";
import {
  rankResumesForJobToolInputSchema,
  type RankResumesForJobToolInput,
  type RankResumesForJobToolOutput,
} from "./resume-tool-schemas";
import { jobKeywords, rankResumes } from "./shared/rank";

/** Each ranked résumé is fully assembled, so only the most recently updated ones are scored. */
const MAX_RANKED_RESUMES = 100;

/** Remote callers have no active résumé, so either `jobId` or `jobText` is required. */
export async function rankResumesForJobTool(
  ctx: RemoteToolContext,
  input: RankResumesForJobToolInput,
): Promise<RankResumesForJobToolOutput> {
  const data = rankResumesForJobToolInputSchema.parse(input);
  let target: { id: string | null; title: string; description: string };
  if (data.jobText) {
    target = { id: null, title: "", description: data.jobText };
  } else if (data.jobId) {
    const [row] = await db
      .select({ id: job.id, title: job.title, description: job.description })
      .from(job)
      .where(and(eq(job.id, data.jobId), eq(job.userId, ctx.userId)));
    if (!row) throw new Error("Job not found");
    target = row;
  } else {
    throw new Error("Pass jobId (from list_jobs) or jobText.");
  }

  const rows = await db
    .select({ id: resume.id })
    .from(resume)
    .where(eq(resume.userId, ctx.userId))
    .orderBy(desc(resume.updatedAt))
    .limit(MAX_RANKED_RESUMES);
  const details = await Promise.all(rows.map((row) => getResumeDetail(row.id, ctx.userId)));

  const keywords = jobKeywords(target);
  return {
    jobId: target.id,
    keywords,
    results: rankResumes(
      keywords,
      details.filter((detail): detail is ResumeDetailDTO => detail !== null),
      data.limit,
    ),
  };
}
