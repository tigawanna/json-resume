import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeLink, resumeLinkItem } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { LinkListItemDTO } from "./link.types";

type LinkRow = {
  id: string;
  resumeId: string;
  resumeName: string;
  label: string;
  url: string;
  icon: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeLinkIdentity(row: Pick<LinkRow, "label" | "url" | "icon">): string {
  return [
    row.label.trim().toLowerCase(),
    row.url.trim().toLowerCase(),
    row.icon?.trim() ?? "",
  ].join("\u001f");
}

function groupLinkRows(rows: LinkRow[]): LinkListItemDTO[] {
  const grouped = new Map<string, LinkRow & { resumeIds: string[]; resumeNames: string[] }>();

  for (const row of rows) {
    const key = normalizeLinkIdentity(row);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...row, resumeIds: [row.resumeId], resumeNames: [row.resumeName] });
      continue;
    }

    if (!current.resumeIds.includes(row.resumeId)) {
      current.resumeIds.push(row.resumeId);
      current.resumeNames.push(row.resumeName);
    }

    if (row.updatedAt > current.updatedAt) {
      current.id = row.id;
      current.resumeId = row.resumeId;
      current.resumeName = row.resumeName;
      current.sortOrder = row.sortOrder;
      current.createdAt = row.createdAt;
      current.updatedAt = row.updatedAt;
    }
  }

  return Array.from(grouped.values()).map((r) => ({
    id: r.id,
    resumeId: r.resumeId,
    resumeName: r.resumeName,
    resumeIds: r.resumeIds,
    resumeNames: r.resumeNames,
    usageCount: r.resumeIds.length,
    label: r.label,
    url: r.url,
    icon: r.icon,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listLinksForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<LinkListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resumeLink.userId, userId)];

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

  const rows = await db
    .select({
      id: resumeLink.id,
      resumeId: resumeLinkItem.resumeId,
      resumeName: resume.name,
      label: resumeLink.label,
      url: resumeLink.url,
      icon: resumeLink.icon,
      sortOrder: resumeLink.sortOrder,
      createdAt: resumeLink.createdAt,
      updatedAt: resumeLink.updatedAt,
    })
    .from(resumeLink)
    .leftJoin(resumeLinkItem, eq(resumeLinkItem.linkId, resumeLink.id))
    .leftJoin(resume, eq(resumeLinkItem.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeLink.id) : asc(resumeLink.id));

  const groupedRows = groupLinkRows(
    rows.map((r) => ({
      ...r,
      resumeId: r.resumeId ?? "",
      resumeName: r.resumeName ?? "Reusable item",
    })),
  );
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

export async function listLinksForUser(
  userId: string,
  keyword?: string,
): Promise<LinkListItemDTO[]> {
  const conditions = [eq(resumeLink.userId, userId)];
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
      resumeId: resumeLinkItem.resumeId,
      resumeName: resume.name,
      label: resumeLink.label,
      url: resumeLink.url,
      icon: resumeLink.icon,
      sortOrder: resumeLink.sortOrder,
      createdAt: resumeLink.createdAt,
      updatedAt: resumeLink.updatedAt,
    })
    .from(resumeLink)
    .leftJoin(resumeLinkItem, eq(resumeLinkItem.linkId, resumeLink.id))
    .leftJoin(resume, eq(resumeLinkItem.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeLink.updatedAt));

  return groupLinkRows(
    rows.map((r) => ({
      ...r,
      resumeId: r.resumeId ?? "",
      resumeName: r.resumeName ?? "Reusable item",
    })),
  );
}

export async function deleteLinkForUser(linkId: string, userId: string): Promise<void> {
  const row = await db
    .select({ label: resumeLink.label, url: resumeLink.url, icon: resumeLink.icon })
    .from(resumeLink)
    .where(and(eq(resumeLink.id, linkId), eq(resumeLink.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Link not found");

  const target = row[0]!;
  const duplicateRows = await db
    .select({ id: resumeLink.id })
    .from(resumeLink)
    .where(
      and(
        eq(resumeLink.userId, userId),
        eq(resumeLink.label, target.label),
        eq(resumeLink.url, target.url),
        target.icon === null ? isNull(resumeLink.icon) : eq(resumeLink.icon, target.icon),
      ),
    );

  await db.delete(resumeLink).where(
    inArray(
      resumeLink.id,
      duplicateRows.map((duplicate) => duplicate.id),
    ),
  );
}
