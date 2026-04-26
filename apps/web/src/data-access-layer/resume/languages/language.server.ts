import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeLanguage } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { LanguageListItemDTO } from "./language.types";

export async function listLanguagesForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<LanguageListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(like(resumeLanguage.name, pattern), like(resumeLanguage.proficiency, pattern))!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeLanguage.id, opts.cursor)
        : gt(resumeLanguage.id, opts.cursor),
    );
  }

  const rows = await db
    .select({
      id: resumeLanguage.id,
      resumeId: resumeLanguage.resumeId,
      resumeName: resume.name,
      name: resumeLanguage.name,
      proficiency: resumeLanguage.proficiency,
      sortOrder: resumeLanguage.sortOrder,
      createdAt: resumeLanguage.createdAt,
      updatedAt: resumeLanguage.updatedAt,
    })
    .from(resumeLanguage)
    .innerJoin(resume, eq(resumeLanguage.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeLanguage.id) : asc(resumeLanguage.id))
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

export async function listLanguagesForUser(
  userId: string,
  keyword?: string,
): Promise<LanguageListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(like(resumeLanguage.name, pattern), like(resumeLanguage.proficiency, pattern))!,
    );
  }

  const rows = await db
    .select({
      id: resumeLanguage.id,
      resumeId: resumeLanguage.resumeId,
      resumeName: resume.name,
      name: resumeLanguage.name,
      proficiency: resumeLanguage.proficiency,
      sortOrder: resumeLanguage.sortOrder,
      createdAt: resumeLanguage.createdAt,
      updatedAt: resumeLanguage.updatedAt,
    })
    .from(resumeLanguage)
    .innerJoin(resume, eq(resumeLanguage.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeLanguage.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteLanguageForUser(languageId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeLanguage.id })
    .from(resumeLanguage)
    .innerJoin(resume, eq(resumeLanguage.resumeId, resume.id))
    .where(and(eq(resumeLanguage.id, languageId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Language not found");
  await db.delete(resumeLanguage).where(eq(resumeLanguage.id, languageId));
}
