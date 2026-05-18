import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resumeCertification } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { CertificationListItemDTO } from "./certification.types";

export async function listCertificationsForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<CertificationListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resumeCertification.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(like(resumeCertification.name, pattern), like(resumeCertification.issuer, pattern))!,
    );
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeCertification.id, opts.cursor)
        : gt(resumeCertification.id, opts.cursor),
    );
  }

  const rows = await db
    .select({
      id: resumeCertification.id,
      name: resumeCertification.name,
      issuer: resumeCertification.issuer,
      date: resumeCertification.date,
      url: resumeCertification.url,
      sortOrder: resumeCertification.sortOrder,
      createdAt: resumeCertification.createdAt,
      updatedAt: resumeCertification.updatedAt,
    })
    .from(resumeCertification)
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeCertification.id) : asc(resumeCertification.id))
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

export async function deleteCertificationForUser(certId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeCertification.id })
    .from(resumeCertification)
    .where(and(eq(resumeCertification.id, certId), eq(resumeCertification.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Certification not found");
  await db.delete(resumeCertification).where(eq(resumeCertification.id, certId));
}
