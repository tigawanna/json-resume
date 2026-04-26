import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeContact } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { ContactListItemDTO } from "./contact.types";

export async function listContactsForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<ContactListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeContact.type, pattern),
        like(resumeContact.value, pattern),
        like(resumeContact.label, pattern),
      )!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeContact.id, opts.cursor)
        : gt(resumeContact.id, opts.cursor),
    );
  }

  const rows = await db
    .select({
      id: resumeContact.id,
      resumeId: resumeContact.resumeId,
      resumeName: resume.name,
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
      sortOrder: resumeContact.sortOrder,
      createdAt: resumeContact.createdAt,
      updatedAt: resumeContact.updatedAt,
    })
    .from(resumeContact)
    .innerJoin(resume, eq(resumeContact.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeContact.id) : asc(resumeContact.id))
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

export async function listContactsForUser(
  userId: string,
  keyword?: string,
): Promise<ContactListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeContact.type, pattern),
        like(resumeContact.value, pattern),
        like(resumeContact.label, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeContact.id,
      resumeId: resumeContact.resumeId,
      resumeName: resume.name,
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
      sortOrder: resumeContact.sortOrder,
      createdAt: resumeContact.createdAt,
      updatedAt: resumeContact.updatedAt,
    })
    .from(resumeContact)
    .innerJoin(resume, eq(resumeContact.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeContact.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function deleteContactForUser(contactId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeContact.id })
    .from(resumeContact)
    .innerJoin(resume, eq(resumeContact.resumeId, resume.id))
    .where(and(eq(resumeContact.id, contactId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Contact not found");
  await db.delete(resumeContact).where(eq(resumeContact.id, contactId));
}
