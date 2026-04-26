import "@tanstack/react-start/server-only";

import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle/client";
import { savedProject } from "@/lib/drizzle/scheam/saved-project-schema";
import { projectItemSchema, type ResumeProjectItem } from "@/features/resume/resume-schema";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, like } from "drizzle-orm";
import type { SavedProjectDTO } from "./saved-project.types";

async function requireUser() {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

export function buildSavedProjectSearchableText(item: {
  name: string;
  description: string;
  tech: string[];
}): string {
  return [item.name, item.description, ...item.tech].join("\n").toLowerCase();
}

function normalizeLikeQuery(q: string): string {
  return q
    .replace(/[%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDTO(row: typeof savedProject.$inferSelect): SavedProjectDTO {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    url: row.url,
    homepageUrl: row.homepageUrl,
    description: row.description,
    tech: JSON.parse(row.tech) as string[],
    embeddingDimensions: row.embeddingDimensions ?? null,
    hasEmbedding: row.embedding !== null && row.embedding !== undefined && row.embedding.length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSavedProjectsForCurrentUser(q?: string): Promise<SavedProjectDTO[]> {
  const user = await requireUser();
  const term = q ? normalizeLikeQuery(q) : "";
  if (term.length > 0) {
    const rows = await db
      .select()
      .from(savedProject)
      .where(and(eq(savedProject.userId, user.id), like(savedProject.searchableText, `%${term}%`)))
      .orderBy(desc(savedProject.updatedAt));
    return rows.map(toDTO);
  }
  const rows = await db
    .select()
    .from(savedProject)
    .where(eq(savedProject.userId, user.id))
    .orderBy(desc(savedProject.updatedAt));
  return rows.map(toDTO);
}

export async function createSavedProjectForCurrentUser(
  input: ResumeProjectItem,
): Promise<SavedProjectDTO> {
  const user = await requireUser();
  const parsed = projectItemSchema.parse(input);
  const id = crypto.randomUUID();
  const techJson = JSON.stringify(parsed.tech);
  const searchableText = buildSavedProjectSearchableText({
    name: parsed.name,
    description: parsed.description,
    tech: parsed.tech,
  });
  await db.insert(savedProject).values({
    id,
    userId: user.id,
    name: parsed.name.trim(),
    url: parsed.url.trim(),
    homepageUrl: (parsed.homepageUrl ?? "").trim(),
    description: parsed.description.trim(),
    tech: techJson,
    searchableText,
  });
  const rows = await db.select().from(savedProject).where(eq(savedProject.id, id)).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Failed to load saved project");
  return toDTO(row);
}

export async function deleteSavedProjectForCurrentUser(id: string): Promise<{ success: true }> {
  const user = await requireUser();
  await db
    .delete(savedProject)
    .where(and(eq(savedProject.id, id), eq(savedProject.userId, user.id)));
  return { success: true };
}
