import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeSummary } from "@/lib/drizzle/scheam";
import { and, desc, eq, like } from "drizzle-orm";
import type { SummaryListItemDTO } from "./summary.types";

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
