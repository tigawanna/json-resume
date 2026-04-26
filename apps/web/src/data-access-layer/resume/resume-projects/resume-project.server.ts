import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeProject } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { ResumeProjectListItemDTO } from "./resume-project.types";

export async function listResumeProjectsForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<ResumeProjectListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeProject.name, pattern),
        like(resumeProject.description, pattern),
        like(resumeProject.tech, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeProject.id, opts.cursor)
        : gt(resumeProject.id, opts.cursor),
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
    .orderBy(direction === "before" ? desc(resumeProject.id) : asc(resumeProject.id))
    .limit(DEFAULT_PAGE_SIZE + 1);

  const hasMore = rows.length > DEFAULT_PAGE_SIZE;
  const orderedRows =
    direction === "before"
      ? rows.slice(0, DEFAULT_PAGE_SIZE).reverse()
      : rows.slice(0, DEFAULT_PAGE_SIZE);

  const items = orderedRows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

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
