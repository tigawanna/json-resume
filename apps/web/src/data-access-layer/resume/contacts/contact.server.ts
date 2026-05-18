import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resumeContact } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { ContactListItemDTO } from "./contact.types";

type ContactRow = {
  id: string;
  type: string;
  value: string;
  label: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeContactIdentity(row: Pick<ContactRow, "type" | "value" | "label">): string {
  return [row.type.trim().toLowerCase(), row.value.trim().toLowerCase(), row.label.trim()].join(
    "\u001f",
  );
}

function groupContactRows(rows: ContactRow[]): ContactListItemDTO[] {
  const grouped = new Map<string, ContactRow>();

  for (const row of rows) {
    const key = normalizeContactIdentity(row);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, row);
      continue;
    }

    if (row.updatedAt > current.updatedAt) {
      current.id = row.id;
      current.sortOrder = row.sortOrder;
      current.createdAt = row.createdAt;
      current.updatedAt = row.updatedAt;
    }
  }

  return Array.from(grouped.values()).map((r) => ({
    id: r.id,
    type: r.type,
    value: r.value,
    label: r.label,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listContactsForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<ContactListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resumeContact.userId, userId)];

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

  const rows = await db
    .select({
      id: resumeContact.id,
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
      sortOrder: resumeContact.sortOrder,
      createdAt: resumeContact.createdAt,
      updatedAt: resumeContact.updatedAt,
    })
    .from(resumeContact)
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeContact.id) : asc(resumeContact.id));

  const groupedRows = groupContactRows(rows);
  const cursor = opts?.cursor;
  const filteredRows = cursor
    ? groupedRows.filter((item) => (direction === "before" ? item.id < cursor : item.id > cursor))
    : groupedRows;
  const hasMore = filteredRows.length > DEFAULT_PAGE_SIZE;
  const orderedRows =
    direction === "before"
      ? filteredRows.slice(0, DEFAULT_PAGE_SIZE).reverse()
      : filteredRows.slice(0, DEFAULT_PAGE_SIZE);

  const items = orderedRows;

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
  const conditions = [eq(resumeContact.userId, userId)];
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
      type: resumeContact.type,
      value: resumeContact.value,
      label: resumeContact.label,
      sortOrder: resumeContact.sortOrder,
      createdAt: resumeContact.createdAt,
      updatedAt: resumeContact.updatedAt,
    })
    .from(resumeContact)
    .where(and(...conditions))
    .orderBy(desc(resumeContact.updatedAt));

  return groupContactRows(rows);
}

export async function deleteContactForUser(contactId: string, userId: string): Promise<void> {
  const row = await db
    .select({ type: resumeContact.type, value: resumeContact.value, label: resumeContact.label })
    .from(resumeContact)
    .where(and(eq(resumeContact.id, contactId), eq(resumeContact.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Contact not found");

  const target = row[0]!;
  const duplicateRows = await db
    .select({ id: resumeContact.id })
    .from(resumeContact)
    .where(
      and(
        eq(resumeContact.userId, userId),
        eq(resumeContact.type, target.type),
        eq(resumeContact.value, target.value),
        eq(resumeContact.label, target.label),
      ),
    );

  await db.delete(resumeContact).where(
    inArray(
      resumeContact.id,
      duplicateRows.map((duplicate) => duplicate.id),
    ),
  );
}
