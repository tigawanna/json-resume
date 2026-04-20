import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeLanguage } from "@/lib/drizzle/scheam";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { LanguageListItemDTO } from "./language.types";

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
