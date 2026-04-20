import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeExperience } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { ExperienceListItemDTO } from "./experience.types";

export async function listExperiencesForUser(
  userId: string,
  keyword?: string,
): Promise<ExperienceListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeExperience.company, pattern),
        like(resumeExperience.role, pattern),
        like(resumeExperience.location, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeExperience.id,
      resumeId: resumeExperience.resumeId,
      resumeName: resume.name,
      company: resumeExperience.company,
      role: resumeExperience.role,
      startDate: resumeExperience.startDate,
      endDate: resumeExperience.endDate,
      location: resumeExperience.location,
      sortOrder: resumeExperience.sortOrder,
      createdAt: resumeExperience.createdAt,
      updatedAt: resumeExperience.updatedAt,
    })
    .from(resumeExperience)
    .innerJoin(resume, eq(resumeExperience.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeExperience.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteExperienceForUser(experienceId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeExperience.id })
    .from(resumeExperience)
    .innerJoin(resume, eq(resumeExperience.resumeId, resume.id))
    .where(and(eq(resumeExperience.id, experienceId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Experience not found");
  await db.delete(resumeExperience).where(eq(resumeExperience.id, experienceId));
}
