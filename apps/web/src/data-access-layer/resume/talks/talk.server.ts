import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeTalk } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { TalkListItemDTO } from "./talk.types";

export async function listTalksForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<TalkListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeTalk.title, pattern),
        like(resumeTalk.event, pattern),
        like(resumeTalk.description, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before" ? lt(resumeTalk.id, opts.cursor) : gt(resumeTalk.id, opts.cursor),
    );
  }

  const rows = await db
    .select({
      id: resumeTalk.id,
      resumeId: resumeTalk.resumeId,
      resumeName: resume.name,
      title: resumeTalk.title,
      event: resumeTalk.event,
      date: resumeTalk.date,
      description: resumeTalk.description,
      links: resumeTalk.links,
      sortOrder: resumeTalk.sortOrder,
      createdAt: resumeTalk.createdAt,
      updatedAt: resumeTalk.updatedAt,
    })
    .from(resumeTalk)
    .innerJoin(resume, eq(resumeTalk.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeTalk.id) : asc(resumeTalk.id))
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

export async function deleteTalkForUser(talkId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeTalk.id })
    .from(resumeTalk)
    .innerJoin(resume, eq(resumeTalk.resumeId, resume.id))
    .where(and(eq(resumeTalk.id, talkId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Talk not found");
  await db.delete(resumeTalk).where(eq(resumeTalk.id, talkId));
}
