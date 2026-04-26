import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeExperience } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { ExperienceListItemDTO } from "./experience.types";

export async function listExperiencesForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<ExperienceListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeExperience.company, pattern),
        like(resumeExperience.role, pattern),
        like(resumeExperience.location, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeExperience.id, opts.cursor)
        : gt(resumeExperience.id, opts.cursor),
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
    .orderBy(direction === "before" ? desc(resumeExperience.id) : asc(resumeExperience.id))
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
