import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeLink } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { LinkListItemDTO } from "./link.types";

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
