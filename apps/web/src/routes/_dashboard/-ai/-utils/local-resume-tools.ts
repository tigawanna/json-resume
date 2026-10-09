import {
  assembleResumeDetail,
  asTemplateId,
} from "@/data-access-layer/event-sourced/assemble-resume-detail";
import { cloneResume } from "@/data-access-layer/event-sourced/clone-resume";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/event-sourced-resume-workspace";
import { attachJobDescription, jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { snapshotEventSourcedResume } from "@/data-access-layer/event-sourced/snapshot-resume";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  getResumeToolInputSchema,
  listResumesToolInputSchema,
  setActiveResumeToolInputSchema,
  type CloneResumeToolOutput,
  type CreateResumeFromDocumentToolOutput,
  type GetResumeToolInput,
  type GetResumeToolOutput,
  type ListResumesToolInput,
  type ListResumesToolOutput,
  type ResumeBlockType,
  type SearchResumeBlocksToolOutput,
  type SetActiveResumeToolInput,
  type SetActiveResumeToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { parseTech, resumeView } from "@/features/agentic-tools/shared/resume-view";
import { nextOffset, searchTerms } from "@/features/agentic-tools/shared/search-page";
import { count, eq, queryOnce, type InitialQueryBuilder } from "@tanstack/db";
import { orIlike } from "../../-utils/list-query";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";

export function requireDetail(db: AppDb, resumeId: string) {
  const snapshots = snapshotEventSourcedResume(db, resumeId);
  const detail = assembleResumeDetail(resumeId, snapshots);
  if (!detail) {
    throw new Error(`Resume ${resumeId} was not found in the local database.`);
  }
  return { snapshots, detail };
}

function matchesKeyword(keyword: string | undefined, ...parts: Array<string | null | undefined>) {
  const needle = keyword?.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(needle));
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

export function searchLocalResumeBlocks(
  ctx: LocalToolContext,
  input: {
    keyword?: string;
    blockTypes?: ResumeBlockType[];
    limitPerType?: number;
  },
): SearchResumeBlocksToolOutput {
  const { detail } = requireDetail(ctx.db, ctx.getActiveResumeId());
  const types = new Set(
    input.blockTypes ?? ["summary", "experience", "experience_bullet", "project", "skill"],
  );
  const limit = input.limitPerType ?? 8;
  const blocks: SearchResumeBlocksToolOutput["blocks"] = [];

  if (types.has("summary")) {
    for (const summary of detail.summaries) {
      if (!matchesKeyword(input.keyword, summary.text)) continue;
      blocks.push({
        type: "summary",
        id: summary.id,
        resumeId: detail.id,
        resumeName: detail.name,
        text: summary.text,
      });
      if (blocks.filter((block) => block.type === "summary").length >= limit) break;
    }
  }

  if (types.has("experience")) {
    for (const experience of detail.experiences) {
      if (
        !matchesKeyword(input.keyword, experience.company, experience.role, experience.location)
      ) {
        continue;
      }
      blocks.push({
        type: "experience",
        id: experience.id,
        resumeId: detail.id,
        resumeName: detail.name,
        company: experience.company,
        role: experience.role,
        startDate: experience.startDate,
        endDate: experience.endDate,
        location: experience.location,
      });
      if (blocks.filter((block) => block.type === "experience").length >= limit) break;
    }
  }

  if (types.has("experience_bullet")) {
    for (const experience of detail.experiences) {
      for (const bullet of experience.bullets) {
        if (!matchesKeyword(input.keyword, bullet.text, experience.company, experience.role)) {
          continue;
        }
        blocks.push({
          type: "experience_bullet",
          id: bullet.id,
          experienceId: experience.id,
          resumeId: detail.id,
          resumeName: detail.name,
          company: experience.company,
          role: experience.role,
          text: bullet.text,
          sortOrder: bullet.sortOrder,
        });
        if (blocks.filter((block) => block.type === "experience_bullet").length >= limit) break;
      }
    }
  }

  if (types.has("project")) {
    for (const project of detail.projects) {
      const tech = parseTech(project.tech);
      if (!matchesKeyword(input.keyword, project.name, project.description, project.url, ...tech)) {
        continue;
      }
      blocks.push({
        type: "project",
        id: project.id,
        resumeId: detail.id,
        resumeName: detail.name,
        name: project.name,
        description: project.description,
        tech,
        url: project.url,
        homepageUrl: project.homepageUrl,
      });
      if (blocks.filter((block) => block.type === "project").length >= limit) break;
    }
  }

  if (types.has("skill")) {
    for (const group of detail.skillGroups) {
      for (const skill of group.skills) {
        if (!matchesKeyword(input.keyword, skill.name, group.name)) continue;
        blocks.push({
          type: "skill",
          id: skill.id,
          groupId: group.id,
          resumeId: detail.id,
          resumeName: detail.name,
          groupName: group.name,
          name: skill.name,
        });
        if (blocks.filter((block) => block.type === "skill").length >= limit) break;
      }
    }
  }

  return { blocks };
}

export function cloneLocalResume(
  ctx: LocalToolContext,
  input: {
    name?: string;
    description?: string;
    jobDescription?: string;
    sourceResumeId?: string;
  },
): CloneResumeToolOutput {
  const sourceResumeId = input.sourceResumeId ?? ctx.getActiveResumeId();
  const { resumeId, name } = cloneResume(ctx.db, sourceResumeId, input);
  return { sourceResumeId, resumeId, name };
}

export async function createLocalResumeFromDocument(
  ctx: Pick<LocalToolContext, "db" | "userId">,
  input: {
    name: string;
    description?: string;
    jobDescription?: string;
    document: ResumeDocumentV1;
  },
): Promise<CreateResumeFromDocumentToolOutput> {
  const base = libraryRowBase(ctx.userId);
  ctx.db.collections.resume.insert({
    id: base.id,
    userId: ctx.userId,
    name: input.name,
    fullName: input.document.header.fullName || input.name,
    headline: input.document.header.headline ?? "",
    description: input.description ?? "",
    jobId: null,
    templateId: asTemplateId(input.document.meta.templateId),
    layout: emptyResumeLayout(),
    searchableText: joinSearchable(
      input.name,
      input.document.header.fullName,
      input.document.header.headline,
      input.description,
    ),
    embedding: null,
    embeddingModel: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  });
  attachJobDescription(ctx.db, ctx.userId, base.id, input.jobDescription ?? "");

  const { snapshots, detail } = requireDetail(ctx.db, base.id);
  const workspace = createEventSourcedResumeWorkspace(ctx.db, detail, snapshots);
  await workspace.replaceDocument(input.document);

  return { resumeId: base.id, name: input.name };
}
