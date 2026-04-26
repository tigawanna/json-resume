import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeVolunteer } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { VolunteerListItemDTO } from "./volunteer.types";

export async function listVolunteersForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<VolunteerListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeVolunteer.organization, pattern),
        like(resumeVolunteer.role, pattern),
        like(resumeVolunteer.description, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeVolunteer.id, opts.cursor)
        : gt(resumeVolunteer.id, opts.cursor),
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
    .orderBy(direction === "before" ? desc(resumeVolunteer.id) : asc(resumeVolunteer.id))
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
