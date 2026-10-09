import { asTemplateId } from "@/data-access-layer/event-sourced/assemble-resume-detail";
import { cloneResume } from "@/data-access-layer/event-sourced/clone-resume";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/event-sourced-resume-workspace";
import {
  attachJobDescription,
  attachJobToResume,
  jobListLabel,
} from "@/data-access-layer/event-sourced/job-rows";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  cloneResumeToolInputSchema,
  createResumeToolInputSchema,
  openResumeToolInputSchema,
  rankResumesForJobToolInputSchema,
  tailorResumeForJobToolInputSchema,
  type CloneResumeToolInput,
  type CloneResumeToolOutput,
  type CreateResumeToolInput,
  type CreateResumeToolOutput,
  type OpenResumeToolInput,
  type OpenResumeToolOutput,
  type RankResumesForJobToolInput,
  type RankResumesForJobToolOutput,
  type TailorResumeForJobToolInput,
  type TailorResumeForJobToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { jobKeywords, rankResumes, scoreResume } from "@/features/agentic-tools/shared/rank";
import { resumeView } from "@/features/agentic-tools/shared/resume-view";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import { SECTION_KEYS, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";
import { requireJob } from "./local-job-tools";
import { requireDetail } from "./local-resume-tools";

/** Ranking assembles every résumé, so it looks at the most recently updated ones only. */
const MAX_RANKED_RESUMES = 200;

function requireResume(db: AppDb, resumeId: string) {
  const resume = db.collections.resume.get(resumeId);
  if (!resume) {
    throw new Error(`Resume ${resumeId} was not found. Use list_resumes to find its id.`);
  }
  return resume;
}

function insertBlankResume(
  ctx: Pick<LocalToolContext, "db" | "userId">,
  values: {
    name: string;
    description: string;
    fullName: string;
    headline: string;
    templateId: string;
  },
) {
  const base = libraryRowBase(ctx.userId);
  ctx.db.collections.resume.insert({
    id: base.id,
    userId: ctx.userId,
    name: values.name,
    fullName: values.fullName,
    headline: values.headline,
    description: values.description,
    jobId: null,
    templateId: asTemplateId(values.templateId),
    layout: emptyResumeLayout(),
    searchableText: joinSearchable(
      values.name,
      values.fullName,
      values.headline,
      values.description,
    ),
    embedding: null,
    embeddingModel: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  });
  return base.id;
}

async function importDocument(db: AppDb, resumeId: string, document: ResumeDocumentV1) {
  const { snapshots, detail } = requireDetail(db, resumeId);
  await createEventSourcedResumeWorkspace(db, detail, snapshots).replaceDocument(document);
}

/** JSON import from the résumé list: a new résumé from a full document, linked to a posting. */
export async function createLocalResumeFromDocument(
  ctx: Pick<LocalToolContext, "db" | "userId">,
  input: {
    name: string;
    description?: string;
    jobDescription?: string;
    document: ResumeDocumentV1;
  },
): Promise<{ resumeId: string; name: string }> {
  const resumeId = insertBlankResume(ctx, {
    name: input.name,
    description: input.description ?? "",
    fullName: input.document.header.fullName || input.name,
    headline: input.document.header.headline ?? "",
    templateId: input.document.meta.templateId,
  });
  attachJobDescription(ctx.db, ctx.userId, resumeId, input.jobDescription ?? "");
  await importDocument(ctx.db, resumeId, input.document);
  return { resumeId, name: input.name };
}

export function cloneLocalResume(
  ctx: LocalToolContext,
  input: CloneResumeToolInput,
): CloneResumeToolOutput {
  const data = cloneResumeToolInputSchema.parse(input);
  const sourceResumeId = data.sourceResumeId || ctx.getActiveResumeId();
  const jobId = data.jobId ? requireJob(ctx.db, data.jobId).id : undefined;
  const { resumeId, name } = cloneResume(ctx.db, sourceResumeId, {
    name: data.name,
    description: data.description,
  });
  if (jobId) attachJobToResume(ctx.db, resumeId, jobId);
  if (data.makeActive) ctx.setActiveResumeId(resumeId);
  return {
    sourceResumeId,
    resumeId,
    name,
    jobId: requireResume(ctx.db, resumeId).jobId ?? null,
    active: data.makeActive,
  };
}

export async function createLocalResume(
  ctx: LocalToolContext,
  input: CreateResumeToolInput,
): Promise<CreateResumeToolOutput> {
  const data = createResumeToolInputSchema.parse(input);
  const jobId = data.jobId ? requireJob(ctx.db, data.jobId).id : null;
  const header = data.document?.header;
  const resumeId = insertBlankResume(ctx, {
    name: data.name,
    description: data.description ?? "",
    fullName: header?.fullName || "",
    headline: header?.headline ?? "",
    templateId: data.document?.meta.templateId ?? "classic",
  });
  if (jobId) attachJobToResume(ctx.db, resumeId, jobId);
  if (data.document) await importDocument(ctx.db, resumeId, data.document);
  if (data.makeActive) ctx.setActiveResumeId(resumeId);
  return { resumeId, name: data.name, active: data.makeActive };
}

export function openLocalResume(
  ctx: LocalToolContext,
  input: OpenResumeToolInput,
): OpenResumeToolOutput {
  const data = openResumeToolInputSchema.parse(input);
  const resumeId = requireResume(ctx.db, data.resumeId || ctx.getActiveResumeId()).id;
  ctx.openResume(resumeId, data.tab);
  return { resumeId, tab: data.tab, opensAfterReply: true };
}

function recentResumeDetails(db: AppDb) {
  return [...db.collections.resume.toArray]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RANKED_RESUMES)
    .map((resume) => requireDetail(db, resume.id).detail);
}

export function rankLocalResumesForJob(
  ctx: LocalToolContext,
  input: RankResumesForJobToolInput,
): RankResumesForJobToolOutput {
  const data = rankResumesForJobToolInputSchema.parse(input);
  let job: { id: string | null; title: string; description: string };
  if (data.jobText) {
    job = { id: null, title: "", description: data.jobText };
  } else {
    const jobId = data.jobId || ctx.db.collections.resume.get(ctx.getActiveResumeId())?.jobId;
    if (!jobId) {
      throw new Error("Pass jobId or jobText; the active résumé has no target job.");
    }
    job = requireJob(ctx.db, jobId);
  }

  const keywords = jobKeywords(job);
  return {
    jobId: job.id,
    keywords,
    results: rankResumes(keywords, recentResumeDetails(ctx.db), data.limit),
  };
}

export function tailorLocalResumeForJob(
  ctx: LocalToolContext,
  input: TailorResumeForJobToolInput,
): TailorResumeForJobToolOutput {
  const data = tailorResumeForJobToolInputSchema.parse(input);
  const job = requireJob(ctx.db, data.jobId);
  const keywords = jobKeywords(job);

  let base;
  if (data.baseResumeId) {
    base = requireDetail(ctx.db, requireResume(ctx.db, data.baseResumeId).id).detail;
  } else {
    const [best] = rankResumes(keywords, recentResumeDetails(ctx.db), 1);
    if (!best) throw new Error("There is no résumé to start from. Use create_resume first.");
    base = requireDetail(ctx.db, best.resumeId).detail;
  }

  const { resumeId, name } = cloneResume(ctx.db, base.id, {
    name: data.name ?? `${base.name} for ${jobListLabel(job)}`.slice(0, 120),
  });
  attachJobToResume(ctx.db, resumeId, job.id);
  ctx.setActiveResumeId(resumeId);

  const { score, missingTerms } = scoreResume(keywords, base);
  return {
    jobId: job.id,
    baseResumeId: base.id,
    resumeId,
    name,
    score,
    missingTerms,
    resume: resumeView(requireDetail(ctx.db, resumeId).detail, SECTION_KEYS),
  };
}
