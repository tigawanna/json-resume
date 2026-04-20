import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeProject } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { ResumeProjectListItemDTO } from "./resume-project.types";

export async function listResumeProjectsForUser(
  userId: string,
  keyword?: string,
): Promise<ResumeProjectListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeProject.name, pattern),
        like(resumeProject.description, pattern),
        like(resumeProject.tech, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeProject.id,
      resumeId: resumeProject.resumeId,
      resumeName: resume.name,
      name: resumeProject.name,
      url: resumeProject.url,
      homepageUrl: resumeProject.homepageUrl,
      description: resumeProject.description,
      tech: resumeProject.tech,
      sortOrder: resumeProject.sortOrder,
      createdAt: resumeProject.createdAt,
      updatedAt: resumeProject.updatedAt,
    })
    .from(resumeProject)
    .innerJoin(resume, eq(resumeProject.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeProject.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteResumeProjectForUser(projectId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeProject.id })
    .from(resumeProject)
    .innerJoin(resume, eq(resumeProject.resumeId, resume.id))
    .where(and(eq(resumeProject.id, projectId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Project not found");
  await db.delete(resumeProject).where(eq(resumeProject.id, projectId));
}
