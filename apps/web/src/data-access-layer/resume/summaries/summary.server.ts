import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeSummary } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { SummaryListItemDTO } from "./summary.types";

export async function listSummariesForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<SummaryListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(like(resumeSummary.text, pattern));
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeSummary.id, opts.cursor)
        : gt(resumeSummary.id, opts.cursor),
    );
  }

  const rows = await db
    .select({
      id: resumeSummary.id,
      resumeId: resumeSummary.resumeId,
      resumeName: resume.name,
      text: resumeSummary.text,
      sortOrder: resumeSummary.sortOrder,
      createdAt: resumeSummary.createdAt,
      updatedAt: resumeSummary.updatedAt,
    })
    .from(resumeSummary)
    .innerJoin(resume, eq(resumeSummary.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeSummary.id) : asc(resumeSummary.id))
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

export async function listSummariesForUser(
  userId: string,
  keyword?: string,
): Promise<SummaryListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(like(resumeSummary.text, pattern));
  }

  const rows = await db
    .select({
      id: resumeSummary.id,
      resumeId: resumeSummary.resumeId,
      resumeName: resume.name,
      text: resumeSummary.text,
      sortOrder: resumeSummary.sortOrder,
      createdAt: resumeSummary.createdAt,
      updatedAt: resumeSummary.updatedAt,
    })
    .from(resumeSummary)
    .innerJoin(resume, eq(resumeSummary.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeSummary.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteSummaryForUser(summaryId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeSummary.id })
    .from(resumeSummary)
    .innerJoin(resume, eq(resumeSummary.resumeId, resume.id))
    .where(and(eq(resumeSummary.id, summaryId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Summary not found");
  await db.delete(resumeSummary).where(eq(resumeSummary.id, summaryId));
}
