import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/event-sourced-resume-workspace";
import { editLayout } from "@/data-access-layer/event-sourced/resume-layout-rows";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  removeFromResumeToolInputSchema,
  setExperienceBulletsToolInputSchema,
  setSkillsToolInputSchema,
  setSummaryToolInputSchema,
  updateResumeDetailsToolInputSchema,
  type RemovableSection,
  type RemoveFromResumeToolInput,
  type RemoveFromResumeToolOutput,
  type SetExperienceBulletsToolInput,
  type SetExperienceBulletsToolOutput,
  type SetSkillsToolInput,
  type SetSkillsToolOutput,
  type SetSummaryToolInput,
  type SetSummaryToolOutput,
  type UpdateResumeDetailsToolInput,
  type UpdateResumeDetailsToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { resumeView } from "@/features/agentic-tools/shared/resume-view";
import { removeEntity, type LayoutEntityKey } from "@/features/resume/resume-layout";
import { requireDetail } from "./local-resume-tools";

/** The target résumé (given or active) with a workspace over its current rows. */
export function openWorkspace(ctx: LocalToolContext, resumeId: string | undefined) {
  const id = resumeId || ctx.getActiveResumeId();
  const { snapshots, detail } = requireDetail(ctx.db, id);
  return {
    resumeId: id,
    detail,
    workspace: createEventSourcedResumeWorkspace(ctx.db, detail, snapshots),
  };
}

/** Re-reads the résumé after a write, so outputs show what was stored. */
export function freshDetail(ctx: LocalToolContext, resumeId: string) {
  return requireDetail(ctx.db, resumeId).detail;
}

const LAYOUT_KEY: Record<RemovableSection, LayoutEntityKey> = {
  summary: "summaries",
  experience: "experiences",
  education: "education",
  projects: "projects",
  talks: "talks",
  skills: "skillGroups",
  notes: "notes",
  contacts: "contacts",
  links: "links",
};

function sectionIds(detail: ResumeDetailDTO, section: RemovableSection): string[] {
  const rows: Record<RemovableSection, ReadonlyArray<{ id: string }>> = {
    summary: detail.summaries,
    experience: detail.experiences,
    education: detail.education,
    projects: detail.projects,
    talks: detail.talks,
    skills: detail.skillGroups,
    notes: detail.notes,
    contacts: detail.contacts,
    links: detail.links,
  };
  return rows[section].map((row) => row.id);
}

export async function updateLocalResumeDetails(
  ctx: LocalToolContext,
  input: UpdateResumeDetailsToolInput,
): Promise<UpdateResumeDetailsToolOutput> {
  const data = updateResumeDetailsToolInputSchema.parse(input);
  const { resumeId, detail, workspace } = openWorkspace(ctx, data.resumeId);
  const values = {
    name: data.name ?? detail.name,
    fullName: data.fullName ?? detail.fullName,
    headline: data.headline ?? detail.headline,
    description: data.description ?? detail.description,
    templateId: data.templateId ?? detail.templateId,
  };
  await workspace.updateMetadata(values);
  return { resumeId, ...values };
}

export async function setLocalSummary(
  ctx: LocalToolContext,
  input: SetSummaryToolInput,
): Promise<SetSummaryToolOutput> {
  const data = setSummaryToolInputSchema.parse(input);
  const { resumeId, workspace } = openWorkspace(ctx, data.resumeId);
  await workspace.updateSummary(data.text);
  const summary = resumeView(freshDetail(ctx, resumeId), ["summary"]).summary?.[0];
  return { resumeId, summary: summary ?? null };
}

export async function setLocalExperienceBullets(
  ctx: LocalToolContext,
  input: SetExperienceBulletsToolInput,
): Promise<SetExperienceBulletsToolOutput> {
  const data = setExperienceBulletsToolInputSchema.parse(input);
  const { resumeId, detail, workspace } = openWorkspace(ctx, data.resumeId);
  if (!detail.experiences.some((experience) => experience.id === data.experienceId)) {
    throw new Error(
      `Experience ${data.experienceId} is not on this résumé. Read the ids with get_resume.`,
    );
  }
  await workspace.updateExperienceBullets(data.experienceId, data.bullets);
  const experience = resumeView(freshDetail(ctx, resumeId), ["experience"]).experience?.find(
    (item) => item.id === data.experienceId,
  );
  return { resumeId, experienceId: data.experienceId, bullets: experience?.bullets ?? [] };
}

export async function setLocalSkills(
  ctx: LocalToolContext,
  input: SetSkillsToolInput,
): Promise<SetSkillsToolOutput> {
  const data = setSkillsToolInputSchema.parse(input);
  const { resumeId, workspace } = openWorkspace(ctx, data.resumeId);
  await workspace.updateSkillGroups(
    data.groups.map((group) => ({ name: group.name, items: group.skills })),
  );
  return { resumeId, skills: resumeView(freshDetail(ctx, resumeId), ["skills"]).skills ?? [] };
}

export function removeLocalFromResume(
  ctx: LocalToolContext,
  input: RemoveFromResumeToolInput,
): RemoveFromResumeToolOutput {
  const data = removeFromResumeToolInputSchema.parse(input);
  const { resumeId, detail } = openWorkspace(ctx, data.resumeId);
  const removed = sectionIds(detail, data.section).includes(data.itemId);
  if (removed) {
    editLayout(ctx.db, resumeId, (layout) =>
      removeEntity(layout, LAYOUT_KEY[data.section], data.itemId),
    );
  }
  return { resumeId, section: data.section, itemId: data.itemId, removed };
}
