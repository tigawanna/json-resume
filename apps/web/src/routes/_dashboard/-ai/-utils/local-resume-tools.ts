import { assembleResumeDetail } from "@/data-access-layer/event-sourced/assemble-resume-detail";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { snapshotEventSourcedResume } from "@/data-access-layer/event-sourced/snapshot-resume";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  getResumeToolInputSchema,
  listResumesToolInputSchema,
  setActiveResumeToolInputSchema,
  type GetResumeToolInput,
  type GetResumeToolOutput,
  type ListResumesToolInput,
  type ListResumesToolOutput,
  type SetActiveResumeToolInput,
  type SetActiveResumeToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { resumeView } from "@/features/agentic-tools/shared/resume-view";
import { nextOffset, searchTerms } from "@/features/agentic-tools/shared/search-page";
import { count, eq, queryOnce, type InitialQueryBuilder } from "@tanstack/db";
import { orIlike } from "../../-utils/list-query";

export function requireDetail(db: AppDb, resumeId: string) {
  const snapshots = snapshotEventSourcedResume(db, resumeId);
  const detail = assembleResumeDetail(resumeId, snapshots);
  if (!detail) {
    throw new Error(`Resume ${resumeId} was not found in the local database.`);
  }
  return { snapshots, detail };
}

/** Résumés (with their linked job) where every term matches some résumé or job field. */
function matchingResumes(q: InitialQueryBuilder, db: AppDb, terms: ReadonlyArray<string>) {
  let query = q
    .from({ resume: db.collections.resume })
    .leftJoin({ job: db.collections.job }, ({ resume, job }) => eq(resume.jobId, job.id));
  for (const term of terms) {
    query = query.where(({ resume, job }) =>
      orIlike(
        term,
        resume.name,
        resume.fullName,
        resume.headline,
        resume.description,
        job.company,
        job.title,
        job.description,
      ),
    );
  }
  return query;
}

export async function listLocalResumes(
  ctx: LocalToolContext,
  input: ListResumesToolInput,
): Promise<ListResumesToolOutput> {
  const data = listResumesToolInputSchema.parse(input);
  const terms = searchTerms(data.keyword);

  const [rows, totals] = await Promise.all([
    queryOnce((q) =>
      matchingResumes(q, ctx.db, terms)
        .orderBy(({ resume }) => resume.updatedAt, "desc")
        .orderBy(({ resume }) => resume.id, "desc")
        .offset(data.offset)
        .limit(data.limit)
        .select(({ resume, job }) => ({
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
          jobDescription: job.description,
        })),
    ),
    queryOnce((q) =>
      matchingResumes(q, ctx.db, terms).select(({ resume }) => ({ total: count(resume.id) })),
    ),
  ]);
  const total = totals[0]?.total ?? 0;

  return {
    resumes: rows.map(({ jobId, jobCompany, jobTitle, jobDescription, ...row }) => ({
      ...row,
      jobId: jobId ?? null,
      jobLabel: jobId
        ? jobListLabel({
            company: jobCompany ?? "",
            title: jobTitle ?? "",
            description: jobDescription ?? "",
          })
        : "",
      updatedAt: new Date(row.updatedAt).toISOString(),
    })),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}

export function getLocalResume(
  ctx: LocalToolContext,
  input: GetResumeToolInput,
): GetResumeToolOutput {
  const data = getResumeToolInputSchema.parse(input);
  const { detail } = requireDetail(ctx.db, data.resumeId || ctx.getActiveResumeId());
  return { resume: resumeView(detail, data.sections) };
}

export function setLocalActiveResume(
  ctx: LocalToolContext,
  input: SetActiveResumeToolInput,
): SetActiveResumeToolOutput {
  const data = setActiveResumeToolInputSchema.parse(input);
  const resume = ctx.db.collections.resume.get(data.resumeId);
  if (!resume) {
    throw new Error(`Resume ${data.resumeId} was not found. Use list_resumes to find its id.`);
  }
  ctx.setActiveResumeId(resume.id);
  return { resumeId: resume.id, name: resume.name };
}
