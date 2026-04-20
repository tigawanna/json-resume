import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeEducation } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { EducationListItemDTO } from "./education.types";

export async function listEducationForUser(
  userId: string,
  keyword?: string,
): Promise<EducationListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeEducation.school, pattern),
        like(resumeEducation.degree, pattern),
        like(resumeEducation.field, pattern),
        like(resumeEducation.description, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeEducation.id,
      resumeId: resumeEducation.resumeId,
      resumeName: resume.name,
      school: resumeEducation.school,
      degree: resumeEducation.degree,
      field: resumeEducation.field,
      startDate: resumeEducation.startDate,
      endDate: resumeEducation.endDate,
      description: resumeEducation.description,
      sortOrder: resumeEducation.sortOrder,
      createdAt: resumeEducation.createdAt,
      updatedAt: resumeEducation.updatedAt,
    })
    .from(resumeEducation)
    .innerJoin(resume, eq(resumeEducation.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeEducation.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteEducationForUser(educationId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeEducation.id })
    .from(resumeEducation)
    .innerJoin(resume, eq(resumeEducation.resumeId, resume.id))
    .where(and(eq(resumeEducation.id, educationId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Education not found");
  await db.delete(resumeEducation).where(eq(resumeEducation.id, educationId));
}
