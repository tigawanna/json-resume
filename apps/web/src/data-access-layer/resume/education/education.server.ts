import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeEducation } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { EducationListItemDTO, PaginatedResult } from "./education.types";

export async function listEducationForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<EducationListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeEducation.school, pattern),
        like(resumeEducation.degree, pattern),
        like(resumeEducation.field, pattern),
        like(resumeEducation.description, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeEducation.id, opts.cursor)
        : gt(resumeEducation.id, opts.cursor),
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
    .orderBy(direction === "before" ? desc(resumeEducation.id) : asc(resumeEducation.id))
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
    // There is a previous page only if we arrived via a cursor (not the first page)
    previousCursor = opts?.cursor !== undefined ? items[0]?.id : undefined;
  } else {
    // direction === "before": navigating backwards
    previousCursor = hasMore ? items[0]?.id : undefined;
    // Next: navigate forward from the last displayed item
    nextCursor = items.length > 0 ? items[items.length - 1].id : undefined;
  }

  return { items, nextCursor, previousCursor };
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
