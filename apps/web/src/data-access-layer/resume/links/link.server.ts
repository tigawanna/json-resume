import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeLink } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { LinkListItemDTO } from "./link.types";

export async function listLinksForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<LinkListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeLink.label, pattern),
        like(resumeLink.url, pattern),
        like(resumeLink.icon, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before" ? lt(resumeLink.id, opts.cursor) : gt(resumeLink.id, opts.cursor),
    );
  }

  const rows = await db
    .select({
      id: resumeLink.id,
      resumeId: resumeLink.resumeId,
      resumeName: resume.name,
      label: resumeLink.label,
      url: resumeLink.url,
      icon: resumeLink.icon,
      sortOrder: resumeLink.sortOrder,
      createdAt: resumeLink.createdAt,
      updatedAt: resumeLink.updatedAt,
    })
    .from(resumeLink)
    .innerJoin(resume, eq(resumeLink.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeLink.id) : asc(resumeLink.id))
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

export async function listLinksForUser(
  userId: string,
  keyword?: string,
): Promise<LinkListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeLink.label, pattern),
        like(resumeLink.url, pattern),
        like(resumeLink.icon, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeLink.id,
      resumeId: resumeLink.resumeId,
      resumeName: resume.name,
      label: resumeLink.label,
      url: resumeLink.url,
      icon: resumeLink.icon,
      sortOrder: resumeLink.sortOrder,
      createdAt: resumeLink.createdAt,
      updatedAt: resumeLink.updatedAt,
    })
    .from(resumeLink)
    .innerJoin(resume, eq(resumeLink.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeLink.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteLinkForUser(linkId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeLink.id })
    .from(resumeLink)
    .innerJoin(resume, eq(resumeLink.resumeId, resume.id))
    .where(and(eq(resumeLink.id, linkId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Link not found");
  await db.delete(resumeLink).where(eq(resumeLink.id, linkId));
}
