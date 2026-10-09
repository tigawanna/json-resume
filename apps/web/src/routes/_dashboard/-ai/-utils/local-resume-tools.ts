import {
  assembleResumeDetail,
  asTemplateId,
} from "@/data-access-layer/event-sourced/assemble-resume-detail";
import { cloneResume } from "@/data-access-layer/event-sourced/clone-resume";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/event-sourced-resume-workspace";
import { attachJobDescription } from "@/data-access-layer/event-sourced/job-rows";
import { snapshotEventSourcedResume } from "@/data-access-layer/event-sourced/snapshot-resume";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import type {
  CloneResumeToolOutput,
  CreateResumeFromDocumentToolOutput,
  GetResumeDocumentToolOutput,
  ResumeBlockType,
  SearchResumeBlocksToolOutput,
  UpdateResumeDocumentToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { joinSearchable, libraryRowBase, nowMs } from "../../-utils/row-helpers";

export type EventSourcedResumeAiContext = {
  db: AppDb;
  resumeId: string;
  userId: string;
  navigateToResume: (resumeId: string, tab: "edit" | "preview" | "json") => void;
};

function requireDetail(db: AppDb, resumeId: string) {
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

function parseTech(tech: string): string[] {
  try {
    const parsed: unknown = JSON.parse(tech);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    if (tech.trim())
      return tech
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  }
  return [];
}

export function getLocalResumeDocument(
  ctx: EventSourcedResumeAiContext,
): GetResumeDocumentToolOutput {
  const { detail } = requireDetail(ctx.db, ctx.resumeId);
  return {
    resume: {
      id: detail.id,
      name: detail.name ?? "",
      description: detail.description ?? "",
      jobDescription: detail.jobDescription ?? "",
      document: resumeDetailToDocument(detail),
      updatedAt: detail.updatedAt,
    },
  };
}

export function searchLocalResumeBlocks(
  ctx: EventSourcedResumeAiContext,
  input: {
    keyword?: string;
    blockTypes?: ResumeBlockType[];
    limitPerType?: number;
  },
): SearchResumeBlocksToolOutput {
  const { detail } = requireDetail(ctx.db, ctx.resumeId);
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
  ctx: EventSourcedResumeAiContext,
  input: {
    name?: string;
    description?: string;
    jobDescription?: string;
    sourceResumeId?: string;
  },
): CloneResumeToolOutput {
  const sourceResumeId = input.sourceResumeId ?? ctx.resumeId;
  const { resumeId, name } = cloneResume(ctx.db, sourceResumeId, input);
  return { sourceResumeId, resumeId, name };
}

export async function createLocalResumeFromDocument(
  ctx: EventSourcedResumeAiContext,
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

export async function updateLocalResumeDocument(
  ctx: EventSourcedResumeAiContext,
  document: ResumeDocumentV1,
): Promise<UpdateResumeDocumentToolOutput> {
  const { snapshots, detail } = requireDetail(ctx.db, ctx.resumeId);
  const workspace = createEventSourcedResumeWorkspace(ctx.db, detail, snapshots);
  await workspace.replaceDocument(document);
  return {
    resumeId: ctx.resumeId,
    updatedAt: new Date(nowMs()).toISOString(),
  };
}
