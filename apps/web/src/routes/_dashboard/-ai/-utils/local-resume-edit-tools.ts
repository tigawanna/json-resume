import { createEventSourcedResumeWorkspace } from "@/data-access-layer/event-sourced/event-sourced-resume-workspace";
import { editLayout } from "@/data-access-layer/event-sourced/resume-layout-rows";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  removeFromResumeToolInputSchema,
  replaceResumeDocumentToolInputSchema,
  setExperienceBulletsToolInputSchema,
  setSkillsToolInputSchema,
  setSummaryToolInputSchema,
  updateResumeDetailsToolInputSchema,
  upsertEducationToolInputSchema,
  upsertExperienceToolInputSchema,
  upsertProjectToolInputSchema,
  upsertTalkToolInputSchema,
  type RemovableSection,
  type RemoveFromResumeToolInput,
  type RemoveFromResumeToolOutput,
  type ReplaceResumeDocumentToolInput,
  type ReplaceResumeDocumentToolOutput,
  type SetExperienceBulletsToolInput,
  type SetExperienceBulletsToolOutput,
  type SetSkillsToolInput,
  type SetSkillsToolOutput,
  type SetSummaryToolInput,
  type SetSummaryToolOutput,
  type UpdateResumeDetailsToolInput,
  type UpdateResumeDetailsToolOutput,
  type UpsertEducationToolInput,
  type UpsertEducationToolOutput,
  type UpsertExperienceToolInput,
  type UpsertExperienceToolOutput,
  type UpsertProjectToolInput,
  type UpsertProjectToolOutput,
  type UpsertTalkToolInput,
  type UpsertTalkToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import { parseTalkLinks, parseTech, resumeView } from "@/features/agentic-tools/shared/resume-view";
import { removeEntity, type LayoutEntityKey } from "@/features/resume/resume-layout";
import { nowMs } from "../../-utils/row-helpers";
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

function requireLibraryRow<T>(row: T | undefined, kind: string, id: string): T {
  if (!row) {
    throw new Error(`${kind} ${id} was not found in the library. Read the ids with get_resume.`);
  }
  return row;
}

function requireOnCreate(value: string | undefined, tool: string, field: string): string {
  if (!value) throw new Error(`${tool} needs ${field} when creating (no id given).`);
  return value;
}

function requireItem<T extends { id: string }>(
  items: T[] | undefined,
  id: string,
  kind: string,
): T {
  const item = items?.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${kind} ${id} is not on the résumé after saving.`);
  return item;
}

function isOnResume(rows: ReadonlyArray<{ id: string }>, id: string) {
  return rows.some((row) => row.id === id);
}

export async function upsertLocalExperience(
  ctx: LocalToolContext,
  input: UpsertExperienceToolInput,
): Promise<UpsertExperienceToolOutput> {
  const data = upsertExperienceToolInputSchema.parse(input);
  const { resumeId, detail, workspace } = openWorkspace(ctx, data.resumeId);
  const library = ctx.db.collections.resumeExperience;
  let id: string;
  let created = false;

  if (data.id) {
    const row = requireLibraryRow(library.get(data.id), "Experience", data.id);
    await workspace.updateExperience(row.id, {
      company: data.company ?? row.company,
      role: data.role ?? row.role,
      startDate: data.startDate ?? row.startDate,
      endDate: data.endDate ?? row.endDate,
      location: data.location ?? row.location,
    });
    if (!isOnResume(detail.experiences, row.id)) {
      await workspace.attachLibraryRows("experiences", [row.id]);
    }
    id = row.id;
  } else {
    const sizeBefore = library.size;
    ({ id } = await workspace.createExperience({
      company: requireOnCreate(data.company, "upsert_experience", "company"),
      role: requireOnCreate(data.role, "upsert_experience", "role"),
      startDate: data.startDate ?? "",
      endDate: data.endDate ?? "",
      location: data.location ?? "",
    }));
    created = library.size > sizeBefore;
  }
  if (data.bullets) await workspace.updateExperienceBullets(id, data.bullets);

  const view = resumeView(freshDetail(ctx, resumeId), ["experience"]);
  return { resumeId, created, experience: requireItem(view.experience, id, "Experience") };
}

export async function upsertLocalProject(
  ctx: LocalToolContext,
  input: UpsertProjectToolInput,
): Promise<UpsertProjectToolOutput> {
  const data = upsertProjectToolInputSchema.parse(input);
  const { resumeId, detail, workspace } = openWorkspace(ctx, data.resumeId);
  const library = ctx.db.collections.resumeProject;
  let id: string;
  let created = false;

  if (data.id) {
    const row = requireLibraryRow(library.get(data.id), "Project", data.id);
    await workspace.updateProject(row.id, {
      name: data.name ?? row.name,
      description: data.description ?? row.description,
      tech: data.tech ?? parseTech(row.tech),
      url: data.url ?? row.url,
      homepageUrl: data.homepageUrl ?? row.homepageUrl,
    });
    if (!isOnResume(detail.projects, row.id)) {
      await workspace.attachLibraryRows("projects", [row.id]);
    }
    id = row.id;
  } else {
    const sizeBefore = library.size;
    ({ id } = await workspace.createProject({
      name: requireOnCreate(data.name, "upsert_project", "name"),
      description: data.description ?? "",
      tech: data.tech ?? [],
      url: data.url ?? "",
      homepageUrl: data.homepageUrl ?? "",
    }));
    created = library.size > sizeBefore;
  }

  const view = resumeView(freshDetail(ctx, resumeId), ["projects"]);
  return { resumeId, created, project: requireItem(view.projects, id, "Project") };
}

export async function upsertLocalEducation(
  ctx: LocalToolContext,
  input: UpsertEducationToolInput,
): Promise<UpsertEducationToolOutput> {
  const data = upsertEducationToolInputSchema.parse(input);
  const { resumeId, detail, workspace } = openWorkspace(ctx, data.resumeId);
  const library = ctx.db.collections.resumeEducation;
  let id: string;
  let created = false;

  if (data.id) {
    const row = requireLibraryRow(library.get(data.id), "Education", data.id);
    await workspace.updateEducation(row.id, {
      school: data.school ?? row.school,
      degree: data.degree ?? row.degree,
      field: data.field ?? row.field,
      startDate: data.startDate ?? row.startDate,
      endDate: data.endDate ?? row.endDate,
      description: data.description ?? row.description,
    });
    if (!isOnResume(detail.education, row.id)) {
      await workspace.attachLibraryRows("education", [row.id]);
    }
    id = row.id;
  } else {
    const sizeBefore = library.size;
    ({ id } = await workspace.createEducation({
      school: requireOnCreate(data.school, "upsert_education", "school"),
      degree: data.degree ?? "",
      field: data.field ?? "",
      startDate: data.startDate ?? "",
      endDate: data.endDate ?? "",
      description: data.description ?? "",
    }));
    created = library.size > sizeBefore;
  }

  const view = resumeView(freshDetail(ctx, resumeId), ["education"]);
  return { resumeId, created, education: requireItem(view.education, id, "Education") };
}

export async function upsertLocalTalk(
  ctx: LocalToolContext,
  input: UpsertTalkToolInput,
): Promise<UpsertTalkToolOutput> {
  const data = upsertTalkToolInputSchema.parse(input);
  const { resumeId, detail, workspace } = openWorkspace(ctx, data.resumeId);
  const library = ctx.db.collections.resumeTalk;
  let id: string;
  let created = false;

  if (data.id) {
    const row = requireLibraryRow(library.get(data.id), "Talk", data.id);
    await workspace.updateTalk(row.id, {
      title: data.title ?? row.title,
      event: data.event ?? row.event,
      date: data.date ?? row.date,
      description: data.description ?? row.description,
      links: data.links ?? parseTalkLinks(row.links),
    });
    if (!isOnResume(detail.talks, row.id)) {
      await workspace.attachLibraryRows("talks", [row.id]);
    }
    id = row.id;
  } else {
    const sizeBefore = library.size;
    ({ id } = await workspace.createTalk({
      title: requireOnCreate(data.title, "upsert_talk", "title"),
      event: data.event ?? "",
      date: data.date ?? "",
      description: data.description ?? "",
      links: data.links ?? [],
    }));
    created = library.size > sizeBefore;
  }

  const view = resumeView(freshDetail(ctx, resumeId), ["talks"]);
  return { resumeId, created, talk: requireItem(view.talks, id, "Talk") };
}

export async function replaceLocalResumeDocument(
  ctx: LocalToolContext,
  input: ReplaceResumeDocumentToolInput,
): Promise<ReplaceResumeDocumentToolOutput> {
  const data = replaceResumeDocumentToolInputSchema.parse(input);
  const { resumeId, workspace } = openWorkspace(ctx, data.resumeId);
  await workspace.replaceDocument(data.document);
  return { resumeId, updatedAt: new Date(nowMs()).toISOString() };
}
