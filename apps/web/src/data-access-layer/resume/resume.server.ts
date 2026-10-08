import "@tanstack/react-start/server-only";

import {
  assembleResumeDetail,
  resumeLayoutOf,
} from "@/data-access-layer/event-sourced/assemble-resume-detail";
import * as clientRows from "@/data-access-layer/event-sourced/schemas";
import { db } from "@/lib/drizzle/client";
import {
  job,
  resume,
  resumeCertification,
  resumeContact,
  resumeEducation,
  resumeEducationBullet,
  resumeExperience,
  resumeExperienceBullet,
  resumeLanguage,
  resumeLink,
  resumeNote,
  resumeProject,
  resumeSkill,
  resumeSkillGroup,
  resumeSummary,
  resumeTalk,
  resumeVolunteer,
} from "@/lib/drizzle/scheam";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import type { z } from "zod";
import type { ResumeDetailDTO, ResumeListItemDTO } from "./resume.types";

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

/** A Drizzle row in the client's shape: epoch-ms timestamps, no embedding blob, nulls left out. */
function clientRow(row: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "embedding" || value === null) continue;
    out[key] = value instanceof Date ? value.getTime() : value;
  }
  return out;
}

function parseRows<T extends z.ZodType>(schema: T, rows: ReadonlyArray<object>): z.infer<T>[] {
  return rows.map((row) => schema.parse(clientRow(row)));
}

/** Runs `load` only when there is something to look up. */
async function byIds<T>(ids: string[], load: (ids: string[]) => PromiseLike<T[]>): Promise<T[]> {
  return ids.length === 0 ? [] : load(ids);
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

/**
 * The résumé as the editor shows it: its layout resolved against the owner's
 * library rows, by the same assembler the client uses.
 */
export async function getResumeDetail(
  resumeId: string,
  userId: string,
): Promise<ResumeDetailDTO | null> {
  const [row] = await db
    .select()
    .from(resume)
    .where(and(eq(resume.id, resumeId), eq(resume.userId, userId)))
    .limit(1);
  if (!row) return null;

  const resumeRow = clientRows.resumeSchema.parse(clientRow(row));
  const layout = resumeLayoutOf(resumeRow);

  const [
    contacts,
    links,
    summaries,
    notes,
    experiences,
    education,
    projects,
    skillGroups,
    skills,
    talks,
    certifications,
    volunteers,
    languages,
    jobs,
  ] = await Promise.all([
    byIds(layout.contacts, (ids) =>
      db
        .select()
        .from(resumeContact)
        .where(and(eq(resumeContact.userId, userId), inArray(resumeContact.id, ids))),
    ),
    byIds(layout.links, (ids) =>
      db
        .select()
        .from(resumeLink)
        .where(and(eq(resumeLink.userId, userId), inArray(resumeLink.id, ids))),
    ),
    byIds(layout.summaries, (ids) =>
      db
        .select()
        .from(resumeSummary)
        .where(and(eq(resumeSummary.userId, userId), inArray(resumeSummary.id, ids))),
    ),
    byIds(layout.notes, (ids) =>
      db
        .select()
        .from(resumeNote)
        .where(and(eq(resumeNote.userId, userId), inArray(resumeNote.id, ids))),
    ),
    byIds(
      layout.experiences.map((entry) => entry.id),
      (ids) =>
        db
          .select()
          .from(resumeExperience)
          .where(and(eq(resumeExperience.userId, userId), inArray(resumeExperience.id, ids))),
    ),
    byIds(layout.education, (ids) =>
      db
        .select()
        .from(resumeEducation)
        .where(and(eq(resumeEducation.userId, userId), inArray(resumeEducation.id, ids))),
    ),
    byIds(layout.projects, (ids) =>
      db
        .select()
        .from(resumeProject)
        .where(and(eq(resumeProject.userId, userId), inArray(resumeProject.id, ids))),
    ),
    byIds(
      layout.skillGroups.map((entry) => entry.id),
      (ids) =>
        db
          .select()
          .from(resumeSkillGroup)
          .where(and(eq(resumeSkillGroup.userId, userId), inArray(resumeSkillGroup.id, ids))),
    ),
    byIds(
      layout.skillGroups.flatMap((entry) => entry.skills),
      (ids) =>
        db
          .select()
          .from(resumeSkill)
          .where(and(eq(resumeSkill.userId, userId), inArray(resumeSkill.id, ids))),
    ),
    byIds(layout.talks, (ids) =>
      db
        .select()
        .from(resumeTalk)
        .where(and(eq(resumeTalk.userId, userId), inArray(resumeTalk.id, ids))),
    ),
    byIds(layout.certifications, (ids) =>
      db
        .select()
        .from(resumeCertification)
        .where(and(eq(resumeCertification.userId, userId), inArray(resumeCertification.id, ids))),
    ),
    byIds(layout.volunteers, (ids) =>
      db
        .select()
        .from(resumeVolunteer)
        .where(and(eq(resumeVolunteer.userId, userId), inArray(resumeVolunteer.id, ids))),
    ),
    byIds(layout.languages, (ids) =>
      db
        .select()
        .from(resumeLanguage)
        .where(and(eq(resumeLanguage.userId, userId), inArray(resumeLanguage.id, ids))),
    ),
    byIds(resumeRow.jobId ? [resumeRow.jobId] : [], (ids) =>
      db
        .select()
        .from(job)
        .where(and(eq(job.userId, userId), inArray(job.id, ids))),
    ),
  ]);

  // Bullets belong to their experience, so they are owned through the experiences loaded above.
  const [experienceBullets, educationBullets] = await Promise.all([
    byIds(
      experiences.length === 0 ? [] : layout.experiences.flatMap((entry) => entry.bullets),
      (ids) =>
        db
          .select()
          .from(resumeExperienceBullet)
          .where(
            and(
              inArray(resumeExperienceBullet.id, ids),
              inArray(
                resumeExperienceBullet.experienceId,
                experiences.map((experience) => experience.id),
              ),
            ),
          ),
    ),
    byIds(
      education.map((row) => row.id),
      (ids) =>
        db
          .select()
          .from(resumeEducationBullet)
          .where(inArray(resumeEducationBullet.educationId, ids)),
    ),
  ]);

  return assembleResumeDetail(resumeId, {
    resume: resumeRow,
    contacts: parseRows(clientRows.resumeContactSchema, contacts),
    links: parseRows(clientRows.resumeLinkSchema, links),
    summaries: parseRows(clientRows.resumeSummarySchema, summaries),
    notes: parseRows(clientRows.resumeNoteSchema, notes),
    experiences: parseRows(clientRows.resumeExperienceSchema, experiences),
    experienceBullets: parseRows(clientRows.resumeExperienceBulletSchema, experienceBullets),
    education: parseRows(clientRows.resumeEducationSchema, education),
    educationBullets: parseRows(clientRows.resumeEducationBulletSchema, educationBullets),
    projects: parseRows(clientRows.resumeProjectSchema, projects),
    skillGroups: parseRows(clientRows.resumeSkillGroupSchema, skillGroups),
    skills: parseRows(clientRows.resumeSkillSchema, skills),
    talks: parseRows(clientRows.resumeTalkSchema, talks),
    certifications: parseRows(clientRows.resumeCertificationSchema, certifications),
    volunteers: parseRows(clientRows.resumeVolunteerSchema, volunteers),
    languages: parseRows(clientRows.resumeLanguageSchema, languages),
    jobs: parseRows(clientRows.jobSchema, jobs),
  });
}
