import { publicResume } from "@repo/db/schema/resume/public-resume";
import { db } from "@/lib/drizzle/client";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import type {
  PublicResumeDTO,
  PublicResumeListItemDTO,
  PublicResumeListResult,
} from "./public-resume.types";

export type {
  PublicResumeDTO,
  PublicResumeListItemDTO,
  PublicResumeListResult,
} from "./public-resume.types";

function toDto(row: typeof publicResume.$inferSelect): PublicResumeDTO {
  return {
    id: row.id,
    sourceResumeId: row.sourceResumeId,
    title: row.title,
    document: row.document as ResumeDocumentV1,
    publishedAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getPublicResumeById(id: string): Promise<PublicResumeDTO | null> {
  const rows = await db.select().from(publicResume).where(eq(publicResume.id, id)).limit(1);
  const row = rows[0];
  return row ? toDto(row) : null;
}

export async function getPublicResumeForSource(
  userId: string,
  sourceResumeId: string,
): Promise<PublicResumeDTO | null> {
  const rows = await db
    .select()
    .from(publicResume)
    .where(and(eq(publicResume.userId, userId), eq(publicResume.sourceResumeId, sourceResumeId)))
    .limit(1);
  const row = rows[0];
  return row ? toDto(row) : null;
}

export async function listPublicResumesForUser(input: {
  userId: string;
  keyword?: string;
  limit: number;
  offset: number;
}): Promise<PublicResumeListResult> {
  const conditions = [eq(publicResume.userId, input.userId)];
  const keyword = input.keyword?.trim();
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(publicResume.title, pattern),
        like(publicResume.sourceResumeId, pattern),
        like(publicResume.id, pattern),
        like(sql`json_extract(${publicResume.document}, '$.header.headline')`, pattern),
        like(sql`json_extract(${publicResume.document}, '$.header.fullName')`, pattern),
      )!,
    );
  }

  const where = and(...conditions);

  const [totalRow] = await db.select({ total: count() }).from(publicResume).where(where);
  const rows = await db
    .select({
      id: publicResume.id,
      sourceResumeId: publicResume.sourceResumeId,
      title: publicResume.title,
      headline: sql<string>`coalesce(json_extract(${publicResume.document}, '$.header.headline'), '')`,
      createdAt: publicResume.createdAt,
      updatedAt: publicResume.updatedAt,
    })
    .from(publicResume)
    .where(where)
    .orderBy(desc(publicResume.updatedAt))
    .limit(input.limit)
    .offset(input.offset);

  return {
    total: totalRow?.total ?? 0,
    items: rows.map((row) => ({
      id: row.id,
      sourceResumeId: row.sourceResumeId,
      title: row.title,
      headline: row.headline ?? "",
      publishedAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  };
}

export async function upsertPublicResume(input: {
  userId: string;
  sourceResumeId: string;
  title: string;
  document: ResumeDocumentV1;
}): Promise<PublicResumeDTO> {
  const existing = await getPublicResumeForSource(input.userId, input.sourceResumeId);

  if (existing) {
    const updated = await db
      .update(publicResume)
      .set({
        title: input.title,
        document: input.document,
        updatedAt: new Date(),
      })
      .where(eq(publicResume.id, existing.id))
      .returning();
    const row = updated[0];
    if (!row) throw new Error("Failed to update public résumé");
    return toDto(row);
  }

  const inserted = await db
    .insert(publicResume)
    .values({
      userId: input.userId,
      sourceResumeId: input.sourceResumeId,
      title: input.title,
      document: input.document,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to publish résumé");
  return toDto(row);
}

export async function updatePublicResumeTitle(input: {
  userId: string;
  id: string;
  title: string;
}): Promise<PublicResumeListItemDTO | null> {
  const updated = await db
    .update(publicResume)
    .set({ title: input.title, updatedAt: new Date() })
    .where(and(eq(publicResume.userId, input.userId), eq(publicResume.id, input.id)))
    .returning({
      id: publicResume.id,
      sourceResumeId: publicResume.sourceResumeId,
      title: publicResume.title,
      headline: sql<string>`coalesce(json_extract(${publicResume.document}, '$.header.headline'), '')`,
      createdAt: publicResume.createdAt,
      updatedAt: publicResume.updatedAt,
    });
  const row = updated[0];
  if (!row) return null;
  return {
    id: row.id,
    sourceResumeId: row.sourceResumeId,
    title: row.title,
    headline: row.headline ?? "",
    publishedAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deletePublicResumeForSource(
  userId: string,
  sourceResumeId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(publicResume)
    .where(and(eq(publicResume.userId, userId), eq(publicResume.sourceResumeId, sourceResumeId)))
    .returning({ id: publicResume.id });
  return deleted.length > 0;
}

export async function deletePublicResumeById(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(publicResume)
    .where(and(eq(publicResume.userId, userId), eq(publicResume.id, id)))
    .returning({ id: publicResume.id });
  return deleted.length > 0;
}
