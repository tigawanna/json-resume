import "@tanstack/react-start/server-only";

import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { db } from "@/lib/drizzle/client";
import {
  resume,
  resumeCertification,
  resumeContact,
  resumeEducation,
  resumeEducationBullet,
  resumeExperience,
  resumeExperienceBullet,
  resumeLanguage,
  resumeLink,
  resumeProject,
  resumeSection,
  resumeSkill,
  resumeSkillGroup,
  resumeSummary,
  resumeTalk,
  resumeVolunteer,
} from "@/lib/drizzle/scheam";
import { savedProject } from "@/lib/drizzle/scheam/saved-project-schema";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../pagination.types";
import type { PaginatedResult } from "../pagination.types";
import { documentToInsertData } from "./resume-converters";
import type { ResumeDetailDTO, ResumeListItemDTO } from "./resume.types";

// ─── Helpers ────────────────────────────────────────────────

function toListItem(row: typeof resume.$inferSelect): ResumeListItemDTO {
  return {
    id: row.id,
    name: row.name,
    fullName: row.fullName,
    headline: row.headline,
    description: row.description,
    templateId: row.templateId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── List ───────────────────────────────────────────────────

export async function listResumesForUser({
  userId,
  id,
  keyword,
}: {
  userId: string;
  id?: string;
  keyword?: string;
}): Promise<ResumeListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (id) {
    conditions.push(eq(resume.id, id));
  }
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resume.name, pattern),
        like(resume.fullName, pattern),
        like(resume.headline, pattern),
        like(resume.description, pattern),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(resume)
    .where(and(...conditions))
    .orderBy(desc(resume.updatedAt));
  return rows.map(toListItem);
}

export async function listResumesForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<ResumeListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resume.name, pattern),
        like(resume.fullName, pattern),
        like(resume.headline, pattern),
        like(resume.description, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before" ? lt(resume.id, opts.cursor) : gt(resume.id, opts.cursor),
    );
  }

  const rows = await db
    .select()
    .from(resume)
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resume.id) : asc(resume.id))
    .limit(DEFAULT_PAGE_SIZE + 1);

  const hasMore = rows.length > DEFAULT_PAGE_SIZE;
  const orderedRows =
    direction === "before"
      ? rows.slice(0, DEFAULT_PAGE_SIZE).reverse()
      : rows.slice(0, DEFAULT_PAGE_SIZE);

  const items = orderedRows.map(toListItem);

  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (direction === "after") {
    nextCursor = hasMore ? items[items.length - 1].id : undefined;
    previousCursor = opts?.cursor !== undefined ? items[0]?.id : undefined;
  } else {
    previousCursor = hasMore ? items[0]?.id : undefined;
    nextCursor = items.length > 0 ? items[items.length - 1].id : undefined;
  }

  return { items, nextCursor, previousCursor };
}

// ─── Get full resume with all relations ─────────────────────

export async function getResumeDetail(
  resumeId: string,
  userId: string,
): Promise<ResumeDetailDTO | null> {
  const row = await db.query.resume.findFirst({
    where: and(eq(resume.id, resumeId), eq(resume.userId, userId)),
    with: {
      sections: { orderBy: [asc(resumeSection.sortOrder)] },
      contacts: { orderBy: [asc(resumeContact.sortOrder)] },
      links: { orderBy: [asc(resumeLink.sortOrder)] },
      summaries: { orderBy: [asc(resumeSummary.sortOrder)] },
      experiences: {
        orderBy: [desc(resumeExperience.sortOrder), desc(resumeExperience.id)],
        with: {
          bullets: { orderBy: [asc(resumeExperienceBullet.sortOrder)] },
        },
      },
      education: {
        orderBy: [asc(resumeEducation.sortOrder)],
        with: {
          bullets: { orderBy: [asc(resumeEducationBullet.sortOrder)] },
        },
      },
      projects: { orderBy: [asc(resumeProject.sortOrder)] },
      skillGroups: {
        orderBy: [asc(resumeSkillGroup.sortOrder)],
        with: {
          skills: { orderBy: [asc(resumeSkill.sortOrder)] },
        },
      },
      talks: { orderBy: [asc(resumeTalk.sortOrder)] },
      certifications: { orderBy: [asc(resumeCertification.sortOrder)] },
      volunteers: { orderBy: [asc(resumeVolunteer.sortOrder)] },
      languages: { orderBy: [asc(resumeLanguage.sortOrder)] },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    fullName: row.fullName,
    headline: row.headline,
    description: row.description,
    jobDescription: row.jobDescription,
    templateId: row.templateId as TemplateId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sections: row.sections,
    contacts: row.contacts,
    links: row.links,
    summaries: row.summaries,
    experiences: row.experiences,
    education: row.education,
    projects: row.projects,
    skillGroups: row.skillGroups,
    talks: row.talks,
    certifications: row.certifications,
    volunteers: row.volunteers,
    languages: row.languages,
  };
}

// ─── Create (from ResumeDocumentV1 import) ──────────────────

export async function createResumeForUser(
  userId: string,
  input: {
    name: string;
    description: string;
    jobDescription: string;
    doc: ResumeDocumentV1;
  },
): Promise<string> {
  const resumeId = crypto.randomUUID();
  const data = documentToInsertData(resumeId, input.doc);

  await db.insert(resume).values({
    id: resumeId,
    userId,
    name: input.name,
    description: input.description,
    jobDescription: input.jobDescription,
    fullName: data.resume.fullName,
    headline: data.resume.headline,
    templateId: data.resume.templateId,
  });

  if (data.sections.length > 0) {
    await db.insert(resumeSection).values(data.sections);
  }
  if (data.contacts.length > 0) {
    await db.insert(resumeContact).values(data.contacts);
  }
  if (data.links.length > 0) {
    await db.insert(resumeLink).values(data.links);
  }
  if (data.summaries.length > 0) {
    await db.insert(resumeSummary).values(data.summaries);
  }
  if (data.experiences.length > 0) {
    await db.insert(resumeExperience).values(data.experiences);
  }
  if (data.experienceBullets.length > 0) {
    await db.insert(resumeExperienceBullet).values(data.experienceBullets);
  }
  if (data.education.length > 0) {
    await db.insert(resumeEducation).values(data.education);
  }
  if (data.educationBullets.length > 0) {
    await db.insert(resumeEducationBullet).values(data.educationBullets);
  }
  if (data.projects.length > 0) {
    await db.insert(resumeProject).values(data.projects);
  }
  if (data.skillGroups.length > 0) {
    await db.insert(resumeSkillGroup).values(data.skillGroups);
  }
  if (data.skills.length > 0) {
    await db.insert(resumeSkill).values(data.skills);
  }
  if (data.talks.length > 0) {
    await db.insert(resumeTalk).values(data.talks);
  }

  return resumeId;
}

// ─── Update resume metadata ────────────────────────────────

export async function updateResumeMetadata(
  resumeId: string,
  userId: string,
  input: {
    name?: string;
    description?: string;
    jobDescription?: string;
    fullName?: string;
    headline?: string;
    templateId?: string;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.jobDescription !== undefined) updates.jobDescription = input.jobDescription;
  if (input.fullName !== undefined) updates.fullName = input.fullName;
  if (input.headline !== undefined) updates.headline = input.headline;
  if (input.templateId !== undefined) updates.templateId = input.templateId;

  if (Object.keys(updates).length > 0) {
    await db
      .update(resume)
      .set(updates)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)));
  }
}

// ─── Delete ────────────────────────────────────────────────

export async function deleteResumeForUser(resumeId: string, userId: string): Promise<void> {
  await db.delete(resume).where(and(eq(resume.id, resumeId), eq(resume.userId, userId)));
}

// ─── Section CRUD ──────────────────────────────────────────

export async function upsertResumeSection(
  resumeId: string,
  input: { key: string; title: string; enabled: boolean; sortOrder: number },
): Promise<void> {
  const existing = await db
    .select()
    .from(resumeSection)
    .where(and(eq(resumeSection.resumeId, resumeId), eq(resumeSection.key, input.key)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(resumeSection)
      .set({ title: input.title, enabled: input.enabled, sortOrder: input.sortOrder })
      .where(eq(resumeSection.id, existing[0].id));
  } else {
    await db.insert(resumeSection).values({
      resumeId,
      key: input.key,
      title: input.title,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    });
  }
}

export async function batchUpdateSectionOrder(
  resumeId: string,
  sections: { key: string; enabled: boolean; sortOrder: number }[],
): Promise<void> {
  for (const s of sections) {
    await upsertResumeSection(resumeId, {
      ...s,
      title: s.key.charAt(0).toUpperCase() + s.key.slice(1),
    });
  }
}

// ─── Contact CRUD ──────────────────────────────────────────

export async function setResumeContacts(
  resumeId: string,
  contacts: { type: string; value: string; label: string }[],
): Promise<void> {
  await db.delete(resumeContact).where(eq(resumeContact.resumeId, resumeId));
  if (contacts.length > 0) {
    await db.insert(resumeContact).values(
      contacts.map((c, i) => ({
        resumeId,
        type: c.type,
        value: c.value,
        label: c.label,
        sortOrder: i,
      })),
    );
  }
}

// ─── Link CRUD ─────────────────────────────────────────────

export async function setResumeLinks(
  resumeId: string,
  links: { label: string; url: string; icon?: string }[],
): Promise<void> {
  await db.delete(resumeLink).where(eq(resumeLink.resumeId, resumeId));
  if (links.length > 0) {
    await db.insert(resumeLink).values(
      links.map((l, i) => ({
        resumeId,
        label: l.label,
        url: l.url,
        icon: l.icon ?? null,
        sortOrder: i,
      })),
    );
  }
}

export async function addLink(
  resumeId: string,
  input: { label: string; url: string; icon?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeLink).values({
    id,
    resumeId,
    label: input.label,
    url: input.url,
    icon: input.icon ?? null,
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateLink(
  linkId: string,
  input: { label?: string; url?: string; icon?: string; sortOrder?: number },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.label !== undefined) updates.label = input.label;
  if (input.url !== undefined) updates.url = input.url;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeLink).set(updates).where(eq(resumeLink.id, linkId));
  }
}

export async function deleteLinkById(linkId: string): Promise<void> {
  await db.delete(resumeLink).where(eq(resumeLink.id, linkId));
}

// ─── Summary CRUD ──────────────────────────────────────────

export async function setResumeSummary(resumeId: string, text: string): Promise<void> {
  await db.delete(resumeSummary).where(eq(resumeSummary.resumeId, resumeId));
  if (text.trim()) {
    await db.insert(resumeSummary).values({ resumeId, text, sortOrder: 0 });
  }
}

export async function addSummaryItem(
  resumeId: string,
  input: { text: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeSummary).values({
    id,
    resumeId,
    text: input.text,
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateSummaryItem(
  summaryId: string,
  input: { text?: string; sortOrder?: number },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.text !== undefined) updates.text = input.text;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeSummary).set(updates).where(eq(resumeSummary.id, summaryId));
  }
}

export async function deleteSummaryById(summaryId: string): Promise<void> {
  await db.delete(resumeSummary).where(eq(resumeSummary.id, summaryId));
}

// ─── Experience CRUD ───────────────────────────────────────

export async function addExperience(
  resumeId: string,
  input: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    location?: string;
    sortOrder: number;
    bullets: string[];
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeExperience).values({
    id,
    resumeId,
    company: input.company,
    role: input.role,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location ?? "",
    sortOrder: input.sortOrder,
  });
  if (input.bullets.length > 0) {
    await db.insert(resumeExperienceBullet).values(
      input.bullets.map((text, i) => ({
        experienceId: id,
        text,
        sortOrder: i,
      })),
    );
  }
  return id;
}

export async function updateExperience(
  experienceId: string,
  input: {
    company?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    sortOrder?: number;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.company !== undefined) updates.company = input.company;
  if (input.role !== undefined) updates.role = input.role;
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.endDate !== undefined) updates.endDate = input.endDate;
  if (input.location !== undefined) updates.location = input.location;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeExperience).set(updates).where(eq(resumeExperience.id, experienceId));
  }
}

export async function deleteExperience(experienceId: string): Promise<void> {
  await db.delete(resumeExperience).where(eq(resumeExperience.id, experienceId));
}

export async function setExperienceBullets(experienceId: string, bullets: string[]): Promise<void> {
  await db
    .delete(resumeExperienceBullet)
    .where(eq(resumeExperienceBullet.experienceId, experienceId));
  if (bullets.length > 0) {
    await db.insert(resumeExperienceBullet).values(
      bullets.map((text, i) => ({
        experienceId,
        text,
        sortOrder: i,
      })),
    );
  }
}

// ─── Education CRUD ────────────────────────────────────────

export async function addEducation(
  resumeId: string,
  input: {
    school: string;
    degree: string;
    field?: string;
    startDate?: string;
    endDate: string;
    description?: string;
    sortOrder: number;
    bullets?: string[];
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeEducation).values({
    id,
    resumeId,
    school: input.school,
    degree: input.degree,
    field: input.field ?? "",
    startDate: input.startDate ?? "",
    endDate: input.endDate,
    description: input.description ?? "",
    sortOrder: input.sortOrder,
  });
  if (input.bullets && input.bullets.length > 0) {
    await db.insert(resumeEducationBullet).values(
      input.bullets.map((text, i) => ({
        educationId: id,
        text,
        sortOrder: i,
      })),
    );
  }
  return id;
}

export async function updateEducation(
  educationId: string,
  input: {
    school?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    sortOrder?: number;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.school !== undefined) updates.school = input.school;
  if (input.degree !== undefined) updates.degree = input.degree;
  if (input.field !== undefined) updates.field = input.field;
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.endDate !== undefined) updates.endDate = input.endDate;
  if (input.description !== undefined) updates.description = input.description;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeEducation).set(updates).where(eq(resumeEducation.id, educationId));
  }
}

export async function deleteEducation(educationId: string): Promise<void> {
  await db.delete(resumeEducation).where(eq(resumeEducation.id, educationId));
}

// ─── Project CRUD ──────────────────────────────────────────

export async function addProject(
  resumeId: string,
  input: {
    name: string;
    url?: string;
    homepageUrl?: string;
    description: string;
    tech: string[];
    sortOrder: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeProject).values({
    id,
    resumeId,
    name: input.name,
    url: input.url ?? "",
    homepageUrl: input.homepageUrl ?? "",
    description: input.description,
    tech: JSON.stringify(input.tech),
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateProject(
  projectId: string,
  input: {
    name?: string;
    url?: string;
    homepageUrl?: string;
    description?: string;
    tech?: string[];
    sortOrder?: number;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.url !== undefined) updates.url = input.url;
  if (input.homepageUrl !== undefined) updates.homepageUrl = input.homepageUrl;
  if (input.description !== undefined) updates.description = input.description;
  if (input.tech !== undefined) updates.tech = JSON.stringify(input.tech);
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeProject).set(updates).where(eq(resumeProject.id, projectId));
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.delete(resumeProject).where(eq(resumeProject.id, projectId));
}

// ─── Skill Group CRUD ──────────────────────────────────────

export async function setSkillGroups(
  resumeId: string,
  groups: { name: string; items: string[] }[],
): Promise<void> {
  // Delete all existing groups (cascade deletes skills)
  await db.delete(resumeSkillGroup).where(eq(resumeSkillGroup.resumeId, resumeId));
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    const groupId = crypto.randomUUID();
    await db.insert(resumeSkillGroup).values({
      id: groupId,
      resumeId,
      name: g.name,
      sortOrder: gi,
    });
    if (g.items.length > 0) {
      await db.insert(resumeSkill).values(
        g.items.map((name, si) => ({
          groupId,
          name,
          level: null,
          sortOrder: si,
        })),
      );
    }
  }
}

export async function addSkillGroup(
  resumeId: string,
  input: { name: string; skills: string[]; sortOrder: number },
): Promise<string> {
  const groupId = crypto.randomUUID();
  await db.insert(resumeSkillGroup).values({
    id: groupId,
    resumeId,
    name: input.name,
    sortOrder: input.sortOrder,
  });
  if (input.skills.length > 0) {
    await db
      .insert(resumeSkill)
      .values(input.skills.map((name, si) => ({ groupId, name, level: null, sortOrder: si })));
  }
  return groupId;
}

export async function updateSkillGroup(
  groupId: string,
  input: { name?: string; skills?: string[]; sortOrder?: number },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeSkillGroup).set(updates).where(eq(resumeSkillGroup.id, groupId));
  }
  if (input.skills !== undefined) {
    await db.delete(resumeSkill).where(eq(resumeSkill.groupId, groupId));
    if (input.skills.length > 0) {
      await db
        .insert(resumeSkill)
        .values(input.skills.map((name, si) => ({ groupId, name, level: null, sortOrder: si })));
    }
  }
}

export async function deleteSkillGroupById(groupId: string): Promise<void> {
  await db.delete(resumeSkillGroup).where(eq(resumeSkillGroup.id, groupId));
}

// ─── Certification CRUD ────────────────────────────────────

export async function addCertification(
  resumeId: string,
  input: { name: string; issuer?: string; date?: string; url?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeCertification).values({
    id,
    resumeId,
    name: input.name,
    issuer: input.issuer ?? "",
    date: input.date ?? "",
    url: input.url ?? "",
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateCertification(
  certId: string,
  input: { name?: string; issuer?: string; date?: string; url?: string; sortOrder?: number },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.issuer !== undefined) updates.issuer = input.issuer;
  if (input.date !== undefined) updates.date = input.date;
  if (input.url !== undefined) updates.url = input.url;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeCertification).set(updates).where(eq(resumeCertification.id, certId));
  }
}

export async function deleteCertification(certId: string): Promise<void> {
  await db.delete(resumeCertification).where(eq(resumeCertification.id, certId));
}

// ─── Volunteer CRUD ────────────────────────────────────────

export async function addVolunteer(
  resumeId: string,
  input: {
    organization: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    sortOrder: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeVolunteer).values({
    id,
    resumeId,
    organization: input.organization,
    role: input.role ?? "",
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
    description: input.description ?? "",
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateVolunteer(
  volunteerId: string,
  input: {
    organization?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    sortOrder?: number;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.organization !== undefined) updates.organization = input.organization;
  if (input.role !== undefined) updates.role = input.role;
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.endDate !== undefined) updates.endDate = input.endDate;
  if (input.description !== undefined) updates.description = input.description;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeVolunteer).set(updates).where(eq(resumeVolunteer.id, volunteerId));
  }
}

export async function deleteVolunteerById(volunteerId: string): Promise<void> {
  await db.delete(resumeVolunteer).where(eq(resumeVolunteer.id, volunteerId));
}

// ─── Language CRUD ─────────────────────────────────────────

export async function addLanguage(
  resumeId: string,
  input: { name: string; proficiency?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeLanguage).values({
    id,
    resumeId,
    name: input.name,
    proficiency: input.proficiency ?? "",
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateLanguage(
  languageId: string,
  input: { name?: string; proficiency?: string; sortOrder?: number },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.proficiency !== undefined) updates.proficiency = input.proficiency;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeLanguage).set(updates).where(eq(resumeLanguage.id, languageId));
  }
}

export async function deleteLanguageById(languageId: string): Promise<void> {
  await db.delete(resumeLanguage).where(eq(resumeLanguage.id, languageId));
}

// ─── Contact CRUD ──────────────────────────────────────────

export async function addContact(
  resumeId: string,
  input: { type: string; value: string; label?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeContact).values({
    id,
    resumeId,
    type: input.type,
    value: input.value,
    label: input.label ?? "",
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateContact(
  contactId: string,
  input: { type?: string; value?: string; label?: string; sortOrder?: number },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.type !== undefined) updates.type = input.type;
  if (input.value !== undefined) updates.value = input.value;
  if (input.label !== undefined) updates.label = input.label;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeContact).set(updates).where(eq(resumeContact.id, contactId));
  }
}

export async function deleteContactById(contactId: string): Promise<void> {
  await db.delete(resumeContact).where(eq(resumeContact.id, contactId));
}

// ─── Talk CRUD ─────────────────────────────────────────────

export async function addTalk(
  resumeId: string,
  input: {
    title: string;
    event?: string;
    date?: string;
    description?: string;
    links?: { label: string; url: string }[];
    sortOrder: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeTalk).values({
    id,
    resumeId,
    title: input.title,
    event: input.event ?? "",
    date: input.date ?? "",
    description: input.description ?? "",
    links: JSON.stringify(input.links ?? []),
    sortOrder: input.sortOrder,
  });
  return id;
}

export async function updateTalk(
  talkId: string,
  input: {
    title?: string;
    event?: string;
    date?: string;
    description?: string;
    links?: { label: string; url: string }[];
    sortOrder?: number;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.event !== undefined) updates.event = input.event;
  if (input.date !== undefined) updates.date = input.date;
  if (input.description !== undefined) updates.description = input.description;
  if (input.links !== undefined) updates.links = JSON.stringify(input.links);
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeTalk).set(updates).where(eq(resumeTalk.id, talkId));
  }
}

export async function deleteTalk(talkId: string): Promise<void> {
  await db.delete(resumeTalk).where(eq(resumeTalk.id, talkId));
}

// ─── Full update from ResumeDocumentV1 (replace-all) ───────

export async function replaceResumeContent(
  resumeId: string,
  userId: string,
  doc: ResumeDocumentV1,
): Promise<void> {
  // Update resume metadata
  await updateResumeMetadata(resumeId, userId, {
    fullName: doc.header.fullName,
    headline: doc.header.headline,
    templateId: doc.meta.templateId,
  });

  // Delete all child rows (cascade takes care of nested children)
  await db.delete(resumeSection).where(eq(resumeSection.resumeId, resumeId));
  await db.delete(resumeContact).where(eq(resumeContact.resumeId, resumeId));
  await db.delete(resumeLink).where(eq(resumeLink.resumeId, resumeId));
  await db.delete(resumeSummary).where(eq(resumeSummary.resumeId, resumeId));
  await db.delete(resumeExperience).where(eq(resumeExperience.resumeId, resumeId));
  await db.delete(resumeEducation).where(eq(resumeEducation.resumeId, resumeId));
  await db.delete(resumeProject).where(eq(resumeProject.resumeId, resumeId));
  await db.delete(resumeSkillGroup).where(eq(resumeSkillGroup.resumeId, resumeId));
  await db.delete(resumeTalk).where(eq(resumeTalk.resumeId, resumeId));

  // Re-insert from doc
  const data = documentToInsertData(resumeId, doc);

  if (data.sections.length > 0) await db.insert(resumeSection).values(data.sections);
  if (data.contacts.length > 0) await db.insert(resumeContact).values(data.contacts);
  if (data.links.length > 0) await db.insert(resumeLink).values(data.links);
  if (data.summaries.length > 0) await db.insert(resumeSummary).values(data.summaries);
  if (data.experiences.length > 0) await db.insert(resumeExperience).values(data.experiences);
  if (data.experienceBullets.length > 0)
    await db.insert(resumeExperienceBullet).values(data.experienceBullets);
  if (data.education.length > 0) await db.insert(resumeEducation).values(data.education);
  if (data.educationBullets.length > 0)
    await db.insert(resumeEducationBullet).values(data.educationBullets);
  if (data.projects.length > 0) await db.insert(resumeProject).values(data.projects);
  if (data.skillGroups.length > 0) await db.insert(resumeSkillGroup).values(data.skillGroups);
  if (data.skills.length > 0) await db.insert(resumeSkill).values(data.skills);
  if (data.talks.length > 0) await db.insert(resumeTalk).values(data.talks);
}

// ─── Search existing items across all user's resumes ───────
// Used by "pick from existing" modal

export async function searchUserExperienceBullets(
  userId: string,
  query: string,
): Promise<{ id: string; text: string; company: string; role: string }[]> {
  const userResumes = await db
    .select({ id: resume.id })
    .from(resume)
    .where(eq(resume.userId, userId));

  if (userResumes.length === 0) return [];
  const resumeIds = userResumes.map((r) => r.id);

  const experiences = await db
    .select()
    .from(resumeExperience)
    .where(
      resumeIds.length === 1
        ? eq(resumeExperience.resumeId, resumeIds[0]!)
        : eq(resumeExperience.resumeId, resumeIds[0]!), // Simplified for single-resume case
    );

  const bullets = [];
  for (const exp of experiences) {
    const expBullets = await db
      .select()
      .from(resumeExperienceBullet)
      .where(eq(resumeExperienceBullet.experienceId, exp.id))
      .orderBy(asc(resumeExperienceBullet.sortOrder));

    for (const b of expBullets) {
      if (!query || b.text.toLowerCase().includes(query.toLowerCase())) {
        bullets.push({
          id: b.id,
          text: b.text,
          company: exp.company,
          role: exp.role,
        });
      }
    }
  }
  return bullets;
}

export async function searchUserExperiences(
  userId: string,
  query: string,
): Promise<
  {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    resumeId: string;
  }[]
> {
  const rows = await db
    .select({
      id: resumeExperience.id,
      company: resumeExperience.company,
      role: resumeExperience.role,
      startDate: resumeExperience.startDate,
      endDate: resumeExperience.endDate,
      resumeId: resumeExperience.resumeId,
      userId: resume.userId,
    })
    .from(resumeExperience)
    .innerJoin(resume, eq(resumeExperience.resumeId, resume.id))
    .where(eq(resume.userId, userId));

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) => r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q),
  );
}

export async function searchUserProjects(
  userId: string,
  query: string,
): Promise<
  {
    id: string;
    name: string;
    description: string;
    url: string;
    homepageUrl: string;
    tech: string;
  }[]
> {
  const [resumeRows, savedRows] = await Promise.all([
    db
      .select({
        id: resumeProject.id,
        name: resumeProject.name,
        description: resumeProject.description,
        url: resumeProject.url,
        homepageUrl: resumeProject.homepageUrl,
        tech: resumeProject.tech,
      })
      .from(resumeProject)
      .innerJoin(resume, eq(resumeProject.resumeId, resume.id))
      .where(eq(resume.userId, userId)),
    db
      .select({
        id: savedProject.id,
        name: savedProject.name,
        description: savedProject.description,
        url: savedProject.url,
        homepageUrl: savedProject.homepageUrl,
        tech: savedProject.tech,
      })
      .from(savedProject)
      .where(eq(savedProject.userId, userId)),
  ]);

  const seenNames = new Set<string>();
  const merged: {
    id: string;
    name: string;
    description: string;
    url: string;
    homepageUrl: string;
    tech: string;
  }[] = [];

  for (const row of [...savedRows, ...resumeRows]) {
    const key = row.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      merged.push(row);
    }
  }

  if (!query) return merged;
  const q = query.toLowerCase();
  return merged.filter(
    (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
  );
}

export async function searchUserEducation(
  userId: string,
  query: string,
): Promise<{ id: string; school: string; degree: string; field: string; endDate: string }[]> {
  const rows = await db
    .select({
      id: resumeEducation.id,
      school: resumeEducation.school,
      degree: resumeEducation.degree,
      field: resumeEducation.field,
      endDate: resumeEducation.endDate,
    })
    .from(resumeEducation)
    .innerJoin(resume, eq(resumeEducation.resumeId, resume.id))
    .where(eq(resume.userId, userId));

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) => r.school.toLowerCase().includes(q) || r.degree.toLowerCase().includes(q),
  );
}

export async function searchUserSkills(
  userId: string,
  query: string,
): Promise<{ id: string; name: string; groupName: string }[]> {
  const rows = await db
    .select({
      id: resumeSkill.id,
      name: resumeSkill.name,
      groupName: resumeSkillGroup.name,
    })
    .from(resumeSkill)
    .innerJoin(resumeSkillGroup, eq(resumeSkill.groupId, resumeSkillGroup.id))
    .innerJoin(resume, eq(resumeSkillGroup.resumeId, resume.id))
    .where(eq(resume.userId, userId));

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter((r) => r.name.toLowerCase().includes(q));
}

export async function searchUserTalks(
  userId: string,
  query: string,
): Promise<{ id: string; title: string; event: string; date: string }[]> {
  const rows = await db
    .select({
      id: resumeTalk.id,
      title: resumeTalk.title,
      event: resumeTalk.event,
      date: resumeTalk.date,
    })
    .from(resumeTalk)
    .innerJoin(resume, eq(resumeTalk.resumeId, resume.id))
    .where(eq(resume.userId, userId));

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.event.toLowerCase().includes(q) ||
      r.date.toLowerCase().includes(q),
  );
}
