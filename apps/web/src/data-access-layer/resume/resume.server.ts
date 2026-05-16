import "@tanstack/react-start/server-only";

import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { db } from "@/lib/drizzle/client";
import {
  resume,
  resumeCertification,
  resumeCertificationItem,
  resumeContact,
  resumeContactItem,
  resumeEducation,
  resumeEducationBullet,
  resumeEducationItem,
  resumeExperience,
  resumeExperienceBullet,
  resumeExperienceItem,
  resumeLanguage,
  resumeLanguageItem,
  resumeLink,
  resumeLinkItem,
  resumeProject,
  resumeProjectItem,
  resumeSection,
  resumeSkill,
  resumeSkillGroup,
  resumeSkillGroupItem,
  resumeSummary,
  resumeSummaryItem,
  resumeTalk,
  resumeTalkItem,
  resumeVolunteer,
  resumeVolunteerItem,
} from "@/lib/drizzle/scheam";
import { savedProject } from "@/lib/drizzle/scheam/saved-project-schema";
import { and, asc, desc, eq, gt, inArray, isNull, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../pagination.types";
import type { PaginatedResult } from "../pagination.types";
import { documentToInsertData } from "./resume-converters";
import type { ResumeDetailDTO, ResumeListItemDTO } from "./resume.types";

type ResumeInsertData = ReturnType<typeof documentToInsertData>;

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

export async function assertResumeBelongsToUser(resumeId: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: resume.id })
    .from(resume)
    .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    throw new Error("Resume not found");
  }
}

export async function assertLinkBelongsToUser(linkId: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: resumeLink.id })
    .from(resumeLink)
    .where(and(eq(resumeLink.id, linkId), eq(resumeLink.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Link not found");
}

export async function assertSummaryBelongsToUser(summaryId: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: resumeSummary.id })
    .from(resumeSummary)
    .where(and(eq(resumeSummary.id, summaryId), eq(resumeSummary.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Summary not found");
}

export async function assertExperienceBelongsToUser(
  experienceId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeExperience.id })
    .from(resumeExperience)
    .where(and(eq(resumeExperience.id, experienceId), eq(resumeExperience.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Experience not found");
}

export async function assertEducationBelongsToUser(
  educationId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeEducation.id })
    .from(resumeEducation)
    .where(and(eq(resumeEducation.id, educationId), eq(resumeEducation.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Education not found");
}

export async function assertProjectBelongsToUser(projectId: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: resumeProject.id })
    .from(resumeProject)
    .where(and(eq(resumeProject.id, projectId), eq(resumeProject.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Project not found");
}

export async function assertSkillGroupBelongsToUser(
  groupId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeSkillGroup.id })
    .from(resumeSkillGroup)
    .where(and(eq(resumeSkillGroup.id, groupId), eq(resumeSkillGroup.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Skill group not found");
}

export async function assertCertificationBelongsToUser(
  certificationId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeCertification.id })
    .from(resumeCertification)
    .where(and(eq(resumeCertification.id, certificationId), eq(resumeCertification.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Certification not found");
}

export async function assertVolunteerBelongsToUser(
  volunteerId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeVolunteer.id })
    .from(resumeVolunteer)
    .where(and(eq(resumeVolunteer.id, volunteerId), eq(resumeVolunteer.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Volunteer item not found");
}

export async function assertLanguageBelongsToUser(
  languageId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeLanguage.id })
    .from(resumeLanguage)
    .where(and(eq(resumeLanguage.id, languageId), eq(resumeLanguage.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Language not found");
}

export async function assertContactBelongsToUser(contactId: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: resumeContact.id })
    .from(resumeContact)
    .where(and(eq(resumeContact.id, contactId), eq(resumeContact.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Contact not found");
}

export async function assertTalkBelongsToUser(talkId: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: resumeTalk.id })
    .from(resumeTalk)
    .where(and(eq(resumeTalk.id, talkId), eq(resumeTalk.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Talk not found");
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
  });

  if (!row) return null;

  const sections = await db.query.resumeSection.findMany({
    where: eq(resumeSection.resumeId, resumeId),
    orderBy: [asc(resumeSection.sortOrder)],
  });

  const contacts = await db
    .select({
      id: resumeContact.id,
      resumeId: resumeContactItem.resumeId,
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
      sortOrder: resumeContactItem.sortOrder,
    })
    .from(resumeContactItem)
    .innerJoin(resumeContact, eq(resumeContactItem.contactId, resumeContact.id))
    .where(eq(resumeContactItem.resumeId, resumeId))
    .orderBy(asc(resumeContactItem.sortOrder));

  const links = await db
    .select({
      id: resumeLink.id,
      resumeId: resumeLinkItem.resumeId,
      label: resumeLink.label,
      url: resumeLink.url,
      icon: resumeLink.icon,
      sortOrder: resumeLinkItem.sortOrder,
    })
    .from(resumeLinkItem)
    .innerJoin(resumeLink, eq(resumeLinkItem.linkId, resumeLink.id))
    .where(eq(resumeLinkItem.resumeId, resumeId))
    .orderBy(asc(resumeLinkItem.sortOrder));

  const summaries = await db
    .select({
      id: resumeSummary.id,
      resumeId: resumeSummaryItem.resumeId,
      text: resumeSummary.text,
      sortOrder: resumeSummaryItem.sortOrder,
    })
    .from(resumeSummaryItem)
    .innerJoin(resumeSummary, eq(resumeSummaryItem.summaryId, resumeSummary.id))
    .where(eq(resumeSummaryItem.resumeId, resumeId))
    .orderBy(asc(resumeSummaryItem.sortOrder));

  const experienceRows = await db
    .select({
      id: resumeExperience.id,
      resumeId: resumeExperienceItem.resumeId,
      company: resumeExperience.company,
      role: resumeExperience.role,
      startDate: resumeExperience.startDate,
      endDate: resumeExperience.endDate,
      location: resumeExperience.location,
      sortOrder: resumeExperienceItem.sortOrder,
    })
    .from(resumeExperienceItem)
    .innerJoin(resumeExperience, eq(resumeExperienceItem.experienceId, resumeExperience.id))
    .where(eq(resumeExperienceItem.resumeId, resumeId))
    .orderBy(asc(resumeExperienceItem.sortOrder), asc(resumeExperience.id));

  const experiences: ResumeDetailDTO["experiences"] = [];
  for (const ex of experienceRows) {
    const bullets = await db
      .select({
        id: resumeExperienceBullet.id,
        experienceId: resumeExperienceBullet.experienceId,
        text: resumeExperienceBullet.text,
        sortOrder: resumeExperienceBullet.sortOrder,
      })
      .from(resumeExperienceBullet)
      .where(eq(resumeExperienceBullet.experienceId, ex.id))
      .orderBy(asc(resumeExperienceBullet.sortOrder));
    experiences.push({ ...ex, bullets });
  }

  const educationRows = await db
    .select({
      id: resumeEducation.id,
      resumeId: resumeEducationItem.resumeId,
      school: resumeEducation.school,
      degree: resumeEducation.degree,
      field: resumeEducation.field,
      startDate: resumeEducation.startDate,
      endDate: resumeEducation.endDate,
      description: resumeEducation.description,
      sortOrder: resumeEducationItem.sortOrder,
    })
    .from(resumeEducationItem)
    .innerJoin(resumeEducation, eq(resumeEducationItem.educationId, resumeEducation.id))
    .where(eq(resumeEducationItem.resumeId, resumeId))
    .orderBy(asc(resumeEducationItem.sortOrder), asc(resumeEducation.id));

  const education: ResumeDetailDTO["education"] = [];
  for (const ed of educationRows) {
    const bullets = await db
      .select({
        id: resumeEducationBullet.id,
        educationId: resumeEducationBullet.educationId,
        text: resumeEducationBullet.text,
        sortOrder: resumeEducationBullet.sortOrder,
      })
      .from(resumeEducationBullet)
      .where(eq(resumeEducationBullet.educationId, ed.id))
      .orderBy(asc(resumeEducationBullet.sortOrder));
    education.push({ ...ed, bullets });
  }

  const projects = await db
    .select({
      id: resumeProject.id,
      resumeId: resumeProjectItem.resumeId,
      name: resumeProject.name,
      url: resumeProject.url,
      homepageUrl: resumeProject.homepageUrl,
      description: resumeProject.description,
      tech: resumeProject.tech,
      sortOrder: resumeProjectItem.sortOrder,
    })
    .from(resumeProjectItem)
    .innerJoin(resumeProject, eq(resumeProjectItem.projectId, resumeProject.id))
    .where(eq(resumeProjectItem.resumeId, resumeId))
    .orderBy(asc(resumeProjectItem.sortOrder), asc(resumeProject.id));

  const skillGroupRows = await db
    .select({
      id: resumeSkillGroup.id,
      resumeId: resumeSkillGroupItem.resumeId,
      name: resumeSkillGroup.name,
      sortOrder: resumeSkillGroupItem.sortOrder,
    })
    .from(resumeSkillGroupItem)
    .innerJoin(resumeSkillGroup, eq(resumeSkillGroupItem.groupId, resumeSkillGroup.id))
    .where(eq(resumeSkillGroupItem.resumeId, resumeId))
    .orderBy(asc(resumeSkillGroupItem.sortOrder), asc(resumeSkillGroup.id));

  const skillGroups: ResumeDetailDTO["skillGroups"] = [];
  for (const group of skillGroupRows) {
    const skills = await db
      .select({
        id: resumeSkill.id,
        groupId: resumeSkill.groupId,
        name: resumeSkill.name,
        level: resumeSkill.level,
        sortOrder: resumeSkill.sortOrder,
      })
      .from(resumeSkill)
      .where(eq(resumeSkill.groupId, group.id))
      .orderBy(asc(resumeSkill.sortOrder));
    skillGroups.push({ ...group, skills });
  }

  const talks = await db
    .select({
      id: resumeTalk.id,
      resumeId: resumeTalkItem.resumeId,
      title: resumeTalk.title,
      event: resumeTalk.event,
      date: resumeTalk.date,
      description: resumeTalk.description,
      links: resumeTalk.links,
      sortOrder: resumeTalkItem.sortOrder,
    })
    .from(resumeTalkItem)
    .innerJoin(resumeTalk, eq(resumeTalkItem.talkId, resumeTalk.id))
    .where(eq(resumeTalkItem.resumeId, resumeId))
    .orderBy(asc(resumeTalkItem.sortOrder), asc(resumeTalk.id));

  const certifications = await db
    .select({
      id: resumeCertification.id,
      resumeId: resumeCertificationItem.resumeId,
      name: resumeCertification.name,
      issuer: resumeCertification.issuer,
      date: resumeCertification.date,
      url: resumeCertification.url,
      sortOrder: resumeCertificationItem.sortOrder,
    })
    .from(resumeCertificationItem)
    .innerJoin(
      resumeCertification,
      eq(resumeCertificationItem.certificationId, resumeCertification.id),
    )
    .where(eq(resumeCertificationItem.resumeId, resumeId))
    .orderBy(asc(resumeCertificationItem.sortOrder), asc(resumeCertification.id));

  const volunteers = await db
    .select({
      id: resumeVolunteer.id,
      resumeId: resumeVolunteerItem.resumeId,
      organization: resumeVolunteer.organization,
      role: resumeVolunteer.role,
      startDate: resumeVolunteer.startDate,
      endDate: resumeVolunteer.endDate,
      description: resumeVolunteer.description,
      sortOrder: resumeVolunteerItem.sortOrder,
    })
    .from(resumeVolunteerItem)
    .innerJoin(resumeVolunteer, eq(resumeVolunteerItem.volunteerId, resumeVolunteer.id))
    .where(eq(resumeVolunteerItem.resumeId, resumeId))
    .orderBy(asc(resumeVolunteerItem.sortOrder), asc(resumeVolunteer.id));

  const languages = await db
    .select({
      id: resumeLanguage.id,
      resumeId: resumeLanguageItem.resumeId,
      name: resumeLanguage.name,
      proficiency: resumeLanguage.proficiency,
      sortOrder: resumeLanguageItem.sortOrder,
    })
    .from(resumeLanguageItem)
    .innerJoin(resumeLanguage, eq(resumeLanguageItem.languageId, resumeLanguage.id))
    .where(eq(resumeLanguageItem.resumeId, resumeId))
    .orderBy(asc(resumeLanguageItem.sortOrder), asc(resumeLanguage.id));

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
    sections,
    contacts,
    links,
    summaries,
    experiences,
    education,
    projects,
    skillGroups,
    talks,
    certifications,
    volunteers,
    languages,
  };
}

function sameOrderedTextValues(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((value, index) => value === expected[index]);
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function findReusableExperienceId(
  userId: string,
  row: ResumeInsertData["experiences"][number],
  expectedBullets: string[],
): Promise<string | undefined> {
  const candidates = await db
    .select({ id: resumeExperience.id })
    .from(resumeExperience)
    .where(
      and(
        eq(resumeExperience.userId, userId),
        eq(resumeExperience.company, row.company),
        eq(resumeExperience.role, row.role),
        eq(resumeExperience.startDate, row.startDate),
        eq(resumeExperience.endDate, row.endDate),
        eq(resumeExperience.location, row.location),
      ),
    )
    .orderBy(asc(resumeExperience.id));

  for (const candidate of candidates) {
    const bullets = await db
      .select({ text: resumeExperienceBullet.text })
      .from(resumeExperienceBullet)
      .where(eq(resumeExperienceBullet.experienceId, candidate.id))
      .orderBy(asc(resumeExperienceBullet.sortOrder), asc(resumeExperienceBullet.id));

    if (
      sameOrderedTextValues(
        bullets.map((bullet) => bullet.text),
        expectedBullets,
      )
    ) {
      return candidate.id;
    }
  }

  return undefined;
}

async function findReusableEducationId(
  userId: string,
  row: ResumeInsertData["education"][number],
  expectedBullets: string[],
): Promise<string | undefined> {
  const candidates = await db
    .select({ id: resumeEducation.id })
    .from(resumeEducation)
    .where(
      and(
        eq(resumeEducation.userId, userId),
        eq(resumeEducation.school, row.school),
        eq(resumeEducation.degree, row.degree),
        eq(resumeEducation.field, row.field),
        eq(resumeEducation.startDate, row.startDate),
        eq(resumeEducation.endDate, row.endDate),
        eq(resumeEducation.description, row.description),
      ),
    )
    .orderBy(asc(resumeEducation.id));

  for (const candidate of candidates) {
    const bullets = await db
      .select({ text: resumeEducationBullet.text })
      .from(resumeEducationBullet)
      .where(eq(resumeEducationBullet.educationId, candidate.id))
      .orderBy(asc(resumeEducationBullet.sortOrder), asc(resumeEducationBullet.id));

    if (
      sameOrderedTextValues(
        bullets.map((bullet) => bullet.text),
        expectedBullets,
      )
    ) {
      return candidate.id;
    }
  }

  return undefined;
}

async function findReusableSkillGroupId(
  userId: string,
  row: ResumeInsertData["skillGroups"][number],
  expectedSkills: string[],
): Promise<string | undefined> {
  const candidates = await db
    .select({ id: resumeSkillGroup.id })
    .from(resumeSkillGroup)
    .where(and(eq(resumeSkillGroup.userId, userId), eq(resumeSkillGroup.name, row.name)))
    .orderBy(asc(resumeSkillGroup.id));

  for (const candidate of candidates) {
    const skills = await db
      .select({ name: resumeSkill.name })
      .from(resumeSkill)
      .where(eq(resumeSkill.groupId, candidate.id))
      .orderBy(asc(resumeSkill.sortOrder), asc(resumeSkill.id));

    if (
      sameOrderedTextValues(
        skills.map((skill) => skill.name),
        expectedSkills,
      )
    ) {
      return candidate.id;
    }
  }

  return undefined;
}

async function reuseExistingImportBlocks(
  userId: string,
  data: ResumeInsertData,
): Promise<ResumeInsertData> {
  const contactIdReplacements = new Map<string, string>();
  const contacts: ResumeInsertData["contacts"] = [];
  for (const row of data.contacts) {
    const [existing] = await db
      .select({ id: resumeContact.id })
      .from(resumeContact)
      .where(
        and(
          eq(resumeContact.userId, userId),
          eq(resumeContact.type, row.type),
          eq(resumeContact.value, row.value),
          eq(resumeContact.label, row.label),
        ),
      )
      .limit(1);

    if (existing) {
      contactIdReplacements.set(row.id, existing.id);
    } else {
      contacts.push(row);
    }
  }
  const contactItems = uniqueBy(
    data.contactItems.map((item) => ({
      ...item,
      contactId: contactIdReplacements.get(item.contactId) ?? item.contactId,
    })),
    (item) => item.contactId,
  );

  const linkIdReplacements = new Map<string, string>();
  const links: ResumeInsertData["links"] = [];
  for (const row of data.links) {
    const [existing] = await db
      .select({ id: resumeLink.id })
      .from(resumeLink)
      .where(
        and(
          eq(resumeLink.userId, userId),
          eq(resumeLink.label, row.label),
          eq(resumeLink.url, row.url),
          row.icon === null ? isNull(resumeLink.icon) : eq(resumeLink.icon, row.icon),
        ),
      )
      .limit(1);

    if (existing) {
      linkIdReplacements.set(row.id, existing.id);
    } else {
      links.push(row);
    }
  }
  const linkItems = uniqueBy(
    data.linkItems.map((item) => ({
      ...item,
      linkId: linkIdReplacements.get(item.linkId) ?? item.linkId,
    })),
    (item) => item.linkId,
  );

  const summaryIdReplacements = new Map<string, string>();
  const summaries: ResumeInsertData["summaries"] = [];
  for (const row of data.summaries) {
    const [existing] = await db
      .select({ id: resumeSummary.id })
      .from(resumeSummary)
      .where(and(eq(resumeSummary.userId, userId), eq(resumeSummary.text, row.text)))
      .limit(1);

    if (existing) {
      summaryIdReplacements.set(row.id, existing.id);
    } else {
      summaries.push(row);
    }
  }
  const summaryItems = uniqueBy(
    data.summaryItems.map((item) => ({
      ...item,
      summaryId: summaryIdReplacements.get(item.summaryId) ?? item.summaryId,
    })),
    (item) => item.summaryId,
  );

  const experienceIdReplacements = new Map<string, string>();
  const experiences: ResumeInsertData["experiences"] = [];
  for (const row of data.experiences) {
    const expectedBullets = data.experienceBullets
      .filter((bullet) => bullet.experienceId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((bullet) => bullet.text);
    const existingId = await findReusableExperienceId(userId, row, expectedBullets);

    if (existingId) {
      experienceIdReplacements.set(row.id, existingId);
    } else {
      experiences.push(row);
    }
  }
  const experienceItems = uniqueBy(
    data.experienceItems.map((item) => ({
      ...item,
      experienceId: experienceIdReplacements.get(item.experienceId) ?? item.experienceId,
    })),
    (item) => item.experienceId,
  );
  const experienceBullets = data.experienceBullets.filter(
    (bullet) => !experienceIdReplacements.has(bullet.experienceId),
  );

  const educationIdReplacements = new Map<string, string>();
  const education: ResumeInsertData["education"] = [];
  for (const row of data.education) {
    const expectedBullets = data.educationBullets
      .filter((bullet) => bullet.educationId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((bullet) => bullet.text);
    const existingId = await findReusableEducationId(userId, row, expectedBullets);

    if (existingId) {
      educationIdReplacements.set(row.id, existingId);
    } else {
      education.push(row);
    }
  }
  const educationItems = uniqueBy(
    data.educationItems.map((item) => ({
      ...item,
      educationId: educationIdReplacements.get(item.educationId) ?? item.educationId,
    })),
    (item) => item.educationId,
  );
  const educationBullets = data.educationBullets.filter(
    (bullet) => !educationIdReplacements.has(bullet.educationId),
  );

  const projectIdReplacements = new Map<string, string>();
  const projects: ResumeInsertData["projects"] = [];
  for (const row of data.projects) {
    const [existing] = await db
      .select({ id: resumeProject.id })
      .from(resumeProject)
      .where(
        and(
          eq(resumeProject.userId, userId),
          eq(resumeProject.name, row.name),
          eq(resumeProject.url, row.url),
          eq(resumeProject.homepageUrl, row.homepageUrl),
          eq(resumeProject.description, row.description),
          eq(resumeProject.tech, row.tech),
        ),
      )
      .limit(1);

    if (existing) {
      projectIdReplacements.set(row.id, existing.id);
    } else {
      projects.push(row);
    }
  }
  const projectItems = uniqueBy(
    data.projectItems.map((item) => ({
      ...item,
      projectId: projectIdReplacements.get(item.projectId) ?? item.projectId,
    })),
    (item) => item.projectId,
  );

  const skillGroupIdReplacements = new Map<string, string>();
  const skillGroups: ResumeInsertData["skillGroups"] = [];
  for (const row of data.skillGroups) {
    const expectedSkills = data.skills
      .filter((skill) => skill.groupId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((skill) => skill.name);
    const existingId = await findReusableSkillGroupId(userId, row, expectedSkills);

    if (existingId) {
      skillGroupIdReplacements.set(row.id, existingId);
    } else {
      skillGroups.push(row);
    }
  }
  const skillGroupItems = uniqueBy(
    data.skillGroupItems.map((item) => ({
      ...item,
      groupId: skillGroupIdReplacements.get(item.groupId) ?? item.groupId,
    })),
    (item) => item.groupId,
  );
  const skills = data.skills.filter((skill) => !skillGroupIdReplacements.has(skill.groupId));

  const talkIdReplacements = new Map<string, string>();
  const talks: ResumeInsertData["talks"] = [];
  for (const row of data.talks) {
    const [existing] = await db
      .select({ id: resumeTalk.id })
      .from(resumeTalk)
      .where(
        and(
          eq(resumeTalk.userId, userId),
          eq(resumeTalk.title, row.title),
          eq(resumeTalk.event, row.event),
          eq(resumeTalk.date, row.date),
          eq(resumeTalk.description, row.description),
          eq(resumeTalk.links, row.links),
        ),
      )
      .limit(1);

    if (existing) {
      talkIdReplacements.set(row.id, existing.id);
    } else {
      talks.push(row);
    }
  }
  const talkItems = uniqueBy(
    data.talkItems.map((item) => ({
      ...item,
      talkId: talkIdReplacements.get(item.talkId) ?? item.talkId,
    })),
    (item) => item.talkId,
  );

  return {
    ...data,
    contacts,
    contactItems,
    links,
    linkItems,
    summaries,
    summaryItems,
    experiences,
    experienceItems,
    experienceBullets,
    education,
    educationItems,
    educationBullets,
    projects,
    projectItems,
    skillGroups,
    skillGroupItems,
    skills,
    talks,
    talkItems,
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
  const data = await reuseExistingImportBlocks(
    userId,
    documentToInsertData(resumeId, userId, input.doc),
  );

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
  if (data.contactItems.length > 0) {
    await db.insert(resumeContactItem).values(data.contactItems);
  }
  if (data.links.length > 0) {
    await db.insert(resumeLink).values(data.links);
  }
  if (data.linkItems.length > 0) {
    await db.insert(resumeLinkItem).values(data.linkItems);
  }
  if (data.summaries.length > 0) {
    await db.insert(resumeSummary).values(data.summaries);
  }
  if (data.summaryItems.length > 0) {
    await db.insert(resumeSummaryItem).values(data.summaryItems);
  }
  if (data.experiences.length > 0) {
    await db.insert(resumeExperience).values(data.experiences);
  }
  if (data.experienceItems.length > 0) {
    await db.insert(resumeExperienceItem).values(data.experienceItems);
  }
  if (data.experienceBullets.length > 0) {
    await db.insert(resumeExperienceBullet).values(data.experienceBullets);
  }
  if (data.education.length > 0) {
    await db.insert(resumeEducation).values(data.education);
  }
  if (data.educationItems.length > 0) {
    await db.insert(resumeEducationItem).values(data.educationItems);
  }
  if (data.educationBullets.length > 0) {
    await db.insert(resumeEducationBullet).values(data.educationBullets);
  }
  if (data.projects.length > 0) {
    await db.insert(resumeProject).values(data.projects);
  }
  if (data.projectItems.length > 0) {
    await db.insert(resumeProjectItem).values(data.projectItems);
  }
  if (data.skillGroups.length > 0) {
    await db.insert(resumeSkillGroup).values(data.skillGroups);
  }
  if (data.skillGroupItems.length > 0) {
    await db.insert(resumeSkillGroupItem).values(data.skillGroupItems);
  }
  if (data.skills.length > 0) {
    await db.insert(resumeSkill).values(data.skills);
  }
  if (data.talks.length > 0) {
    await db.insert(resumeTalk).values(data.talks);
  }
  if (data.talkItems.length > 0) {
    await db.insert(resumeTalkItem).values(data.talkItems);
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
  userId: string,
  contacts: { type: string; value: string; label: string }[],
): Promise<void> {
  await db.delete(resumeContactItem).where(eq(resumeContactItem.resumeId, resumeId));
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i]!;
    const id = crypto.randomUUID();
    await db.insert(resumeContact).values({
      id,
      userId,
      type: c.type,
      value: c.value,
      label: c.label,
      sortOrder: i,
    });
    await db.insert(resumeContactItem).values({ resumeId, contactId: id, sortOrder: i });
  }
}

// ─── Link CRUD ─────────────────────────────────────────────

export async function setResumeLinks(
  resumeId: string,
  userId: string,
  links: { label: string; url: string; icon?: string }[],
): Promise<void> {
  await db.delete(resumeLinkItem).where(eq(resumeLinkItem.resumeId, resumeId));
  for (let i = 0; i < links.length; i++) {
    const l = links[i]!;
    const id = crypto.randomUUID();
    await db.insert(resumeLink).values({
      id,
      userId,
      label: l.label,
      url: l.url,
      icon: l.icon ?? null,
      sortOrder: i,
    });
    await db.insert(resumeLinkItem).values({ resumeId, linkId: id, sortOrder: i });
  }
}

export async function addLink(
  userId: string,
  resumeId: string | undefined,
  input: { label: string; url: string; icon?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeLink).values({
    id,
    userId,
    label: input.label,
    url: input.url,
    icon: input.icon ?? null,
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db.insert(resumeLinkItem).values({ resumeId, linkId: id, sortOrder: input.sortOrder });
  }
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

export async function updateDuplicateLinksForUser(
  linkId: string,
  userId: string,
  input: { label?: string; url?: string; icon?: string; sortOrder?: number },
): Promise<void> {
  const row = await db
    .select({
      label: resumeLink.label,
      url: resumeLink.url,
      icon: resumeLink.icon,
    })
    .from(resumeLink)
    .where(and(eq(resumeLink.id, linkId), eq(resumeLink.userId, userId)))
    .limit(1);

  if (!row[0]) throw new Error("Link not found");

  const target = row[0];
  const duplicateRows = await db
    .select({ id: resumeLink.id })
    .from(resumeLink)
    .where(
      and(
        eq(resumeLink.userId, userId),
        eq(resumeLink.label, target.label),
        eq(resumeLink.url, target.url),
        target.icon === null ? isNull(resumeLink.icon) : eq(resumeLink.icon, target.icon),
      ),
    );

  const duplicateIds = duplicateRows.map((duplicate) => duplicate.id);
  if (duplicateIds.length === 0) return;

  const updates: Record<string, unknown> = {};
  if (input.label !== undefined) updates.label = input.label;
  if (input.url !== undefined) updates.url = input.url;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeLink).set(updates).where(inArray(resumeLink.id, duplicateIds));
  }
}

export async function deleteLinkById(linkId: string): Promise<void> {
  await db.delete(resumeLink).where(eq(resumeLink.id, linkId));
}

// ─── Summary CRUD ──────────────────────────────────────────

export async function setResumeSummary(
  resumeId: string,
  userId: string,
  text: string,
): Promise<void> {
  await db.delete(resumeSummaryItem).where(eq(resumeSummaryItem.resumeId, resumeId));
  if (text.trim()) {
    const id = crypto.randomUUID();
    await db.insert(resumeSummary).values({ id, userId, text, sortOrder: 0 });
    await db.insert(resumeSummaryItem).values({ resumeId, summaryId: id, sortOrder: 0 });
  }
}

export async function addSummaryItem(
  userId: string,
  resumeId: string | undefined,
  input: { text: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeSummary).values({
    id,
    userId,
    text: input.text,
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeSummaryItem)
      .values({ resumeId, summaryId: id, sortOrder: input.sortOrder });
  }
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
  userId: string,
  resumeId: string | undefined,
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
    userId,
    company: input.company,
    role: input.role,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location ?? "",
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeExperienceItem)
      .values({ resumeId, experienceId: id, sortOrder: input.sortOrder });
  }
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
  userId: string,
  resumeId: string | undefined,
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
    userId,
    school: input.school,
    degree: input.degree,
    field: input.field ?? "",
    startDate: input.startDate ?? "",
    endDate: input.endDate,
    description: input.description ?? "",
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeEducationItem)
      .values({ resumeId, educationId: id, sortOrder: input.sortOrder });
  }
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

export async function swapEducationSortOrder(
  userId: string,
  idA: string,
  idB: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeEducationItem.educationId, sortOrder: resumeEducationItem.sortOrder })
    .from(resumeEducationItem)
    .innerJoin(resume, eq(resumeEducationItem.resumeId, resume.id))
    .where(
      and(
        eq(resume.userId, userId),
        or(eq(resumeEducationItem.educationId, idA), eq(resumeEducationItem.educationId, idB)),
      ),
    )
    .limit(2);

  if (rows.length !== 2) throw new Error("One or both education entries not found");

  const [first, second] = rows as [
    { id: string; sortOrder: number },
    { id: string; sortOrder: number },
  ];

  await db
    .update(resumeEducationItem)
    .set({ sortOrder: second.sortOrder })
    .where(eq(resumeEducationItem.educationId, first.id));

  await db
    .update(resumeEducationItem)
    .set({ sortOrder: first.sortOrder })
    .where(eq(resumeEducationItem.educationId, second.id));
}

// ─── Project CRUD ──────────────────────────────────────────

export async function addProject(
  userId: string,
  resumeId: string | undefined,
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
    userId,
    name: input.name,
    url: input.url ?? "",
    homepageUrl: input.homepageUrl ?? "",
    description: input.description,
    tech: JSON.stringify(input.tech),
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeProjectItem)
      .values({ resumeId, projectId: id, sortOrder: input.sortOrder });
  }
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

export async function swapProjectSortOrder(
  userId: string,
  idA: string,
  idB: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeProjectItem.projectId, sortOrder: resumeProjectItem.sortOrder })
    .from(resumeProjectItem)
    .innerJoin(resume, eq(resumeProjectItem.resumeId, resume.id))
    .where(
      and(
        eq(resume.userId, userId),
        or(eq(resumeProjectItem.projectId, idA), eq(resumeProjectItem.projectId, idB)),
      ),
    )
    .limit(2);

  if (rows.length !== 2) throw new Error("One or both projects not found");

  const [first, second] = rows as [
    { id: string; sortOrder: number },
    { id: string; sortOrder: number },
  ];

  await db
    .update(resumeProjectItem)
    .set({ sortOrder: second.sortOrder })
    .where(eq(resumeProjectItem.projectId, first.id));

  await db
    .update(resumeProjectItem)
    .set({ sortOrder: first.sortOrder })
    .where(eq(resumeProjectItem.projectId, second.id));
}

// ─── Skill Group CRUD ──────────────────────────────────────

export async function setSkillGroups(
  resumeId: string,
  userId: string,
  groups: { name: string; items: string[] }[],
): Promise<void> {
  await db.delete(resumeSkillGroupItem).where(eq(resumeSkillGroupItem.resumeId, resumeId));
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    const groupId = crypto.randomUUID();
    await db.insert(resumeSkillGroup).values({
      id: groupId,
      userId,
      name: g.name,
      sortOrder: gi,
    });
    await db.insert(resumeSkillGroupItem).values({ resumeId, groupId, sortOrder: gi });
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
  userId: string,
  resumeId: string | undefined,
  input: { name: string; skills: string[]; sortOrder: number },
): Promise<string> {
  const groupId = crypto.randomUUID();
  await db.insert(resumeSkillGroup).values({
    id: groupId,
    userId,
    name: input.name,
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db.insert(resumeSkillGroupItem).values({ resumeId, groupId, sortOrder: input.sortOrder });
  }
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
  userId: string,
  resumeId: string | undefined,
  input: { name: string; issuer?: string; date?: string; url?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeCertification).values({
    id,
    userId,
    name: input.name,
    issuer: input.issuer ?? "",
    date: input.date ?? "",
    url: input.url ?? "",
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeCertificationItem)
      .values({ resumeId, certificationId: id, sortOrder: input.sortOrder });
  }
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
  userId: string,
  resumeId: string | undefined,
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
    userId,
    organization: input.organization,
    role: input.role ?? "",
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
    description: input.description ?? "",
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeVolunteerItem)
      .values({ resumeId, volunteerId: id, sortOrder: input.sortOrder });
  }
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
  userId: string,
  resumeId: string | undefined,
  input: { name: string; proficiency?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeLanguage).values({
    id,
    userId,
    name: input.name,
    proficiency: input.proficiency ?? "",
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeLanguageItem)
      .values({ resumeId, languageId: id, sortOrder: input.sortOrder });
  }
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
  userId: string,
  resumeId: string | undefined,
  input: { type: string; value: string; label?: string; sortOrder: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(resumeContact).values({
    id,
    userId,
    type: input.type,
    value: input.value,
    label: input.label ?? "",
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db
      .insert(resumeContactItem)
      .values({ resumeId, contactId: id, sortOrder: input.sortOrder });
  }
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

export async function updateDuplicateContactsForUser(
  contactId: string,
  userId: string,
  input: { type?: string; value?: string; label?: string; sortOrder?: number },
): Promise<void> {
  const row = await db
    .select({
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
    })
    .from(resumeContact)
    .where(and(eq(resumeContact.id, contactId), eq(resumeContact.userId, userId)))
    .limit(1);

  if (!row[0]) throw new Error("Contact not found");

  const target = row[0];
  const duplicateRows = await db
    .select({ id: resumeContact.id })
    .from(resumeContact)
    .where(
      and(
        eq(resumeContact.userId, userId),
        eq(resumeContact.type, target.type),
        eq(resumeContact.value, target.value),
        eq(resumeContact.label, target.label),
      ),
    );

  const duplicateIds = duplicateRows.map((duplicate) => duplicate.id);
  if (duplicateIds.length === 0) return;

  const updates: Record<string, unknown> = {};
  if (input.type !== undefined) updates.type = input.type;
  if (input.value !== undefined) updates.value = input.value;
  if (input.label !== undefined) updates.label = input.label;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(resumeContact).set(updates).where(inArray(resumeContact.id, duplicateIds));
  }
}

export async function deleteContactById(contactId: string): Promise<void> {
  await db.delete(resumeContact).where(eq(resumeContact.id, contactId));
}

// ─── Talk CRUD ─────────────────────────────────────────────

export async function addTalk(
  userId: string,
  resumeId: string | undefined,
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
    userId,
    title: input.title,
    event: input.event ?? "",
    date: input.date ?? "",
    description: input.description ?? "",
    links: JSON.stringify(input.links ?? []),
    sortOrder: input.sortOrder,
  });
  if (resumeId) {
    await db.insert(resumeTalkItem).values({ resumeId, talkId: id, sortOrder: input.sortOrder });
  }
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

export async function swapTalkSortOrder(userId: string, idA: string, idB: string): Promise<void> {
  const rows = await db
    .select({ id: resumeTalkItem.talkId, sortOrder: resumeTalkItem.sortOrder })
    .from(resumeTalkItem)
    .innerJoin(resume, eq(resumeTalkItem.resumeId, resume.id))
    .where(
      and(
        eq(resume.userId, userId),
        or(eq(resumeTalkItem.talkId, idA), eq(resumeTalkItem.talkId, idB)),
      ),
    )
    .limit(2);

  if (rows.length !== 2) throw new Error("One or both talks not found");

  const [first, second] = rows as [
    { id: string; sortOrder: number },
    { id: string; sortOrder: number },
  ];

  await db
    .update(resumeTalkItem)
    .set({ sortOrder: second.sortOrder })
    .where(eq(resumeTalkItem.talkId, first.id));

  await db
    .update(resumeTalkItem)
    .set({ sortOrder: first.sortOrder })
    .where(eq(resumeTalkItem.talkId, second.id));
}

// ─── Full update from ResumeDocumentV1 (replace-all) ───────

export async function replaceResumeContent(
  resumeId: string,
  userId: string,
  doc: ResumeDocumentV1,
): Promise<void> {
  await assertResumeBelongsToUser(resumeId, userId);

  // Update resume metadata
  await updateResumeMetadata(resumeId, userId, {
    fullName: doc.header.fullName,
    headline: doc.header.headline,
    templateId: doc.meta.templateId,
  });

  // Delete all child rows (cascade takes care of nested children)
  await db.delete(resumeSection).where(eq(resumeSection.resumeId, resumeId));
  await db.delete(resumeContactItem).where(eq(resumeContactItem.resumeId, resumeId));
  await db.delete(resumeLinkItem).where(eq(resumeLinkItem.resumeId, resumeId));
  await db.delete(resumeSummaryItem).where(eq(resumeSummaryItem.resumeId, resumeId));
  await db.delete(resumeExperienceItem).where(eq(resumeExperienceItem.resumeId, resumeId));
  await db.delete(resumeEducationItem).where(eq(resumeEducationItem.resumeId, resumeId));
  await db.delete(resumeProjectItem).where(eq(resumeProjectItem.resumeId, resumeId));
  await db.delete(resumeSkillGroupItem).where(eq(resumeSkillGroupItem.resumeId, resumeId));
  await db.delete(resumeTalkItem).where(eq(resumeTalkItem.resumeId, resumeId));

  // Re-insert from doc
  const data = documentToInsertData(resumeId, userId, doc);

  if (data.sections.length > 0) await db.insert(resumeSection).values(data.sections);
  if (data.contacts.length > 0) await db.insert(resumeContact).values(data.contacts);
  if (data.contactItems.length > 0) await db.insert(resumeContactItem).values(data.contactItems);
  if (data.links.length > 0) await db.insert(resumeLink).values(data.links);
  if (data.linkItems.length > 0) await db.insert(resumeLinkItem).values(data.linkItems);
  if (data.summaries.length > 0) await db.insert(resumeSummary).values(data.summaries);
  if (data.summaryItems.length > 0) await db.insert(resumeSummaryItem).values(data.summaryItems);
  if (data.experiences.length > 0) await db.insert(resumeExperience).values(data.experiences);
  if (data.experienceItems.length > 0)
    await db.insert(resumeExperienceItem).values(data.experienceItems);
  if (data.experienceBullets.length > 0)
    await db.insert(resumeExperienceBullet).values(data.experienceBullets);
  if (data.education.length > 0) await db.insert(resumeEducation).values(data.education);
  if (data.educationItems.length > 0)
    await db.insert(resumeEducationItem).values(data.educationItems);
  if (data.educationBullets.length > 0)
    await db.insert(resumeEducationBullet).values(data.educationBullets);
  if (data.projects.length > 0) await db.insert(resumeProject).values(data.projects);
  if (data.projectItems.length > 0) await db.insert(resumeProjectItem).values(data.projectItems);
  if (data.skillGroups.length > 0) await db.insert(resumeSkillGroup).values(data.skillGroups);
  if (data.skillGroupItems.length > 0)
    await db.insert(resumeSkillGroupItem).values(data.skillGroupItems);
  if (data.skills.length > 0) await db.insert(resumeSkill).values(data.skills);
  if (data.talks.length > 0) await db.insert(resumeTalk).values(data.talks);
  if (data.talkItems.length > 0) await db.insert(resumeTalkItem).values(data.talkItems);
}

// ─── Search existing items across all user's resumes ───────
// Used by "pick from existing" modal

export async function searchUserExperienceBullets(
  userId: string,
  query: string,
): Promise<{ id: string; text: string; company: string; role: string }[]> {
  const experiences = await db
    .select()
    .from(resumeExperience)
    .where(eq(resumeExperience.userId, userId));

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
    resumeId: string | null;
  }[]
> {
  const rows = await db
    .select({
      id: resumeExperience.id,
      company: resumeExperience.company,
      role: resumeExperience.role,
      startDate: resumeExperience.startDate,
      endDate: resumeExperience.endDate,
      resumeId: resumeExperienceItem.resumeId,
    })
    .from(resumeExperience)
    .leftJoin(resumeExperienceItem, eq(resumeExperienceItem.experienceId, resumeExperience.id))
    .where(eq(resumeExperience.userId, userId));

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
      .where(eq(resumeProject.userId, userId)),
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
    .where(eq(resumeEducation.userId, userId));

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
    .where(eq(resumeSkillGroup.userId, userId));

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
    .where(eq(resumeTalk.userId, userId));

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.event.toLowerCase().includes(q) ||
      r.date.toLowerCase().includes(q),
  );
}
