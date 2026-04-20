import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeVolunteer } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { VolunteerListItemDTO } from "./volunteer.types";

export async function listVolunteersForUser(
  userId: string,
  keyword?: string,
): Promise<VolunteerListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeVolunteer.organization, pattern),
        like(resumeVolunteer.role, pattern),
        like(resumeVolunteer.description, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeVolunteer.id,
      resumeId: resumeVolunteer.resumeId,
      resumeName: resume.name,
      organization: resumeVolunteer.organization,
      role: resumeVolunteer.role,
      startDate: resumeVolunteer.startDate,
      endDate: resumeVolunteer.endDate,
      description: resumeVolunteer.description,
      sortOrder: resumeVolunteer.sortOrder,
      createdAt: resumeVolunteer.createdAt,
      updatedAt: resumeVolunteer.updatedAt,
    })
    .from(resumeVolunteer)
    .innerJoin(resume, eq(resumeVolunteer.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeVolunteer.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteVolunteerForUser(volunteerId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeVolunteer.id })
    .from(resumeVolunteer)
    .innerJoin(resume, eq(resumeVolunteer.resumeId, resume.id))
    .where(and(eq(resumeVolunteer.id, volunteerId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Volunteer entry not found");
  await db.delete(resumeVolunteer).where(eq(resumeVolunteer.id, volunteerId));
}
